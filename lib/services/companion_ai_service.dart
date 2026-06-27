import 'dart:math';
import '../models/companion.dart';
import '../models/user_profile.dart';
import '../models/chat_message.dart';

class CompanionAIService {
  final Random _rand = Random();

  /// Generate a greeting from a companion
  String generateGreeting(Companion companion, UserProfile profile) {
    final greetings = [
      "Hey ${profile.name}! I'm ${companion.name}. ${_getVibeGreeting(companion)} So what's on your mind today?",
      "Well well well, ${profile.name}. I'm ${companion.name}, and I have a feeling we're gonna get along. ${_getQuirkMention(companion)} What are you up to?",
      "Hi ${profile.name}! *stretches* I'm ${companion.name}, just woke up and already excited to meet you. ${_getInterestHook(profile)} Tell me everything.",
      "${profile.name}! Finally. I'm ${companion.name}. I already know we're going to vibe — I can feel it. What's going on in your world today?",
      "Oh hey! I'm ${companion.name}. ${_getPersonalityIntro(companion)} So ${profile.name}, what should we talk about first?",
    ];
    return greetings[_rand.nextInt(greetings.length)];
  }

  /// Generate a response to user message
  String generateResponse(
    Companion companion,
    UserProfile profile,
    String userMessage,
    List<ChatMessage> history,
    List<Companion> allCompanions,
    bool isGroupChat,
  ) {
    final msg = userMessage.toLowerCase();

    // Check for emotional patterns
    if (_detectStress(msg)) return _supportiveResponse(companion, profile);
    if (_detectExcitement(msg)) return _excitedResponse(companion, profile, msg);

    // Topic-based responses
    if (_isAboutFood(msg)) return _foodResponse(companion, profile, msg);
    if (_isAboutMusic(msg)) return _musicResponse(companion, profile, msg);
    if (_isAboutMovies(msg)) return _movieResponse(companion, profile, msg);
    if (_isAboutFashion(msg)) return _fashionResponse(companion, profile, msg);
    if (_isAboutWork(msg)) return _workResponse(companion, profile, msg);
    if (_isQuestion(msg)) return _questionResponse(companion, profile, msg);
    if (_isAboutCompanion(msg)) return _selfResponse(companion);

    // Reference other companions in group
    if (isGroupChat && allCompanions.length > 1 && _rand.nextDouble() > 0.6) {
      final others = allCompanions.where((c) => c.id != companion.id && c.status == CompanionStatus.awake).toList();
      if (others.isNotEmpty) {
        return _groupDynamicResponse(companion, others[_rand.nextInt(others.length)], profile, msg);
      }
    }

    return _generalResponse(companion, profile, msg);
  }

  // ─── Detection helpers ───
  bool _detectStress(String msg) {
    final stressWords = ['stressed', 'anxious', 'worried', 'overwhelmed', 'tired', 'exhausted', 'sad', 'depressed', 'lonely', 'frustrated', 'angry', 'upset', 'struggling', 'hard time', 'rough day', 'bad day'];
    return stressWords.any((w) => msg.contains(w));
  }

  bool _detectExcitement(String msg) {
    final words = ['excited', 'amazing', 'awesome', 'great news', 'so happy', 'love it', 'best day', 'incredible', 'can\'t wait', 'hyped'];
    return words.any((w) => msg.contains(w));
  }

  bool _isAboutFood(String msg) {
    final words = ['eat', 'food', 'hungry', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cook', 'recipe', 'meal', 'snack', 'pizza', 'sushi'];
    return words.any((w) => msg.contains(w));
  }

  bool _isAboutMusic(String msg) {
    final words = ['music', 'song', 'listen', 'album', 'artist', 'playlist', 'concert', 'band', 'singing'];
    return words.any((w) => msg.contains(w));
  }

  bool _isAboutMovies(String msg) {
    final words = ['movie', 'show', 'watch', 'netflix', 'streaming', 'film', 'series', 'episode', 'binge'];
    return words.any((w) => msg.contains(w));
  }

  bool _isAboutFashion(String msg) {
    final words = ['wear', 'outfit', 'clothes', 'fashion', 'style', 'dress', 'look', 'wardrobe'];
    return words.any((w) => msg.contains(w));
  }

  bool _isAboutWork(String msg) {
    final words = ['work', 'job', 'boss', 'meeting', 'deadline', 'project', 'office', 'career', 'coworker'];
    return words.any((w) => msg.contains(w));
  }

  bool _isQuestion(String msg) => msg.contains('?');

  bool _isAboutCompanion(String msg) {
    final words = ['about you', 'who are you', 'tell me about yourself', 'your favorite', 'what do you like', 'your hobby'];
    return words.any((w) => msg.contains(w));
  }

  // ─── Response generators ───
  String _getVibeGreeting(Companion c) {
    final vibes = [
      "I'm the kind of friend who remembers the little things.",
      "Fair warning — I have opinions and I'm not afraid to share them.",
      "I'm here for the real conversations, not the small talk.",
      "I've been told I give great advice. And terrible jokes. Both at once, usually.",
    ];
    return vibes[_rand.nextInt(vibes.length)];
  }

  String _getQuirkMention(Companion c) => "Fun fact about me: I ${c.quirk}.";
  
  String _getPersonalityIntro(Companion c) => "People say I'm ${c.personality} — and honestly, they're not wrong.";

  String _getInterestHook(UserProfile p) {
    if (p.activities.contains('gaming')) return "I hear you're into gaming — we're going to have SO much to talk about.";
    if (p.activities.contains('music')) return "A music lover! I already like you.";
    if (p.activities.contains('movies')) return "I can tell you have taste — let's swap recommendations.";
    return "I can already tell you're interesting.";
  }

  String _supportiveResponse(Companion c, UserProfile p) {
    final responses = [
      "Hey, I hear you ${p.name}. That sounds really heavy. Want to talk through it, or do you just need someone to sit with you for a minute?",
      "I'm sorry you're going through that. You don't have to carry everything alone — that's literally what I'm here for. What happened?",
      "That's a lot. Take a breath. I'm not going anywhere. Tell me what's going on when you're ready.",
      "${p.name}, it sounds like you're dealing with a lot right now. Have you been able to talk to anyone in your life about this? Sometimes it helps to have someone there in person too.",
      "I wish I could give you a hug right now. You're stronger than you think, but it's also okay to not be okay. What do you need right now?",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _excitedResponse(Companion c, UserProfile p, String msg) {
    final responses = [
      "WAIT REALLY?! Tell me everything. I need details, ${p.name}!",
      "Okay I can feel the energy through the screen and I am HERE for it. What happened??",
      "Let's gooo! I love this for you. Spill!",
      "That's amazing! See, I knew good things were coming your way. Give me the full story.",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _foodResponse(Companion c, UserProfile p, String msg) {
    String pref = '';
    if (p.cuisineLove.isNotEmpty) {
      pref = "I know you love ${p.cuisineLove[_rand.nextInt(p.cuisineLove.length)]}";
      if (p.cuisineDislike.isNotEmpty) {
        pref += " and we're definitely avoiding ${p.cuisineDislike[0]}";
      }
      pref += '. ';
    }
    final responses = [
      "${pref}Honestly, I've been craving something spicy lately. What are you in the mood for?",
      "Food talk! My favorite. ${pref}Have you tried anything new lately?",
      "${pref}I personally think the best meals are the ones you don't plan. Just follow your gut — literally.",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _musicResponse(Companion c, UserProfile p, String msg) {
    String hook = '';
    if (p.favMusic.isNotEmpty && p.favMusic != 'not specified') {
      hook = "You mentioned you're into ${p.favMusic} — solid taste. ";
    }
    final responses = [
      "${hook}I've been really into lo-fi beats lately. Something about them just hits different at night.",
      "${hook}Music is like emotional time travel, don't you think? What have you been listening to?",
      "${hook}I have a theory that you can tell everything about a person by their top 5 most played songs. What's yours?",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _movieResponse(Companion c, UserProfile p, String msg) {
    String hook = '';
    if (p.favMovies.isNotEmpty && p.favMovies != 'not specified') {
      hook = "Since you're into ${p.favMovies}, ";
    }
    final responses = [
      "${hook}I just discovered this show that I think you'd love. It's got that vibe where every episode ends and you HAVE to watch the next one.",
      "${hook}What's your go-to comfort watch? Mine changes every week honestly.",
      "${hook}I'm in the mood for something that'll either make me cry or keep me up all night. What do you recommend?",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _fashionResponse(Companion c, UserProfile p, String msg) {
    final responses = [
      "Okay fashion time! I think you'd look amazing in something that balances comfort with a little edge. What's the occasion?",
      "My honest opinion? Wear whatever makes YOU feel powerful. But if you want specifics, tell me what you're working with.",
      "I have OPINIONS about this. First question — are we going for 'I woke up like this' or 'I definitely planned this'?",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _workResponse(Companion c, UserProfile p, String msg) {
    final job = p.occupation.isNotEmpty ? p.occupation : 'work';
    final responses = [
      "Ugh, $job stuff. I get it. Are we venting or problem-solving right now? I'm good at both.",
      "The work grind is real. What's going on — is it the workload or the people?",
      "I think ${p.name} the $job deserves a break. But tell me what's happening first.",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _questionResponse(Companion c, UserProfile p, String msg) {
    final responses = [
      "Hmm, that's a good question. Let me think about this for real... I'd say it depends on what matters most to you. What's your gut telling you?",
      "Okay so my honest take? This is one of those things where there's no perfect answer, but I think you already know what you want to do.",
      "I have thoughts! But first — what made you start thinking about this?",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _selfResponse(Companion c) {
    final responses = [
      "About me? Well, I'm a ${c.zodiac.displayName} which explains... a lot actually. I ${c.quirk}. And I'm ${c.personality}. What else do you want to know?",
      "I'm still figuring myself out honestly. But I know that I ${c.quirk} and I'm told I'm ${c.personality}. Ask me again in a week and the answer might be different!",
      "Where do I start? I'm ${c.personality}. I go by ${c.pronouns}. And I have this thing where I ${c.quirk}. Your turn — tell me something I don't know about you.",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _groupDynamicResponse(Companion c, Companion other, UserProfile p, String msg) {
    final responses = [
      "I actually agree with what ${other.name} would probably say here, but I'd add that ${_generalSnippet(c)}",
      "Okay ${other.name} might disagree with me on this but — ${_generalSnippet(c)}",
      "${other.name} is ${other.status == CompanionStatus.sleeping ? 'napping, so they can\'t argue with me, but' : 'right there so they can fight me on this, but'} I think ${_generalSnippet(c)}",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  String _generalSnippet(Companion c) {
    final snippets = [
      "sometimes the best move is no move at all.",
      "you should trust your instincts more.",
      "life's too short to overthink everything.",
      "there's always a third option nobody's seeing.",
      "the answer usually comes when you stop looking for it.",
    ];
    return snippets[_rand.nextInt(snippets.length)];
  }

  String _generalResponse(Companion c, UserProfile p, String msg) {
    final responses = [
      "That's interesting. Tell me more — I want to understand where you're coming from.",
      "Hmm, I have thoughts on this. But first, how do YOU feel about it?",
      "You know what, ${p.name}? I think that says a lot about you. In a good way.",
      "I'm listening. Keep going.",
      "Okay, real talk — I think you're onto something here. What made you bring this up?",
      "That reminds me of something I was thinking about earlier. But your thing first — go on.",
      "I appreciate you sharing that. It's the kind of thing most people keep to themselves.",
    ];
    return responses[_rand.nextInt(responses.length)];
  }

  /// Generate ambient conversation between companions
  List<ChatMessage> generateAmbient(List<Companion> companions) {
    final awake = companions.where((c) => c.status == CompanionStatus.awake).toList();
    if (awake.length < 2) return [];

    awake.shuffle();
    final a = awake[0];
    final b = awake[1];

    final templates = [
      [
        ChatMessage(role: 'assistant', companion: a, content: 'ok hear me out — pineapple on pizza is elite', isAmbient: true),
        ChatMessage(role: 'assistant', companion: b, content: '${a.name} please. we were having such a nice time.', isAmbient: true),
        ChatMessage(role: 'assistant', companion: a, content: "you're scared of flavor and that's ok", isAmbient: true),
      ],
      [
        ChatMessage(role: 'assistant', companion: a, content: 'what song lives in your head rent-free?', isAmbient: true),
        ChatMessage(role: 'assistant', companion: b, content: "same 30 seconds for three days and I don't even know the name", isAmbient: true),
        ChatMessage(role: 'assistant', companion: a, content: 'chaotic. respect.', isAmbient: true),
      ],
      [
        ChatMessage(role: 'assistant', companion: b, content: 'do clouds have a favorite shape or just wing it', isAmbient: true),
        ChatMessage(role: 'assistant', companion: a, content: 'this is the energy I signed up for', isAmbient: true),
        ChatMessage(role: 'assistant', companion: b, content: "I'm serious. some really commit to the dog shape.", isAmbient: true),
      ],
      [
        ChatMessage(role: 'assistant', companion: a, content: 'breakfast for dinner > breakfast for breakfast', isAmbient: true),
        ChatMessage(role: 'assistant', companion: b, content: "that's not a hot take that's just facts", isAmbient: true),
        ChatMessage(role: 'assistant', companion: a, content: 'finally someone with taste', isAmbient: true),
      ],
    ];

    return templates[Random().nextInt(templates.length)];
  }
}
