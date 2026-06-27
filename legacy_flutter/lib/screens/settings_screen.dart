import 'package:flutter/material.dart';
import '../models/user_profile.dart';
import '../models/companion.dart';
import '../services/storage_service.dart';
import '../utils/theme.dart';
import 'welcome_screen.dart';

/// App settings: voice behavior, sleep controls, trial status, and full reset.
class SettingsScreen extends StatefulWidget {
  final UserProfile profile;
  final List<Companion> companions;
  final bool autoSpeak;
  final bool callByName;
  final DateTime? trialStart;
  final ValueChanged<bool> onAutoSpeakChanged;
  final ValueChanged<bool> onCallByNameChanged;
  final VoidCallback onSleepAll;
  final VoidCallback onWakeAll;

  const SettingsScreen({
    super.key,
    required this.profile,
    required this.companions,
    required this.autoSpeak,
    required this.callByName,
    required this.trialStart,
    required this.onAutoSpeakChanged,
    required this.onCallByNameChanged,
    required this.onSleepAll,
    required this.onWakeAll,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late bool _autoSpeak = widget.autoSpeak;
  late bool _callByName = widget.callByName;

  List<Companion> get _living =>
      widget.companions.where((c) => c.status != CompanionStatus.deleted).toList();

  String _trialLabel() {
    if (widget.trialStart == null) {
      return 'Free plan · one companion is yours forever';
    }
    final left = 14 - DateTime.now().difference(widget.trialStart!).inDays;
    if (left > 0) {
      return 'Trial active · $left ${left == 1 ? 'day' : 'days'} left';
    }
    return 'Trial ended · unpurchased companions have limited memory';
  }

  @override
  Widget build(BuildContext context) {
    final allAwake = _living.every((c) => c.status == CompanionStatus.awake);

    return Scaffold(
      backgroundColor: AppColors.void_,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textSoft),
        title: const Text('Settings', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            _section('YOU'),
            _staticRow('Name', widget.profile.name),
            if (widget.profile.astrology != null)
              _staticRow('Stars',
                  '${widget.profile.astrology!.westernData.symbol} ${widget.profile.astrology!.westernData.displayName}'),
            _staticRow('Mode', widget.profile.ageGroup == 'under18' ? 'Under 18 (friendship only)' : '18+'),

            const SizedBox(height: 18),
            _section('VOICE'),
            _toggleRow(
              'Auto-speak',
              'Companions read their messages aloud',
              _autoSpeak,
              (v) {
                setState(() => _autoSpeak = v);
                widget.onAutoSpeakChanged(v);
              },
            ),
            _toggleRow(
              'Call by name',
              'Saying a companion\'s name opens a private chat',
              _callByName,
              (v) {
                setState(() => _callByName = v);
                widget.onCallByNameChanged(v);
              },
            ),

            const SizedBox(height: 18),
            _section('COMPANIONS'),
            _tapRow(
              allAwake ? 'Put everyone to sleep' : 'Wake everyone',
              allAwake ? 'Quiet the whole room' : 'Bring everyone back',
              () {
                setState(() {
                  if (allAwake) {
                    widget.onSleepAll();
                  } else {
                    widget.onWakeAll();
                  }
                });
              },
            ),

            const SizedBox(height: 18),
            _section('PLAN'),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Text('✦', style: TextStyle(fontSize: 16)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(_trialLabel(),
                        style: const TextStyle(fontSize: 12, color: AppColors.textSoft, height: 1.4)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),
            _section('DATA'),
            _tapRow(
              'Reset everything',
              'Wipe your profile, companions, and all history',
              () => _confirmReset(context),
              danger: true,
            ),
            const SizedBox(height: 16),
            const Text(
              'Everything is stored locally on your device. Other never keeps your personal data on a server.',
              style: TextStyle(fontSize: 11, color: AppColors.textDim, height: 1.5),
            ),
            const SizedBox(height: 12),
            const Text(
              'Other · Extratac LLC',
              style: TextStyle(fontSize: 11, color: AppColors.textDim),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmReset(BuildContext context) {
    showDialog(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Reset everything?',
            style: TextStyle(color: AppColors.text, fontSize: 16)),
        content: const Text(
          'This wipes your profile, every companion, and all conversations. It cannot be undone, and you\'ll start over from zero.',
          style: TextStyle(color: AppColors.textSoft, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textSoft)),
          ),
          TextButton(
            onPressed: () async {
              await StorageService.instance.clear();
              if (!context.mounted) return;
              Navigator.of(dctx).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                (route) => false,
              );
            },
            child: const Text('Reset', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(title,
            style: const TextStyle(fontSize: 10, color: AppColors.textDim, letterSpacing: 2)),
      );

  Widget _staticRow(String label, String value) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSoft)),
            Flexible(
              child: Text(value,
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontSize: 13, color: AppColors.text, fontWeight: FontWeight.w500)),
            ),
          ],
        ),
      );

  Widget _toggleRow(String label, String sub, bool value, ValueChanged<bool> onChanged) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 13, color: AppColors.text)),
                  Text(sub, style: const TextStyle(fontSize: 11, color: AppColors.textDim)),
                ],
              ),
            ),
            Switch(
              value: value,
              onChanged: onChanged,
              activeColor: AppColors.glow1,
            ),
          ],
        ),
      );

  Widget _tapRow(String label, String sub, VoidCallback onTap, {bool danger = false}) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border.all(color: danger ? AppColors.danger.withOpacity(0.4) : AppColors.border),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: TextStyle(
                            fontSize: 13,
                            color: danger ? AppColors.danger : AppColors.text,
                            fontWeight: FontWeight.w500)),
                    Text(sub, style: const TextStyle(fontSize: 11, color: AppColors.textDim)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right,
                  size: 18, color: danger ? AppColors.danger : AppColors.textDim),
            ],
          ),
        ),
      );
}
