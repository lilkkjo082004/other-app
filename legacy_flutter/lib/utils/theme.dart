import 'package:flutter/material.dart';

class AppColors {
  static const Color void_ = Color(0xFF06060C);
  static const Color bg = Color(0xFF0B0B14);
  static const Color surface = Color(0xFF111119);
  static const Color surfaceUp = Color(0xFF17171F);
  static const Color card = Color(0xFF141420);
  static const Color border = Color(0xFF222236);
  static const Color borderLit = Color(0xFF3D3D6A);
  static const Color glow1 = Color(0xFF7C5BF5);
  static const Color glow2 = Color(0xFFE84393);
  static const Color glow3 = Color(0xFF00CEC9);
  static const Color text = Color(0xFFEAE8F4);
  static const Color textSoft = Color(0xFF9590B0);
  static const Color textDim = Color(0xFF5C5878);
  static const Color white = Color(0xFFFFFFFF);
  static const Color danger = Color(0xFFFF6B6B);
}

class CompanionColor {
  final Color primary;
  final Color glow;
  final String name;
  const CompanionColor({required this.primary, required this.glow, required this.name});
}

const List<CompanionColor> companionColors = [
  CompanionColor(primary: Color(0xFF7C5BF5), glow: Color(0x597C5BF5), name: 'Violet Nebula'),
  CompanionColor(primary: Color(0xFFE84393), glow: Color(0x59E84393), name: 'Rose Nova'),
  CompanionColor(primary: Color(0xFF00CEC9), glow: Color(0x5900CEC9), name: 'Teal Drift'),
];
