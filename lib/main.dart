import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/welcome_screen.dart';
import 'screens/zodiac_reveal_screen.dart';
import 'models/companion.dart';
import 'services/storage_service.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.instance.init();
  runApp(const OtherApp());
}

class OtherApp extends StatelessWidget {
  const OtherApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Other',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.void_,
        textTheme: GoogleFonts.dmSansTextTheme(
          ThemeData.dark().textTheme,
        ),
        colorScheme: ColorScheme.dark(
          primary: AppColors.glow1,
          secondary: AppColors.glow2,
          surface: AppColors.surface,
        ),
      ),
      home: const BootstrapScreen(),
    );
  }
}

/// Decides where to start: a returning user with at least one living companion
/// resumes straight into the chat; everyone else begins at the welcome screen.
class BootstrapScreen extends StatelessWidget {
  const BootstrapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final storage = StorageService.instance;
    if (storage.hasSession) {
      final session = storage.load();
      final hasLiving = session != null &&
          session.companions.any((c) => c.status != CompanionStatus.deleted);
      if (hasLiving) {
        return ChatScreen(
          profile: session.profile,
          companions: session.companions,
          restored: session,
        );
      }
    }
    return const WelcomeScreen();
  }
}
