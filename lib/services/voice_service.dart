import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

class VoiceProfile {
  final double pitch;
  final double rate;
  final String? voice;

  const VoiceProfile({required this.pitch, required this.rate, this.voice});
}

const List<VoiceProfile> voiceProfiles = [
  VoiceProfile(pitch: 1.0, rate: 0.48),
  VoiceProfile(pitch: 1.3, rate: 0.52),
  VoiceProfile(pitch: 0.8, rate: 0.45),
];

class VoiceService {
  final FlutterTts _tts = FlutterTts();
  final stt.SpeechToText _stt = stt.SpeechToText();
  bool _sttAvailable = false;
  bool _isSpeaking = false;
  bool autoSpeak = false;

  Future<void> init() async {
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.5);
    _tts.setCompletionHandler(() {
      _isSpeaking = false;
    });

    try {
      _sttAvailable = await _stt.initialize(
        onError: (error) => print('STT Error: $error'),
        onStatus: (status) => print('STT Status: $status'),
      );
    } catch (e) {
      _sttAvailable = false;
      print('STT not available: $e');
    }
  }

  bool get isSpeaking => _isSpeaking;
  bool get sttAvailable => _sttAvailable;

  Future<void> speak(String text, int voiceIdx) async {
    final profile = voiceProfiles[voiceIdx % voiceProfiles.length];
    await _tts.setPitch(profile.pitch);
    await _tts.setSpeechRate(profile.rate);
    _isSpeaking = true;
    await _tts.speak(text);
  }

  Future<void> stop() async {
    await _tts.stop();
    _isSpeaking = false;
  }

  Future<void> listen({
    required Function(String) onResult,
    required Function() onDone,
  }) async {
    if (!_sttAvailable) return;

    await _stt.listen(
      onResult: (result) {
        if (result.finalResult) {
          onResult(result.recognizedWords);
          onDone();
        }
      },
      listenFor: const Duration(seconds: 10),
      pauseFor: const Duration(seconds: 3),
      cancelOnError: true,
    );
  }

  Future<void> stopListening() async {
    await _stt.stop();
  }

  bool get isListening => _stt.isListening;

  void dispose() {
    _tts.stop();
    _stt.stop();
  }
}
