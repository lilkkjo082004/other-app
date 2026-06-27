import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/theme.dart';
import '../utils/onboarding_data.dart';
import '../models/user_profile.dart';
import '../utils/zodiac.dart';
import '../widgets/common_widgets.dart';
import 'zodiac_reveal_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 0;
  final UserProfile _profile = UserProfile();
  final TextEditingController _textCtrl = TextEditingController();
  List<String> _multiSel = [];
  Map<String, List<String>> _subs = {};
  bool? _fillSubs;

  static const _stepIds = [
    'name','dob','ageGroup','vibe','communication','occupation',
    'relationship','loveLang','needs','socialId','activities',
    'activitySubs','cuisineLove','cuisineDislike','dietary','favMovies','favMusic',
  ];

  String get _sid => _stepIds[_step];
  int get _total => _stepIds.length;

  void _goNext(dynamic value) {
    _saveValue(value);
    if (_step < _total - 1) {
      setState(() { _step++; _prepareStep(); });
    } else {
      _profile.astrology = ZodiacEngine.calculate(_profile.dob!);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => ZodiacRevealScreen(profile: _profile)),
      );
    }
  }

  void _goBack() {
    if (_step > 0) setState(() { _step--; _prepareStep(); });
  }

  void _prepareStep() {
    _textCtrl.clear();
    _multiSel = [];
    _fillSubs = null;
    // Pre-populate if going back
    switch (_sid) {
      case 'name': _textCtrl.text = _profile.name; break;
      case 'occupation': _textCtrl.text = _profile.occupation; break;
      case 'favMovies': _textCtrl.text = _profile.favMovies; break;
      case 'favMusic': _textCtrl.text = _profile.favMusic; break;
      case 'vibe': _multiSel = List.from(_profile.vibe); break;
      case 'communication': _multiSel = List.from(_profile.communication); break;
      case 'relationship': _multiSel = List.from(_profile.relationship); break;
      case 'loveLang': _multiSel = List.from(_profile.loveLang); break;
      case 'needs': _multiSel = List.from(_profile.needs); break;
      case 'socialId': _multiSel = List.from(_profile.socialId); break;
      case 'activities': _multiSel = List.from(_profile.activities); break;
      case 'cuisineLove': _multiSel = List.from(_profile.cuisineLove); break;
      case 'cuisineDislike': _multiSel = List.from(_profile.cuisineDislike); break;
      case 'dietary': _multiSel = List.from(_profile.dietary); break;
      case 'activitySubs': _subs = Map.from(_profile.activitySubs); break;
    }
  }

  void _saveValue(dynamic value) {
    switch (_sid) {
      case 'name': _profile.name = value as String; break;
      case 'dob': _profile.dob = value as DateTime; break;
      case 'ageGroup': _profile.ageGroup = value as String; break;
      case 'vibe': _profile.vibe = List<String>.from(value); break;
      case 'communication': _profile.communication = List<String>.from(value); break;
      case 'occupation': _profile.occupation = value as String; break;
      case 'relationship': _profile.relationship = List<String>.from(value); break;
      case 'loveLang': _profile.loveLang = List<String>.from(value); break;
      case 'needs': _profile.needs = List<String>.from(value); break;
      case 'socialId': _profile.socialId = List<String>.from(value); break;
      case 'activities': _profile.activities = List<String>.from(value); break;
      case 'activitySubs': _profile.activitySubs = Map<String, List<String>>.from(value); break;
      case 'cuisineLove': _profile.cuisineLove = List<String>.from(value); break;
      case 'cuisineDislike': _profile.cuisineDislike = List<String>.from(value); break;
      case 'dietary': _profile.dietary = List<String>.from(value); break;
      case 'favMovies': _profile.favMovies = value as String; break;
      case 'favMusic': _profile.favMusic = value as String; break;
    }
  }

  void _toggleMulti(String val) {
    setState(() {
      if (_multiSel.contains(val)) { _multiSel.remove(val); } 
      else { _multiSel.add(val); }
    });
  }

  void _toggleSub(String actId, String sub) {
    setState(() {
      _subs[actId] ??= [];
      if (_subs[actId]!.contains(sub)) { _subs[actId]!.remove(sub); }
      else { _subs[actId]!.add(sub); }
    });
  }

  Widget _buildHeader(String icon, String question, [String? subtitle]) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_step > 0)
          GestureDetector(
            onTap: _goBack,
            child: const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text('← Back', style: TextStyle(color: AppColors.textSoft, fontSize: 13)),
            ),
          ),
        Text(icon, style: const TextStyle(fontSize: 24)),
        const SizedBox(height: 8),
        Text(question, style: GoogleFonts.cormorantGaramond(fontSize: 22, fontWeight: FontWeight.w600, color: AppColors.text)),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: AppColors.textSoft, fontSize: 12, height: 1.5)),
        ],
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildTextStep(String icon, String q, String hint, {String? sub, String btnText = 'Continue'}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(icon, q, sub),
        TextField(
          controller: _textCtrl,
          autofocus: true,
          style: const TextStyle(color: AppColors.text, fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textDim),
            filled: true, fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.glow1)),
          ),
          onSubmitted: (v) { if (v.trim().isNotEmpty) _goNext(v.trim()); },
        ),
        const SizedBox(height: 10),
        PrimaryButton(text: btnText, onPressed: _textCtrl.text.trim().isNotEmpty ? () => _goNext(_textCtrl.text.trim()) : null),
      ],
    );
  }

  Widget _buildMultiStep(String icon, String q, List<Map<String, String>> opts, {String? sub}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(icon, q, sub),
        Expanded(
          child: SingleChildScrollView(
            child: MultiSelectChecklist(options: opts, selected: _multiSel, onToggle: _toggleMulti),
          ),
        ),
        const SizedBox(height: 10),
        PrimaryButton(
          text: 'Continue${_multiSel.isNotEmpty ? ' (${_multiSel.length})' : ''}',
          onPressed: _multiSel.isNotEmpty ? () => _goNext(_multiSel) : null,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return CosmicBackground(
      child: Column(
        children: [
          OnboardingProgress(current: _step, total: _total),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Padding(
                key: ValueKey(_step),
                padding: const EdgeInsets.fromLTRB(22, 0, 22, 22),
                child: _buildCurrentStep(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_sid) {
      case 'name':
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('✦', 'What should we call you?'),
            TextField(
              controller: _textCtrl,
              autofocus: true,
              style: const TextStyle(color: AppColors.text, fontSize: 15),
              decoration: InputDecoration(
                hintText: 'Your name...',
                hintStyle: const TextStyle(color: AppColors.textDim),
                filled: true, fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.glow1)),
              ),
              onSubmitted: (v) { if (v.trim().isNotEmpty) _goNext(v.trim()); },
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            PrimaryButton(text: 'Continue', onPressed: _textCtrl.text.trim().isNotEmpty ? () => _goNext(_textCtrl.text.trim()) : null),
          ],
        );

      case 'dob':
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('☽', 'When were you born?', 'We use this to match you with compatible companions.'),
            GestureDetector(
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime(2000, 1, 1),
                  firstDate: DateTime(1940),
                  lastDate: DateTime.now(),
                  builder: (context, child) {
                    return Theme(
                      data: ThemeData.dark().copyWith(
                        colorScheme: const ColorScheme.dark(primary: AppColors.glow1, surface: AppColors.surface),
                      ),
                      child: child!,
                    );
                  },
                );
                if (date != null) setState(() => _profile.dob = date);
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _profile.dob != null
                      ? '${_profile.dob!.month}/${_profile.dob!.day}/${_profile.dob!.year}'
                      : 'Tap to select date...',
                  style: TextStyle(color: _profile.dob != null ? AppColors.text : AppColors.textDim, fontSize: 15),
                ),
              ),
            ),
            const SizedBox(height: 10),
            PrimaryButton(text: 'Reveal My Stars', onPressed: _profile.dob != null ? () => _goNext(_profile.dob!) : null),
          ],
        );

      case 'ageGroup':
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('🔒', 'One quick check —'),
            MultiSelectChecklist(
              options: const [
                {'value': '18+', 'label': "I'm 18 or older", 'emoji': '✓'},
                {'value': 'under18', 'label': "I'm under 18", 'emoji': '✓'},
              ],
              selected: const [],
              onToggle: (v) => _goNext(v),
            ),
          ],
        );

      case 'vibe':
        return _buildMultiStep('◈', 'What energy do you gravitate toward?', [
          {'value': 'calm', 'label': 'Calm & grounded', 'emoji': '🌿'},
          {'value': 'playful', 'label': 'Playful & witty', 'emoji': '⚡'},
          {'value': 'deep', 'label': 'Deep & introspective', 'emoji': '🌙'},
          {'value': 'warm', 'label': 'Warm & nurturing', 'emoji': '☀️'},
          {'value': 'chaotic', 'label': 'Chaotic & spontaneous', 'emoji': '🔥'},
        ], sub: 'Pick all that resonate.');

      case 'communication':
        return _buildMultiStep('◆', 'How do you like to communicate?', [
          {'value': 'direct', 'label': 'Direct & honest', 'emoji': '🎯'},
          {'value': 'expressive', 'label': 'Expressive & emotional', 'emoji': '💕'},
          {'value': 'chill', 'label': 'Chill & easygoing', 'emoji': '😎'},
          {'value': 'thoughtful', 'label': 'Thoughtful & considered', 'emoji': '📝'},
        ], sub: 'Select all that fit.');

      case 'occupation':
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('💼', 'What do you do?', 'Helps your companions understand your world.'),
            TextField(
              controller: _textCtrl,
              autofocus: true,
              style: const TextStyle(color: AppColors.text, fontSize: 15),
              decoration: InputDecoration(
                hintText: 'Designer, student, nurse...', hintStyle: const TextStyle(color: AppColors.textDim),
                filled: true, fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.glow1)),
              ),
              onSubmitted: (v) { if (v.trim().isNotEmpty) _goNext(v.trim()); },
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            PrimaryButton(text: 'Continue', onPressed: _textCtrl.text.trim().isNotEmpty ? () => _goNext(_textCtrl.text.trim()) : null),
          ],
        );

      case 'relationship':
        return _buildMultiStep('♡', 'Relationship situation?', [
          {'value': 'single', 'label': 'Single', 'emoji': '🦋'},
          {'value': 'dating', 'label': 'Dating', 'emoji': '💫'},
          {'value': 'partnered', 'label': 'In a relationship', 'emoji': '💕'},
          {'value': 'married', 'label': 'Married', 'emoji': '💍'},
          {'value': 'complicated', 'label': "It's complicated", 'emoji': '🌀'},
          {'value': 'rather_not', 'label': 'Rather not say', 'emoji': '🤐'},
        ], sub: 'Pick all that apply.');

      case 'loveLang':
        return _buildMultiStep('❤️', "What's your love language?", [
          {'value': 'words', 'label': 'Words of affirmation', 'emoji': '💬'},
          {'value': 'quality', 'label': 'Quality time', 'emoji': '⏰'},
          {'value': 'acts', 'label': 'Acts of service', 'emoji': '🤝'},
          {'value': 'touch', 'label': 'Physical touch', 'emoji': '🤗'},
          {'value': 'gifts', 'label': 'Receiving gifts', 'emoji': '🎁'},
        ], sub: 'Pick all that speak to you.');

      case 'needs':
        return _buildMultiStep('✧', 'What do you wish you had more of?', [
          {'value': 'encouragement', 'label': 'Someone who cheers me on', 'emoji': '🙌'},
          {'value': 'honesty', 'label': 'Honest, real talk', 'emoji': '💎'},
          {'value': 'fun', 'label': 'More laughter & fun', 'emoji': '😂'},
          {'value': 'perspective', 'label': 'Fresh perspectives', 'emoji': '🔮'},
        ], sub: 'Select all that resonate.');

      case 'socialId':
        return _buildMultiStep('❖', 'How would your closest friend describe you?', [
          {'value': 'listener', 'label': 'The thoughtful listener', 'emoji': '👂'},
          {'value': 'entertainer', 'label': 'Life of the party', 'emoji': '🎭'},
          {'value': 'advisor', 'label': 'Go-to for advice', 'emoji': '🧭'},
          {'value': 'dreamer', 'label': 'Creative dreamer', 'emoji': '💭'},
        ], sub: 'Pick all that fit.');

      case 'activities':
        return _buildMultiStep(
          '🎯', 'What do you like to do?',
          activities.map((a) => {'value': a.id, 'label': a.label, 'emoji': a.emoji}).toList(),
          sub: 'Pick all your activities and hobbies.',
        );

      case 'activitySubs':
        final picked = _profile.activities.map((id) => activities.firstWhere((a) => a.id == id)).toList();
        if (_fillSubs == null) {
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader('🎯', 'Want to get specific?', 'Drill down into your interests, or let companions learn later.'),
              PrimaryButton(text: 'Fill out now', onPressed: () => setState(() => _fillSubs = true)),
              const SizedBox(height: 8),
              GhostButton(text: "I'll tell my companions later", onPressed: () => _goNext(<String, List<String>>{})),
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('🎯', 'Drill down into your interests', 'Check off what you\'re into.'),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: picked.map((act) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('${act.emoji} ${act.label}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.glow1)),
                      ),
                      MultiSelectPills(options: act.subs, selected: _subs[act.id] ?? [], onToggle: (v) => _toggleSub(act.id, v)),
                      const SizedBox(height: 14),
                    ],
                  )).toList(),
                ),
              ),
            ),
            const SizedBox(height: 10),
            PrimaryButton(text: 'Continue', onPressed: () => _goNext(_subs)),
          ],
        );

      case 'cuisineLove':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('🍽️', 'Cuisines you love?', 'Pick all your favorites.'),
            Expanded(child: SingleChildScrollView(child: MultiSelectPills(options: cuisines, selected: _multiSel, onToggle: _toggleMulti))),
            const SizedBox(height: 10),
            PrimaryButton(text: 'Continue${_multiSel.isNotEmpty ? ' (${_multiSel.length})' : ''}', onPressed: _multiSel.isNotEmpty ? () => _goNext(_multiSel) : null),
          ],
        );

      case 'cuisineDislike':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('🚫', "Cuisines you don't like?", 'So companions know what NOT to suggest.'),
            Expanded(child: SingleChildScrollView(child: MultiSelectPills(options: cuisines, selected: _multiSel, onToggle: _toggleMulti))),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: GhostButton(text: 'None', onPressed: () => _goNext(<String>[]))),
              const SizedBox(width: 8),
              Expanded(child: PrimaryButton(text: 'Continue', onPressed: () => _goNext(_multiSel))),
            ]),
          ],
        );

      case 'dietary':
        return _buildMultiStep('🥗', 'Dietary preferences?',
          dietaryOptions.map((d) => {'value': d, 'label': d}).toList(),
          sub: 'Select all that apply.',
        );

      case 'favMovies':
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('🎬', 'Favorite movies or shows?', 'Name a few.'),
            TextField(
              controller: _textCtrl,
              maxLines: 3,
              style: const TextStyle(color: AppColors.text, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'The Office, Spirited Away, Breaking Bad...', hintStyle: const TextStyle(color: AppColors.textDim),
                filled: true, fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.glow1)),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            PrimaryButton(
              text: _textCtrl.text.trim().isNotEmpty ? 'Continue' : 'Skip',
              onPressed: () => _goNext(_textCtrl.text.trim().isEmpty ? 'not specified' : _textCtrl.text.trim()),
            ),
          ],
        );

      case 'favMusic':
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader('🎵', 'Favorite music artists?', "Who's on repeat?"),
            TextField(
              controller: _textCtrl,
              maxLines: 3,
              style: const TextStyle(color: AppColors.text, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'SZA, Tyler the Creator, BTS...', hintStyle: const TextStyle(color: AppColors.textDim),
                filled: true, fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.glow1)),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            PrimaryButton(
              text: _textCtrl.text.trim().isNotEmpty ? 'Continue' : 'Skip',
              onPressed: () => _goNext(_textCtrl.text.trim().isEmpty ? 'not specified' : _textCtrl.text.trim()),
            ),
          ],
        );

      default:
        return const Center(child: Text('Unknown step'));
    }
  }
}
