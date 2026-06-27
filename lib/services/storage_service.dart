import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_profile.dart';
import '../models/companion.dart';
import '../models/chat_message.dart';

/// A full snapshot of a user's session — everything needed to resume the app
/// exactly where they left off.
class SessionData {
  final UserProfile profile;
  final List<Companion> companions;
  final List<ChatMessage> messages;
  final String chatMode; // 'group' or a companion id
  final bool autoSpeak;
  final bool callByName;
  final DateTime? trialStart; // null when the user only has the free companion

  SessionData({
    required this.profile,
    required this.companions,
    this.messages = const [],
    this.chatMode = 'group',
    this.autoSpeak = false,
    this.callByName = true,
    this.trialStart,
  });

  /// Days remaining in the 14-day trial. Null if no trial is active.
  /// Negative/zero values mean the trial has ended.
  int? get trialDaysLeft {
    if (trialStart == null) return null;
    final elapsed = DateTime.now().difference(trialStart!).inDays;
    return 14 - elapsed;
  }

  bool get trialActive {
    final left = trialDaysLeft;
    return left != null && left > 0;
  }

  bool get trialExpired {
    final left = trialDaysLeft;
    return left != null && left <= 0;
  }
}

/// Local-first persistence backed by [SharedPreferences]. The entire session is
/// stored as a single JSON blob so saves are atomic and loads are consistent.
class StorageService {
  static const _key = 'other_session_v1';

  StorageService._();
  static final StorageService instance = StorageService._();

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  bool get hasSession => _prefs?.containsKey(_key) ?? false;

  Future<void> save(SessionData s) async {
    await init();
    final map = {
      'profile': s.profile.toJson(),
      'companions': s.companions.map((c) => c.toJson()).toList(),
      'messages': s.messages.map((m) => m.toJson()).toList(),
      'chatMode': s.chatMode,
      'autoSpeak': s.autoSpeak,
      'callByName': s.callByName,
      'trialStart': s.trialStart?.toIso8601String(),
    };
    await _prefs!.setString(_key, jsonEncode(map));
  }

  /// Returns the saved session, or null if none exists or it can't be parsed.
  SessionData? load() {
    final raw = _prefs?.getString(_key);
    if (raw == null) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final profile = UserProfile.fromJson(Map<String, dynamic>.from(map['profile'] as Map));
      final companions = (map['companions'] as List)
          .map((e) => Companion.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      final byId = {for (final c in companions) c.id: c};
      final messages = (map['messages'] as List? ?? [])
          .map((e) => ChatMessage.fromJson(Map<String, dynamic>.from(e as Map), byId))
          .toList();
      return SessionData(
        profile: profile,
        companions: companions,
        messages: messages,
        chatMode: map['chatMode'] as String? ?? 'group',
        autoSpeak: map['autoSpeak'] as bool? ?? false,
        callByName: map['callByName'] as bool? ?? true,
        trialStart:
            map['trialStart'] != null ? DateTime.tryParse(map['trialStart'] as String) : null,
      );
    } catch (_) {
      return null;
    }
  }

  /// Wipes all stored data — used by the full-reset flow.
  Future<void> clear() async {
    await init();
    await _prefs!.remove(_key);
  }
}
