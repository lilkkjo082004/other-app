import 'companion.dart';

class ChatMessage {
  final String role; // 'user' or 'assistant'
  final String content;
  final Companion? companion;
  final bool isAmbient;
  final DateTime timestamp;

  ChatMessage({
    required this.role,
    required this.content,
    this.companion,
    this.isAmbient = false,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}
