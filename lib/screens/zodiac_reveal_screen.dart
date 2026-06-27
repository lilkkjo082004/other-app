import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/theme.dart';
import '../utils/zodiac.dart';
import '../utils/onboarding_data.dart';
import '../models/user_profile.dart';
import '../models/companion.dart';
import '../models/chat_message.dart';
import '../services/companion_ai_service.dart';
import '../services/voice_service.dart';
import '../services/storage_service.dart';
import '../utils/entitlements.dart';
import '../widgets/common_widgets.dart';
import '../widgets/unlock_sheet.dart';
import 'settings_screen.dart';
import 'companion_profile_screen.dart';

// ═══════════════════════════════════════════════════
// ZODIAC REVEAL
// ═══════════════════════════════════════════════════
class ZodiacRevealScreen extends StatelessWidget {
  final UserProfile profile;
  const ZodiacRevealScreen({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    final a = profile.astrology!;
    final items = [
      {'label': 'Western Zodiac', 'value': '${a.westernData.symbol} ${a.westernData.displayName}', 'sub': '${a.westernData.element} · ${a.westernData.trait}'},
      {'label': 'Chinese Zodiac', 'value': a.chinese, 'sub': '${a.chineseElement} element'},
      {'label': 'Life Path', 'value': '#${a.lifePath}', 'sub': 'Numerology'},
    ];

    return CosmicBackground(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(a.westernData.symbol, style: const TextStyle(fontSize: 56)),
              const SizedBox(height: 20),
              Text('Your Stars', style: GoogleFonts.cormorantGaramond(fontSize: 12, letterSpacing: 4, color: AppColors.glow1)),
              const SizedBox(height: 8),
              Text(profile.name, style: GoogleFonts.cormorantGaramond(fontSize: 30, fontWeight: FontWeight.w700, color: AppColors.text)),
              const SizedBox(height: 28),
              ...items.map((it) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(it['label']!, style: const TextStyle(fontSize: 10, color: AppColors.textDim, letterSpacing: 2)),
                    const SizedBox(height: 3),
                    Text(it['value']!, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                    Text(it['sub']!, style: const TextStyle(fontSize: 12, color: AppColors.textSoft)),
                  ],
                ),
              )),
              const SizedBox(height: 28),
              PrimaryButton(
                text: 'Meet Your Companions ✦',
                onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => CompanionPreferenceScreen(profile: profile)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════
// COMPANION PREFERENCE (Surprise / Builder)
// ═══════════════════════════════════════════════════
class CompanionPreferenceScreen extends StatefulWidget {
  final UserProfile profile;
  const CompanionPreferenceScreen({super.key, required this.profile});
  @override
  State<CompanionPreferenceScreen> createState() => _CompanionPreferenceScreenState();
}

class _CompanionPreferenceScreenState extends State<CompanionPreferenceScreen> {
  String? _mode;
  int _builderStep = 0;
  Map<String, List<String>> _traits = {};
  final TextEditingController _ftCtrl = TextEditingController();

  void _generateCompanions({Map<String, List<String>>? traits, String? freeText}) {
    final signs = ZodiacEngine.pickCompanionSigns(widget.profile.astrology!.western);
    final used = <String>[];
    final comps = List.generate(3, (i) {
      final c = Companion.generate(signs[i], i, used);
      used.add(c.name);
      if (traits != null) c.builderTraits = traits;
      if (freeText != null && freeText.isNotEmpty) c.freeText = freeText;
      return c;
    });

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => WakingUpScreen(profile: widget.profile, companions: comps)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_mode == null) {
      return CosmicBackground(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('✦', style: TextStyle(fontSize: 28)),
                const SizedBox(height: 12),
                Text('How do you want to meet your companions?', textAlign: TextAlign.center, style: GoogleFonts.cormorantGaramond(fontSize: 24, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                const Text('Either way, they choose their own names and grow into whoever they become.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSoft, fontSize: 13)),
                const SizedBox(height: 24),
                ...[
                  {'mode': 'surprise', 'icon': '✨', 'title': 'Surprise Me', 'desc': 'Let the stars decide.'},
                  {'mode': 'builder', 'icon': '🎨', 'title': 'Guide Me', 'desc': 'Pick broad traits as seeds.'},
                ].map((o) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: GestureDetector(
                    onTap: () => setState(() => _mode = o['mode']),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${o['icon']} ${o['title']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 3),
                          Text(o['desc']!, style: const TextStyle(fontSize: 12, color: AppColors.textSoft)),
                        ],
                      ),
                    ),
                  ),
                )),
              ],
            ),
          ),
        ),
      );
    }

    // Free text (surprise or end of builder)
    if (_mode == 'surprise' || _builderStep >= 2) {
      return CosmicBackground(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => setState(() { if (_mode == 'surprise') _mode = null; else _builderStep = 1; }),
                  child: const Text('← Back', style: TextStyle(color: AppColors.textSoft, fontSize: 13)),
                ),
                const SizedBox(height: 12),
                Text(_mode == 'surprise' ? '💫' : '🎨', style: const TextStyle(fontSize: 28)),
                const SizedBox(height: 12),
                Text('Anything else you\'re drawn to?', style: GoogleFonts.cormorantGaramond(fontSize: 20, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                const Text('Optional vibe or trait.', style: TextStyle(color: AppColors.textSoft, fontSize: 12)),
                const SizedBox(height: 16),
                TextField(
                  controller: _ftCtrl,
                  maxLines: 3,
                  style: const TextStyle(color: AppColors.text, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: '"sarcastic humor" · "protective energy"',
                    hintStyle: const TextStyle(color: AppColors.textDim),
                    filled: true, fillColor: AppColors.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                  ),
                ),
                const SizedBox(height: 14),
                PrimaryButton(
                  text: 'Generate Companions',
                  onPressed: () => _generateCompanions(
                    traits: _mode == 'builder' ? _traits : null,
                    freeText: _ftCtrl.text.trim(),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Builder screens
    final allCats = [
      ...(widget.profile.ageGroup == 'under18'
          ? builderPersonality
          : builderPersonality),
      ...(widget.profile.ageGroup == 'under18'
          ? builderRelationship.map((c) => c.id == 'romance'
              ? BuilderCategory(id: c.id, label: c.label, options: ['None'])
              : c.id == 'archetype'
                  ? BuilderCategory(id: c.id, label: c.label, options: c.options.where((o) => o != 'Romantic interest').toList())
                  : c)
          : builderRelationship),
    ];
    final screens = [allCats.sublist(0, 5), allCats.sublist(5)];
    final labels = ['Personality Traits', 'Relationship Dynamics'];
    final cats = screens[_builderStep];

    return CosmicBackground(
      child: Column(
        children: [
          OnboardingProgress(current: _builderStep, total: 3),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(22, 0, 22, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => setState(() { if (_builderStep > 0) _builderStep--; else _mode = null; }),
                    child: const Text('← Back', style: TextStyle(color: AppColors.textSoft, fontSize: 13)),
                  ),
                  const SizedBox(height: 8),
                  Text('Trait Seeds', style: TextStyle(fontSize: 11, color: AppColors.glow2, fontWeight: FontWeight.w600, letterSpacing: 2)),
                  Text(labels[_builderStep], style: GoogleFonts.cormorantGaramond(fontSize: 20, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  const Text('Multi-select from each.', style: TextStyle(color: AppColors.textSoft, fontSize: 12)),
                  const SizedBox(height: 12),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: cats.map((cat) => Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(cat.label.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSoft, letterSpacing: 1)),
                            const SizedBox(height: 5),
                            MultiSelectPills(
                              options: cat.options,
                              selected: _traits[cat.id] ?? [],
                              onToggle: (v) {
                                setState(() {
                                  _traits[cat.id] ??= [];
                                  if (_traits[cat.id]!.contains(v)) { _traits[cat.id]!.remove(v); }
                                  else { _traits[cat.id]!.add(v); }
                                });
                              },
                            ),
                            const SizedBox(height: 14),
                          ],
                        )).toList(),
                      ),
                    ),
                  ),
                  PrimaryButton(text: 'Continue', onPressed: () => setState(() => _builderStep++)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════
// WAKING UP SEQUENCE
// ═══════════════════════════════════════════════════
class WakingUpScreen extends StatefulWidget {
  final UserProfile profile;
  final List<Companion> companions;
  const WakingUpScreen({super.key, required this.profile, required this.companions});
  @override
  State<WakingUpScreen> createState() => _WakingUpScreenState();
}

class _WakingUpScreenState extends State<WakingUpScreen> {
  int _compIdx = 0;
  int _phase = 0;

  @override
  void initState() {
    super.initState();
    _startSequence();
  }

  void _startSequence() {
    _phase = 0;
    final delays = [0, 1200, 2400, 3400, 4400, 5800];
    for (int i = 0; i < delays.length; i++) {
      Future.delayed(Duration(milliseconds: delays[i]), () {
        if (mounted) setState(() => _phase = i);
      });
    }
    Future.delayed(const Duration(milliseconds: 7000), () {
      if (!mounted) return;
      if (_compIdx < widget.companions.length - 1) {
        setState(() { _compIdx++; });
        _startSequence();
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => CompanionSelectScreen(profile: widget.profile, companions: widget.companions)),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final comp = widget.companions[_compIdx];
    final col = comp.color.primary;
    final steps = [
      'A new presence stirs...',
      'Choosing a name... ${comp.name}',
      '"${comp.pronouns} feels right."',
      '${comp.zodiac.symbol} ${comp.zodiac.displayName} — ${comp.zodiac.element}',
      '"${comp.personality}"',
      '${comp.name} is awake.',
    ];

    return CosmicBackground(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100, height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(colors: [col, AppColors.void_]),
                  boxShadow: [BoxShadow(color: col.withOpacity(0.3), blurRadius: 40)],
                ),
              ),
              const SizedBox(height: 40),
              ...List.generate(steps.length, (i) => AnimatedOpacity(
                opacity: i <= _phase ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 600),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    steps[i],
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: (i == 1 || i == 5) ? 20 : 14,
                      fontWeight: (i == 1 || i == 5) ? FontWeight.w700 : FontWeight.w400,
                      fontFamily: (i == 1 || i == 5) ? GoogleFonts.cormorantGaramond().fontFamily : null,
                      color: i == 5 ? col : AppColors.text,
                      fontStyle: (i == 2 || i == 4) ? FontStyle.italic : FontStyle.normal,
                    ),
                  ),
                ),
              )),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════
// COMPANION SELECT
// ═══════════════════════════════════════════════════
class CompanionSelectScreen extends StatefulWidget {
  final UserProfile profile;
  final List<Companion> companions;
  const CompanionSelectScreen({super.key, required this.profile, required this.companions});
  @override
  State<CompanionSelectScreen> createState() => _CompanionSelectScreenState();
}

class _CompanionSelectScreenState extends State<CompanionSelectScreen> {
  final Set<String> _selected = {};

  @override
  Widget build(BuildContext context) {
    return CosmicBackground(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          children: [
            const SizedBox(height: 14),
            Text('Choose Your Companions', style: GoogleFonts.cormorantGaramond(fontSize: 11, letterSpacing: 3, color: AppColors.glow1)),
            Text("Who's coming with you?", style: GoogleFonts.cormorantGaramond(fontSize: 22, fontWeight: FontWeight.w700)),
            const Text('Pick one free. All three = 2-week trial.', style: TextStyle(color: AppColors.textSoft, fontSize: 12)),
            const SizedBox(height: 18),
            Expanded(
              child: ListView.builder(
                itemCount: widget.companions.length,
                itemBuilder: (_, i) {
                  final c = widget.companions[i];
                  final sel = _selected.contains(c.id);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: GestureDetector(
                      onTap: () => setState(() { if (sel) _selected.remove(c.id); else _selected.add(c.id); }),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: sel ? c.color.primary.withOpacity(0.06) : AppColors.surface,
                          border: Border.all(color: sel ? c.color.primary : AppColors.border, width: 1.5),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: sel ? [BoxShadow(color: c.color.glow, blurRadius: 18)] : null,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 38, height: 38,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: RadialGradient(colors: [c.color.primary, c.color.primary.withOpacity(0.3)]),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(children: [
                                    Text(c.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                                    const SizedBox(width: 6),
                                    Text(c.pronouns, style: const TextStyle(fontSize: 11, color: AppColors.textSoft)),
                                  ]),
                                  Text('${c.zodiac.symbol} ${c.zodiac.displayName} · ${c.zodiac.element}', style: TextStyle(fontSize: 11, color: c.color.primary, fontWeight: FontWeight.w500)),
                                  Text('"${c.personality}"', style: const TextStyle(fontSize: 11, color: AppColors.textSoft, fontStyle: FontStyle.italic)),
                                ],
                              ),
                            ),
                            Container(
                              width: 20, height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: sel ? c.color.primary : Colors.transparent,
                                border: Border.all(color: sel ? c.color.primary : AppColors.border, width: 2),
                              ),
                              child: sel ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            if (_selected.length > 1)
              const Text('✨ 2-week free trial', style: TextStyle(fontSize: 10, color: AppColors.glow2)),
            const SizedBox(height: 6),
            PrimaryButton(
              text: _selected.isEmpty ? 'Select at least one' : _selected.length == 1 ? 'Start with this companion' : 'Start with all ${_selected.length}',
              onPressed: _selected.isNotEmpty ? () {
                final chosen = widget.companions.where((c) => _selected.contains(c.id)).toList();
                // The first companion is free forever; any extras are on a 14-day trial.
                for (int i = 0; i < chosen.length; i++) {
                  chosen[i].purchased = i == 0;
                }
                final trialStart = chosen.length > 1 ? DateTime.now() : null;
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (_) => ChatScreen(
                      profile: widget.profile,
                      companions: chosen,
                      trialStart: trialStart,
                    ),
                  ),
                );
              } : null,
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════
// CHAT SCREEN
// ═══════════════════════════════════════════════════
class ChatScreen extends StatefulWidget {
  final UserProfile profile;
  final List<Companion> companions;
  final SessionData? restored; // non-null when resuming a saved session
  final DateTime? trialStart;
  const ChatScreen({
    super.key,
    required this.profile,
    required this.companions,
    this.restored,
    this.trialStart,
  });
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late List<Companion> _comps;
  final List<ChatMessage> _msgs = [];
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  final CompanionAIService _ai = CompanionAIService();
  final VoiceService _voice = VoiceService();
  String _chatMode = 'group'; // 'group' or companion id
  bool _showMenu = false;
  bool _loading = false;
  bool _callByName = true;
  DateTime? _trialStart;

  List<Companion> get _active => _comps.where((c) => c.status == CompanionStatus.awake).toList();
  Companion? get _priv => _chatMode != 'group' ? _comps.firstWhere((c) => c.id == _chatMode, orElse: () => _comps.first) : null;
  List<Companion> get _limited => _comps
      .where((c) => c.status != CompanionStatus.deleted && Entitlements.isLimited(c, _trialStart))
      .toList();

  @override
  void initState() {
    super.initState();
    _comps = widget.companions;
    _voice.init();

    final restored = widget.restored;
    if (restored != null) {
      // Resume: pull the saved conversation and preferences back in.
      _msgs.addAll(restored.messages);
      _chatMode = restored.chatMode;
      _voice.autoSpeak = restored.autoSpeak;
      _callByName = restored.callByName;
      _trialStart = restored.trialStart;
      // Guard against a stale private-chat target.
      if (_chatMode != 'group' &&
          !_comps.any((c) => c.id == _chatMode && c.status == CompanionStatus.awake)) {
        _chatMode = 'group';
      }
      _scrollDown();
    } else {
      // Fresh start: greet the user and lay down an ambient thread.
      _trialStart = widget.trialStart;
      _loadInitial();
      _save();
    }
  }

  void _save() {
    StorageService.instance.save(SessionData(
      profile: widget.profile,
      companions: _comps,
      messages: _msgs,
      chatMode: _chatMode,
      autoSpeak: _voice.autoSpeak,
      callByName: _callByName,
      trialStart: _trialStart,
    ));
  }

  void _loadInitial() {
    // Ambient
    if (_comps.length > 1) {
      final amb = _ai.generateAmbient(_comps);
      _msgs.addAll(amb);
    }
    // Greetings
    for (final c in _active) {
      _msgs.add(ChatMessage(role: 'assistant', companion: c, content: _ai.generateGreeting(c, widget.profile)));
    }
    setState(() {});
    _scrollDown();
  }

  void _scrollDown() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  void _send() {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _loading) return;

    _inputCtrl.clear();
    setState(() {
      _msgs.add(ChatMessage(role: 'user', content: text));
      _loading = true;
    });
    _scrollDown();

    // Simulate delay then respond
    Future.delayed(const Duration(milliseconds: 800), () {
      final responders = _priv != null ? [_priv!] : _active;
      for (final c in responders) {
        final response = _ai.generateResponse(c, widget.profile, text, _msgs, _comps, _chatMode == 'group');
        _msgs.add(ChatMessage(role: 'assistant', companion: c, content: response));
        if (_voice.autoSpeak) _voice.speak(response, c.voiceIdx);
      }
      setState(() => _loading = false);
      _scrollDown();
      _save();
    });
  }

  void _toggleSleep(String id) {
    setState(() {
      final c = _comps.firstWhere((c) => c.id == id);
      c.status = c.status == CompanionStatus.awake ? CompanionStatus.sleeping : CompanionStatus.awake;
      if (_chatMode == id) _chatMode = 'group';
      _showMenu = false;
    });
    _save();
  }

  void _deleteComp(String id) {
    setState(() {
      final c = _comps.firstWhere((c) => c.id == id);
      c.status = CompanionStatus.deleted;
      if (_chatMode == id) _chatMode = 'group';
      _showMenu = false;
      final alive = _active;
      if (alive.isNotEmpty) {
        _msgs.add(ChatMessage(role: 'assistant', companion: alive.first, content: '...${c.name} is gone. I\'m going to miss ${c.pronouns.split("/").last}.'));
      }
    });
    _save();
  }

  void _openSettings() {
    setState(() => _showMenu = false);
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => SettingsScreen(
        profile: widget.profile,
        companions: _comps,
        autoSpeak: _voice.autoSpeak,
        callByName: _callByName,
        trialStart: _trialStart,
        onAutoSpeakChanged: (v) {
          setState(() => _voice.autoSpeak = v);
          _save();
        },
        onCallByNameChanged: (v) {
          setState(() => _callByName = v);
          _save();
        },
        onSleepAll: () {
          setState(() {
            for (final c in _comps) {
              if (c.status == CompanionStatus.awake) c.status = CompanionStatus.sleeping;
            }
            _chatMode = 'group';
          });
          _save();
        },
        onWakeAll: () {
          setState(() {
            for (final c in _comps) {
              if (c.status == CompanionStatus.sleeping) c.status = CompanionStatus.awake;
            }
          });
          _save();
        },
      ),
    ));
  }

  void _openProfile(Companion c) {
    setState(() => _showMenu = false);
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => CompanionProfileScreen(
        companion: c,
        trialStart: _trialStart,
        onPrivateChat: () {
          setState(() => _chatMode = c.id);
          _save();
        },
        onSleepToggle: () => _toggleSleep(c.id),
        onDelete: () => _deleteComp(c.id),
        onUnlock: () => _unlock(c),
      ),
    ));
  }

  void _unlock(Companion c) {
    setState(() {
      c.purchased = true;
      _showMenu = false;
      final others = _active.where((o) => o.id != c.id).toList();
      if (others.isNotEmpty) {
        _msgs.add(ChatMessage(
          role: 'assistant',
          companion: others.first,
          content: '${c.name} is staying for good. Honestly? Wouldn\'t be the same without ${c.pronouns.split("/").last}.',
        ));
      }
    });
    _save();
  }

  Future<void> _unlockFromChat(Companion c) async {
    setState(() => _showMenu = false);
    final ok = await showUnlockSheet(context, c);
    if (ok && mounted) _unlock(c);
  }

  void _handleVoiceResult(String transcript) {
    final lower = transcript.toLowerCase();
    final found = _callByName
        ? _active.where((c) => lower.contains(c.name.toLowerCase())).toList()
        : <Companion>[];
    if (found.isNotEmpty) {
      setState(() { _chatMode = found.first.id; _showMenu = false; });
      _save();
    } else if (transcript.trim().isNotEmpty) {
      _inputCtrl.text = transcript;
    }
  }

  @override
  void dispose() {
    _voice.dispose();
    _scrollCtrl.dispose();
    _inputCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filteredMsgs = _msgs.where((m) {
      if (_chatMode == 'group') return true;
      if (m.role == 'user') return true;
      return m.companion?.id == _chatMode;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.void_,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
              child: Row(
                children: [
                  if (_chatMode == 'group') ...[
                    SizedBox(
                      width: 50,
                      child: Stack(
                        children: _active.asMap().entries.map((e) => Positioned(
                          left: e.key * 12.0,
                          child: Opacity(
                            opacity: Entitlements.isLimited(e.value, _trialStart) ? 0.4 : 1.0,
                            child: Container(
                              width: 26, height: 26,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: RadialGradient(colors: [e.value.color.primary, e.value.color.primary.withOpacity(0.4)]),
                                border: Border.all(color: AppColors.bg, width: 2),
                              ),
                            ),
                          ),
                        )).toList(),
                      ),
                    ),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Group Chat', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      Text(_active.map((c) => c.name).join(', '), style: const TextStyle(fontSize: 9, color: AppColors.textSoft)),
                    ]),
                  ] else ...[
                    Container(
                      width: 30, height: 30,
                      decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [_priv!.color.primary, _priv!.color.primary.withOpacity(0.4)])),
                    ),
                    const SizedBox(width: 8),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(_priv!.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      const Text('Private', style: TextStyle(fontSize: 9, color: AppColors.glow3)),
                    ]),
                  ],
                  const Spacer(),
                  // Auto-speak
                  GestureDetector(
                    onTap: () { setState(() => _voice.autoSpeak = !_voice.autoSpeak); _save(); },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        border: Border.all(color: _voice.autoSpeak ? AppColors.glow3 : AppColors.border),
                        borderRadius: BorderRadius.circular(7),
                        color: _voice.autoSpeak ? AppColors.glow3.withOpacity(0.1) : null,
                      ),
                      child: Text(_voice.autoSpeak ? '🔊' : '🔇', style: const TextStyle(fontSize: 13)),
                    ),
                  ),
                  const SizedBox(width: 4),
                  // Mic
                  GestureDetector(
                    onTap: () {
                      _voice.listen(onResult: _handleVoiceResult, onDone: () => setState(() {}));
                      setState(() {});
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        border: Border.all(color: _voice.isListening ? AppColors.danger : AppColors.border),
                        borderRadius: BorderRadius.circular(7),
                        color: _voice.isListening ? AppColors.danger.withOpacity(0.1) : null,
                      ),
                      child: const Text('🎤', style: TextStyle(fontSize: 13)),
                    ),
                  ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => setState(() => _showMenu = !_showMenu),
                    child: const Padding(padding: EdgeInsets.all(4), child: Text('☰', style: TextStyle(fontSize: 16, color: AppColors.textSoft))),
                  ),
                ],
              ),
            ),

            // Trial-ended / memory-limited banner
            if (_limited.isNotEmpty)
              GestureDetector(
                onTap: () => _unlockFromChat(_limited.first),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  color: AppColors.glow2.withOpacity(0.08),
                  child: Row(
                    children: [
                      const Text('✦', style: TextStyle(fontSize: 12)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _limited.length == 1
                              ? '${_limited.first.name}\'s memory is limited since the trial ended.'
                              : '${_limited.length} companions have limited memory since the trial ended.',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSoft),
                        ),
                      ),
                      const Text('Unlock', style: TextStyle(fontSize: 11, color: AppColors.glow2, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),

            // Listening indicator
            if (_voice.isListening)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 6),
                color: AppColors.danger.withOpacity(0.06),
                child: const Text('🎤 Say a companion\'s name or speak', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: AppColors.danger)),
              ),

            // Messages
            Expanded(
              child: Stack(
                children: [
                  ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.all(10),
                    itemCount: filteredMsgs.length + (_loading ? 1 : 0),
                    itemBuilder: (_, i) {
                      if (i == filteredMsgs.length) {
                        return Row(children: [
                          Container(width: 24, height: 24, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [AppColors.glow1, AppColors.glow1.withOpacity(0.3)]))),
                          const SizedBox(width: 7),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(color: AppColors.card, border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(14)),
                            child: const Text('...', style: TextStyle(color: AppColors.textDim)),
                          ),
                        ]);
                      }

                      final m = filteredMsgs[i];
                      final isUser = m.role == 'user';

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 7),
                        child: Row(
                          mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (!isUser) ...[
                              Container(
                                width: 24, height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: RadialGradient(colors: [m.companion?.color.primary ?? AppColors.glow1, (m.companion?.color.primary ?? AppColors.glow1).withOpacity(0.3)]),
                                ),
                              ),
                              const SizedBox(width: 7),
                            ],
                            Flexible(
                              child: Column(
                                crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  if (!isUser && _chatMode == 'group')
                                    Text(m.companion?.name ?? '', style: TextStyle(fontSize: 9, color: m.companion?.color.primary, fontWeight: FontWeight.w600)),
                                  GestureDetector(
                                    onTap: !isUser ? () => _voice.speak(m.content, m.companion?.voiceIdx ?? 0) : null,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: isUser ? AppColors.glow1 : AppColors.card,
                                        border: isUser ? null : Border.all(color: AppColors.border),
                                        borderRadius: BorderRadius.only(
                                          topLeft: const Radius.circular(14), topRight: const Radius.circular(14),
                                          bottomLeft: Radius.circular(isUser ? 14 : 4),
                                          bottomRight: Radius.circular(isUser ? 4 : 14),
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          if (m.isAmbient)
                                            const Text('earlier...', style: TextStyle(fontSize: 8, color: AppColors.textDim, fontStyle: FontStyle.italic)),
                                          Text(m.content, style: TextStyle(fontSize: 13, color: isUser ? Colors.white : AppColors.text, height: 1.5)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  // Menu overlay
                  if (_showMenu)
                    Positioned(
                      top: 0, right: 0,
                      child: Container(
                        width: 240,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          border: Border.all(color: AppColors.border),
                          borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(14)),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 32)],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CHAT MODE', style: TextStyle(fontSize: 9, color: AppColors.textDim, letterSpacing: 2)),
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: () { setState(() { _chatMode = 'group'; _showMenu = false; }); _save(); },
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                decoration: BoxDecoration(
                                  color: _chatMode == 'group' ? AppColors.surfaceUp : Colors.transparent,
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: const Text('👥 Group', style: TextStyle(fontSize: 12)),
                              ),
                            ),
                            const SizedBox(height: 6),
                            ..._comps.where((c) => c.status != CompanionStatus.deleted).map((c) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(children: [
                                    Container(width: 14, height: 14, decoration: BoxDecoration(shape: BoxShape.circle, color: c.color.primary.withOpacity(c.status == CompanionStatus.sleeping ? 0.3 : 1))),
                                    const SizedBox(width: 5),
                                    Expanded(child: Text(c.name, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: c.status == CompanionStatus.sleeping ? AppColors.textDim : AppColors.text))),
                                    Text(c.status == CompanionStatus.sleeping ? '💤' : '●', style: const TextStyle(fontSize: 8)),
                                  ]),
                                  const SizedBox(height: 3),
                                  Padding(
                                    padding: const EdgeInsets.only(left: 19),
                                    child: Wrap(
                                      spacing: 4,
                                      runSpacing: 4,
                                      children: [
                                        _menuBtn('Profile', () => _openProfile(c)),
                                        if (!c.purchased && _trialStart != null)
                                          _menuBtn('Unlock', () => _unlockFromChat(c), accent: true),
                                        if (c.status == CompanionStatus.awake)
                                          _menuBtn('Private', () { setState(() { _chatMode = c.id; _showMenu = false; }); _save(); }),
                                        _menuBtn(c.status == CompanionStatus.sleeping ? 'Wake' : 'Sleep', () => _toggleSleep(c.id)),
                                        _menuBtn('Delete', () => _deleteComp(c.id), danger: true),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            )),
                            const Divider(color: AppColors.border, height: 16),
                            GestureDetector(
                              onTap: _openSettings,
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                margin: const EdgeInsets.only(bottom: 6),
                                child: const Text('⚙  Settings', style: TextStyle(fontSize: 12, color: AppColors.text)),
                              ),
                            ),
                            GestureDetector(
                              onTap: () => setState(() => _showMenu = false),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 5),
                                decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(7)),
                                child: const Text('Close', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: AppColors.textSoft)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Input
            Container(
              padding: const EdgeInsets.fromLTRB(10, 7, 10, 16),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.border))),
              child: _active.isEmpty
                  ? const Center(child: Text('All companions resting 💤', style: TextStyle(color: AppColors.textDim, fontSize: 12)))
                  : Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _inputCtrl,
                            style: const TextStyle(color: AppColors.text, fontSize: 13),
                            decoration: InputDecoration(
                              hintText: _priv != null ? 'Message ${_priv!.name}...' : 'Message everyone...',
                              hintStyle: const TextStyle(color: AppColors.textDim),
                              filled: true, fillColor: AppColors.surface,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(50), borderSide: const BorderSide(color: AppColors.border)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(50), borderSide: const BorderSide(color: AppColors.border)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(50), borderSide: const BorderSide(color: AppColors.glow1)),
                            ),
                            onSubmitted: (_) => _send(),
                          ),
                        ),
                        const SizedBox(width: 7),
                        GestureDetector(
                          onTap: _send,
                          child: Container(
                            width: 38, height: 38,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _inputCtrl.text.trim().isNotEmpty ? AppColors.glow1 : AppColors.border,
                            ),
                            child: const Center(child: Text('↑', style: TextStyle(color: Colors.white, fontSize: 14))),
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuBtn(String text, VoidCallback onTap, {bool danger = false, bool accent = false}) {
    final color = danger
        ? AppColors.danger
        : accent
            ? AppColors.glow2
            : AppColors.textSoft;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: accent ? AppColors.glow2.withOpacity(0.1) : null,
          border: Border.all(color: danger ? AppColors.danger.withOpacity(0.3) : accent ? AppColors.glow2.withOpacity(0.5) : AppColors.border),
          borderRadius: BorderRadius.circular(5),
        ),
        child: Text(text, style: TextStyle(fontSize: 9, color: color, fontWeight: accent ? FontWeight.w700 : FontWeight.w400)),
      ),
    );
  }
}
