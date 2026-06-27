import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/welcome_screen.dart';
import 'utils/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
      home: const WelcomeScreen(),
    );
  }
}
