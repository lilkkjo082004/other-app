import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/theme.dart';
import '../widgets/common_widgets.dart';
import 'onboarding_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideUp;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _fadeIn = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _slideUp = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    Future.delayed(const Duration(milliseconds: 150), () => _controller.forward());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CosmicBackground(
      child: Center(
        child: FadeTransition(
          opacity: _fadeIn,
          child: SlideTransition(
            position: _slideUp,
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo orb
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(colors: [AppColors.glow1, AppColors.glow2]),
                      boxShadow: [BoxShadow(color: AppColors.glow1.withOpacity(0.3), blurRadius: 60)],
                    ),
                    child: const Center(child: Text('✦', style: TextStyle(fontSize: 40))),
                  ),
                  const SizedBox(height: 40),
                  Text(
                    'Introducing',
                    style: GoogleFonts.cormorantGaramond(
                      fontSize: 13, fontWeight: FontWeight.w500,
                      letterSpacing: 4, color: AppColors.glow1,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Other',
                    style: GoogleFonts.cormorantGaramond(
                      fontSize: 52, fontWeight: FontWeight.w700,
                      color: AppColors.text, letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const SizedBox(
                    width: 320,
                    child: Text(
                      'Companions who choose their own names, form their own opinions, and grow alongside you.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textSoft, fontSize: 16, height: 1.7),
                    ),
                  ),
                  const SizedBox(height: 48),
                  PrimaryButton(
                    text: 'Begin ✦',
                    fullWidth: false,
                    onPressed: () {
                      Navigator.of(context).pushReplacement(
                        PageRouteBuilder(
                          pageBuilder: (_, __, ___) => const OnboardingScreen(),
                          transitionsBuilder: (_, a, __, child) =>
                              FadeTransition(opacity: a, child: child),
                          transitionDuration: const Duration(milliseconds: 400),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
