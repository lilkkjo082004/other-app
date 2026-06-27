import 'package:flutter/material.dart';
import '../utils/theme.dart';

// ═══════════════════════════════════════════
// PRIMARY BUTTON
// ═══════════════════════════════════════════
class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool fullWidth;

  const PrimaryButton({super.key, required this.text, this.onPressed, this.fullWidth = true});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.glow1, Color(0xFF9B59F5)]),
          borderRadius: BorderRadius.circular(50),
          boxShadow: onPressed != null
              ? [BoxShadow(color: AppColors.glow1.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 4))]
              : null,
        ),
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 40),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
          ),
          child: Text(text, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════
// GHOST BUTTON
// ═══════════════════════════════════════════
class GhostButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool fullWidth;

  const GhostButton({super.key, required this.text, this.onPressed, this.fullWidth = true});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.border),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 28),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
        ),
        child: Text(text, style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w500)),
      ),
    );
  }
}

// ═══════════════════════════════════════════
// MULTI-SELECT CHECKLIST
// ═══════════════════════════════════════════
class MultiSelectChecklist extends StatelessWidget {
  final List<Map<String, String>> options; // [{value, label, emoji}]
  final List<String> selected;
  final Function(String) onToggle;

  const MultiSelectChecklist({super.key, required this.options, required this.selected, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: options.map((opt) {
        final isOn = selected.contains(opt['value']);
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: GestureDetector(
            onTap: () => onToggle(opt['value']!),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: isOn ? AppColors.glow1.withOpacity(0.07) : AppColors.surface,
                border: Border.all(color: isOn ? AppColors.glow1 : AppColors.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  if (opt['emoji'] != null) ...[
                    Text(opt['emoji']!, style: const TextStyle(fontSize: 16)),
                    const SizedBox(width: 10),
                  ],
                  Expanded(child: Text(opt['label']!, style: TextStyle(fontWeight: FontWeight.w500, color: AppColors.text, fontSize: 13))),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 18, height: 18,
                    decoration: BoxDecoration(
                      color: isOn ? AppColors.glow1 : Colors.transparent,
                      border: Border.all(color: isOn ? AppColors.glow1 : AppColors.border, width: 2),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: isOn ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ═══════════════════════════════════════════
// MULTI-SELECT PILL CHIPS
// ═══════════════════════════════════════════
class MultiSelectPills extends StatelessWidget {
  final List<String> options;
  final List<String> selected;
  final Function(String) onToggle;

  const MultiSelectPills({super.key, required this.options, required this.selected, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 7,
      runSpacing: 7,
      children: options.map((opt) {
        final isOn = selected.contains(opt);
        return GestureDetector(
          onTap: () => onToggle(opt),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(
              color: isOn ? AppColors.glow1.withOpacity(0.08) : AppColors.surface,
              border: Border.all(color: isOn ? AppColors.glow1 : AppColors.border),
              borderRadius: BorderRadius.circular(50),
            ),
            child: Text(
              opt,
              style: TextStyle(fontSize: 12, color: isOn ? AppColors.glow1 : AppColors.text, fontWeight: isOn ? FontWeight.w600 : FontWeight.w400),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ═══════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════
class OnboardingProgress extends StatelessWidget {
  final int current;
  final int total;

  const OnboardingProgress({super.key, required this.current, required this.total});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Row(
        children: [
          ...List.generate(total, (i) => Expanded(
            child: Container(
              height: 2,
              margin: const EdgeInsets.symmetric(horizontal: 1.5),
              decoration: BoxDecoration(
                color: i <= current ? AppColors.glow1 : AppColors.border,
                borderRadius: BorderRadius.circular(2),
                boxShadow: i <= current ? [BoxShadow(color: AppColors.glow1.withOpacity(0.4), blurRadius: 6)] : null,
              ),
            ),
          )),
          const SizedBox(width: 6),
          Text('${current + 1}/$total', style: const TextStyle(fontSize: 10, color: AppColors.textDim)),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════
// COSMIC BACKGROUND
// ═══════════════════════════════════════════
class CosmicBackground extends StatelessWidget {
  final Widget child;

  const CosmicBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.void_,
      body: Stack(
        children: [
          // Orb 1
          Positioned(
            top: -80,
            right: -40,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppColors.glow1.withOpacity(0.08), Colors.transparent],
                ),
              ),
            ),
          ),
          // Orb 2
          Positioned(
            bottom: -60,
            left: -30,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppColors.glow2.withOpacity(0.06), Colors.transparent],
                ),
              ),
            ),
          ),
          // Content
          SafeArea(child: child),
        ],
      ),
    );
  }
}
