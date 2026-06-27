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

  Map<String, dynamic> toJson() => {
        'role': role,
        'content': content,
        'companionId': companion?.id,
        'isAmbient': isAmbient,
        'timestamp': timestamp.toIso8601String(),
      };

  factory ChatMessage.fromJson(Map<String, dynamic> j, Map<String, Companion> byId) =>
      ChatMessage(
        role: j['role'] as String,
        content: j['content'] as String,
        companion: j['companionId'] != null ? byId[j['companionId']] : null,
        isAmbient: j['isAmbient'] as bool? ?? false,
        timestamp: j['timestamp'] != null ? DateTime.tryParse(j['timestamp'] as String) : null,
      );
}
