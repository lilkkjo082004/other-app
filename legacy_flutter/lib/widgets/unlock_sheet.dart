import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/companion.dart';
import '../services/purchase_service.dart';
import '../utils/entitlements.dart';
import '../utils/theme.dart';

/// Presents the one-time unlock flow for [companion]. Returns true if the
/// companion was successfully unlocked (purchased), false otherwise.
Future<bool> showUnlockSheet(BuildContext context, Companion companion) async {
  final result = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _UnlockSheet(companion: companion),
  );
  return result ?? false;
}

class _UnlockSheet extends StatefulWidget {
  final Companion companion;
  const _UnlockSheet({required this.companion});

  @override
  State<_UnlockSheet> createState() => _UnlockSheetState();
}

class _UnlockSheetState extends State<_UnlockSheet> {
  bool _processing = false;
  String? _error;

  Future<void> _buy() async {
    setState(() {
      _processing = true;
      _error = null;
    });
    final result = await PurchaseService.instance.unlockCompanion(widget.companion);
    if (!mounted) return;
    if (result == PurchaseResult.success) {
      Navigator.of(context).pop(true);
    } else {
      setState(() {
        _processing = false;
        _error = result == PurchaseResult.cancelled
            ? 'Purchase cancelled.'
            : 'Something went wrong. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.companion;
    final col = c.color.primary;

    return Container(
      padding: EdgeInsets.fromLTRB(24, 20, 24, 24 + MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(top: BorderSide(color: AppColors.border)),
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [col, col.withOpacity(0.25)]),
              boxShadow: [BoxShadow(color: col.withOpacity(0.4), blurRadius: 40)],
            ),
          ),
          const SizedBox(height: 16),
          Text('Keep ${c.name} for good',
              style: GoogleFonts.cormorantGaramond(
                  fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.text)),
          const SizedBox(height: 8),
          Text(
            'Unlock ${c.name} with a one-time purchase. Their memory, growth, and '
            'everything they\'ve become with you come back — for good, no subscription.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppColors.textSoft, height: 1.5),
          ),
          const SizedBox(height: 20),
          if (_error != null) ...[
            Text(_error!, style: const TextStyle(fontSize: 12, color: AppColors.danger)),
            const SizedBox(height: 10),
          ],
          GestureDetector(
            onTap: _processing ? null : _buy,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 15),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.glow1, AppColors.glow2]),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [BoxShadow(color: AppColors.glow1.withOpacity(0.35), blurRadius: 24)],
              ),
              child: Center(
                child: _processing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text('Unlock · ${Entitlements.companionPrice}',
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _processing ? null : () => Navigator.of(context).pop(false),
            child: const Text('Maybe later', style: TextStyle(color: AppColors.textSoft, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
