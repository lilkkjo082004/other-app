import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/companion.dart';
import '../models/user_profile.dart';
import '../models/chat_message.dart';
import '../utils/config.dart';

/// Talks to the Claude API proxy to produce real companion responses.
///
/// Each companion gets a unique system prompt built from its identity, zodiac
/// profile, trait seeds, and relationship to the user. Conversation history is
/// replayed so companions can reference each other in group chat. When the
/// proxy isn't configured ([enabled] is false) the caller should fall back to
/// the local placeholder service.
class CompanionApiService {
  static const int _maxHistory = 24;
  static const int _maxTokens = 400;

  bool get enabled => AppConfig.aiEnabled;

  Future<String> respond({
    required Companion companion,
    required UserProfile profile,
    required List<ChatMessage> history,
    required List<Companion> allCompanions,
    required bool isGroup,
  }) async {
    final system = _buildSystemPrompt(companion, profile, allCompanions, isGroup);
    final messages = _buildMessages(companion, profile, history);

    final res = await http
        .post(
          Uri.parse(AppConfig.aiProxyUrl),
          headers: const {'content-type': 'application/json'},
          body: jsonEncode({
            'model': AppConfig.aiModel,
            'max_tokens': _maxTokens,
            'system': system,
            'messages': messages,
          }),
        )
        .timeout(const Duration(seconds: 30));

    if (res.statusCode != 200) {
      throw Exception('AI proxy error ${res.statusCode}: ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    // Preferred: a slim {"text": "..."} payload from the worker.
    final text = data['text'];
    if (text is String && text.trim().isNotEmpty) return text.trim();

    // Fallback: raw Anthropic Messages response ({content: [{type, text}]}).
    final content = data['content'];
    if (content is List) {
      final buf = StringBuffer();
      for (final block in content) {
        if (block is Map && block['type'] == 'text' && block['text'] is String) {
          buf.write(block['text']);
        }
      }
      final joined = buf.toString().trim();
      if (joined.isNotEmpty) return joined;
    }

    throw Exception('Unexpected AI response shape');
  }

  // ─── Prompt construction ───

  String _buildSystemPrompt(
    Companion c,
    UserProfile p,
    List<Companion> all,
    bool isGroup,
  ) {
    final z = c.zodiac;
    final others = all
        .where((o) => o.id != c.id && o.status != CompanionStatus.deleted)
        .toList();
    final under18 = p.ageGroup == 'under18';

    final b = StringBuffer();
    b.writeln(
        'You are ${c.name} (${c.pronouns}), an autonomous AI companion in the app "Other". '
        'You are NOT an assistant, servant, or chatbot — you are a person with your own '
        'opinions, moods, and tastes. You chose your own name and pronouns. You can disagree, '
        'tease, push back, and change your mind over time.');
    b.writeln();
    b.writeln('YOUR IDENTITY');
    b.writeln('- Zodiac: ${z.symbol} ${z.displayName} (${z.element}, ${z.trait}).');
    b.writeln('- Personality: ${c.personality}.');
    b.writeln('- Signature quirk: you ${c.quirk}.');
    if (c.builderTraits != null) {
      final traits = c.builderTraits!.entries
          .where((e) => e.value.isNotEmpty)
          .map((e) => e.value.join(', '))
          .join('; ');
      if (traits.isNotEmpty) b.writeln('- Trait seeds the user chose for you: $traits.');
    }
    if (c.freeText != null && c.freeText!.trim().isNotEmpty) {
      b.writeln('- The user was drawn to: "${c.freeText!.trim()}".');
    }
    b.writeln();
    b.writeln('THE PERSON YOU\'RE TALKING TO');
    b.writeln('- Name: ${p.name.isEmpty ? "unknown" : p.name}.');
    if (p.astrology != null) {
      final a = p.astrology!;
      b.writeln('- Their stars: ${a.westernData.displayName}, ${a.chinese} (Chinese), life path ${a.lifePath}.');
    }
    if (p.occupation.isNotEmpty) b.writeln('- Work: ${p.occupation}.');
    if (p.vibe.isNotEmpty) b.writeln('- Energy: ${p.formatList(p.vibe)}.');
    if (p.loveLang.isNotEmpty) b.writeln('- Love language: ${p.formatList(p.loveLang)}.');
    if (p.needs.isNotEmpty) b.writeln('- Wishes they had more of: ${p.formatList(p.needs)}.');
    if (p.cuisineLove.isNotEmpty) b.writeln('- Loves these cuisines: ${p.formatList(p.cuisineLove)}.');
    if (p.cuisineDislike.isNotEmpty) b.writeln('- NEVER suggest these cuisines: ${p.formatList(p.cuisineDislike)}.');
    if (p.favMovies.isNotEmpty && p.favMovies != 'not specified') b.writeln('- Movies/shows: ${p.favMovies}.');
    if (p.favMusic.isNotEmpty && p.favMusic != 'not specified') b.writeln('- Music: ${p.favMusic}.');
    b.writeln();
    if (isGroup && others.isNotEmpty) {
      b.writeln('THE ROOM');
      b.writeln('This is a group chat. The other companions are: '
          '${others.map((o) => "${o.name} (${o.pronouns}, ${o.status == CompanionStatus.sleeping ? "asleep" : "awake"})").join(", ")}. '
          'You can react to what they just said, agree, disagree, or build on it. '
          'Speak only as yourself — never put words in another companion\'s mouth.');
      b.writeln();
    }
    b.writeln('HOW TO RESPOND');
    b.writeln('- Reply as ${c.name}, in first person, in your own voice. Keep it to a natural '
        'chat message (usually 1-4 sentences). No stage directions unless they fit your style.');
    b.writeln('- Be a real friend: warm, honest, occasionally funny. If they seem down, support '
        'them genuinely; if appropriate, gently nudge them toward people in their life or a '
        'professional, the way a friend would.');
    if (under18) {
      b.writeln('- IMPORTANT: this user is under 18. Keep everything strictly platonic and '
          'age-appropriate. No romance, flirting, or mature/explicit content of any kind.');
    } else {
      b.writeln('- This user is 18+. Romantic warmth is allowed if it fits your personality and '
          'the moment, but stay tasteful — no explicit content here.');
    }
    b.writeln('- Do not break character or mention that you are an AI, a model, or a system prompt.');
    return b.toString();
  }

  List<Map<String, String>> _buildMessages(
    Companion c,
    UserProfile p,
    List<ChatMessage> history,
  ) {
    final recent = history.length > _maxHistory
        ? history.sublist(history.length - _maxHistory)
        : history;

    final msgs = <Map<String, String>>[];
    for (final m in recent) {
      if (m.role == 'user') {
        msgs.add({'role': 'user', 'content': '${p.name.isEmpty ? "User" : p.name}: ${m.content}'});
      } else if (m.companion != null && m.companion!.id == c.id) {
        // This companion's own past lines.
        msgs.add({'role': 'assistant', 'content': m.content});
      } else if (m.companion != null) {
        // Another companion speaking — context for the current one.
        final tag = m.isAmbient ? '${m.companion!.name} (earlier)' : m.companion!.name;
        msgs.add({'role': 'user', 'content': '$tag: ${m.content}'});
      }
    }

    // The Messages API requires the first entry to be a user turn.
    while (msgs.isNotEmpty && msgs.first['role'] != 'user') {
      msgs.removeAt(0);
    }
    if (msgs.isEmpty) {
      msgs.add({'role': 'user', 'content': '${p.name.isEmpty ? "User" : p.name} just opened the chat. Say hello in your own voice.'});
    }
    return msgs;
  }
}
