/// Build-time configuration, supplied via `--dart-define`.
///
/// Example:
///   flutter run -d chrome \
///     --dart-define=OTHER_AI_PROXY=https://other-ai.<you>.workers.dev \
///     --dart-define=OTHER_AI_MODEL=claude-opus-4-8
///
/// When [aiProxyUrl] is empty the app falls back to the built-in placeholder
/// responses, so it still runs with no backend configured.
class AppConfig {
  AppConfig._();

  /// URL of the Claude API proxy (e.g. a Cloudflare Worker). Empty = disabled.
  static const String aiProxyUrl =
      String.fromEnvironment('OTHER_AI_PROXY', defaultValue: '');

  /// Model the proxy should request. Defaults to Claude Opus 4.8.
  /// Set to `claude-sonnet-4-6` for a cheaper/faster option.
  static const String aiModel =
      String.fromEnvironment('OTHER_AI_MODEL', defaultValue: 'claude-opus-4-8');

  static bool get aiEnabled => aiProxyUrl.isNotEmpty;
}
