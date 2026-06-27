import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/companion.dart';
import '../utils/entitlements.dart';
import '../utils/theme.dart';
import '../widgets/unlock_sheet.dart';

/// Full profile for a single companion — identity, zodiac, trait seeds, status,
/// and management actions (private chat, sleep/wake, delete).
class CompanionProfileScreen extends StatelessWidget {
  final Companion companion;
  final DateTime? trialStart;
  final VoidCallback onPrivateChat;
  final VoidCallback onSleepToggle;
  final VoidCallback onDelete;
  final VoidCallback onUnlock;

  const CompanionProfileScreen({
    super.key,
    required this.companion,
    required this.trialStart,
    required this.onPrivateChat,
    required this.onSleepToggle,
    required this.onDelete,
    required this.onUnlock,
  });

  String _ownershipLabel() {
    if (companion.purchased) return 'Yours · free companion';
    if (trialStart == null) return 'Trial companion';
    final left = Entitlements.trialDaysLeft(trialStart) ?? 0;
    if (left > 0) return 'Trial · $left ${left == 1 ? 'day' : 'days'} left';
    return 'Trial ended · memory limited';
  }

  Future<void> _unlock(BuildContext context) async {
    final ok = await showUnlockSheet(context, companion);
    if (ok && context.mounted) {
      onUnlock();
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = companion;
    final col = c.color.primary;
    final z = c.zodiac;
    final sleeping = c.status == CompanionStatus.sleeping;

    return Scaffold(
      backgroundColor: AppColors.void_,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textSoft),
        title: Text(c.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 8, 22, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Orb
              Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(colors: [col, col.withOpacity(0.25)]),
                  boxShadow: [BoxShadow(color: col.withOpacity(0.4), blurRadius: 50)],
                ),
              ),
              const SizedBox(height: 18),
              Text(c.name,
                  style: GoogleFonts.cormorantGaramond(
                      fontSize: 30, fontWeight: FontWeight.w700, color: AppColors.text)),
              Text(c.pronouns, style: const TextStyle(fontSize: 13, color: AppColors.textSoft)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: col.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: col.withOpacity(0.4)),
                ),
                child: Text(
                  sleeping ? '💤 Sleeping' : (c.status == CompanionStatus.deleted ? 'Gone' : '● Awake'),
                  style: TextStyle(fontSize: 11, color: col, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(height: 24),

              _infoCard('Astrology', [
                _infoRow('${z.symbol}  ${z.displayName}', '${z.element} · ${z.trait}'),
                _infoRow('Color', c.color.name),
              ]),
              const SizedBox(height: 10),
              _infoCard('Personality', [
                _infoRow('Essence', c.personality),
                _infoRow('Quirk', c.quirk),
              ]),
              if (c.builderTraits != null && c.builderTraits!.values.any((v) => v.isNotEmpty)) ...[
                const SizedBox(height: 10),
                _traitCard(c.builderTraits!),
              ],
              if (c.freeText != null && c.freeText!.trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                _infoCard('Drawn toward', [_infoRow('', c.freeText!.trim())]),
              ],
              const SizedBox(height: 10),
              _infoCard('Access', [_infoRow('', _ownershipLabel())]),
              const SizedBox(height: 24),

              if (c.status != CompanionStatus.deleted) ...[
                if (!c.purchased && trialStart != null) ...[
                  _actionButton(
                    'Unlock ${c.name} · ${Entitlements.companionPrice}',
                    AppColors.glow1,
                    () => _unlock(context),
                  ),
                  const SizedBox(height: 8),
                ],
                if (c.status == CompanionStatus.awake)
                  _actionButton(
                    'Open private chat',
                    col,
                    () {
                      onPrivateChat();
                      Navigator.of(context).pop();
                    },
                    outlined: !c.purchased && trialStart != null,
                  ),
                const SizedBox(height: 8),
                _actionButton(
                  sleeping ? 'Wake ${c.name}' : 'Put ${c.name} to sleep',
                  AppColors.surfaceUp,
                  () {
                    onSleepToggle();
                    Navigator.of(context).pop();
                  },
                  outlined: true,
                ),
                const SizedBox(height: 8),
                _actionButton(
                  'Delete ${c.name}',
                  AppColors.danger,
                  () => _confirmDelete(context),
                  danger: true,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text('Delete ${companion.name}?',
            style: const TextStyle(color: AppColors.text, fontSize: 16)),
        content: const Text(
          'This is permanent. Their memories and everything they\'ve become will be gone, and the others will feel the absence.',
          style: TextStyle(color: AppColors.textSoft, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dctx).pop(),
            child: const Text('Keep', style: TextStyle(color: AppColors.textSoft)),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(dctx).pop();
              onDelete();
              Navigator.of(context).pop();
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }

  Widget _infoCard(String title, List<Widget> rows) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(),
              style: const TextStyle(fontSize: 10, color: AppColors.textDim, letterSpacing: 2)),
          const SizedBox(height: 8),
          ...rows,
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label.isNotEmpty)
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSoft)),
          Text(value, style: const TextStyle(fontSize: 14, color: AppColors.text, height: 1.4)),
        ],
      ),
    );
  }

  Widget _traitCard(Map<String, List<String>> traits) {
    final entries = traits.entries.where((e) => e.value.isNotEmpty).toList();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('TRAIT SEEDS',
              style: TextStyle(fontSize: 10, color: AppColors.textDim, letterSpacing: 2)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: entries
                .expand((e) => e.value)
                .map((t) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceUp,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(t, style: const TextStyle(fontSize: 11, color: AppColors.text)),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _actionButton(String text, Color color, VoidCallback onTap,
      {bool danger = false, bool outlined = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          color: outlined ? Colors.transparent : (danger ? color.withOpacity(0.12) : color),
          border: Border.all(color: danger ? color.withOpacity(0.5) : (outlined ? AppColors.border : color)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: danger ? color : (outlined ? AppColors.text : Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}
