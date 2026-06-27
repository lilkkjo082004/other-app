import '../models/companion.dart';

/// Single source of truth for trial / ownership rules.
///
/// Free tier = one companion, free forever. Choosing more than one companion
/// starts a 14-day trial; when it lapses, any companion that was never
/// purchased becomes "memory limited" — still present, but unable to adapt,
/// remember, or grow until unlocked.
class Entitlements {
  Entitlements._();

  static const int trialLengthDays = 14;

  /// Displayed price for a one-time companion unlock.
  static const String companionPrice = '\$4.99';

  /// Days remaining in the trial, or null when no trial is active.
  /// Zero or negative means the trial has ended.
  static int? trialDaysLeft(DateTime? trialStart) {
    if (trialStart == null) return null;
    return trialLengthDays - DateTime.now().difference(trialStart).inDays;
  }

  static bool trialActive(DateTime? trialStart) {
    final d = trialDaysLeft(trialStart);
    return d != null && d > 0;
  }

  static bool trialExpired(DateTime? trialStart) {
    final d = trialDaysLeft(trialStart);
    return d != null && d <= 0;
  }

  /// A companion that was never purchased and whose trial has lapsed.
  static bool isLimited(Companion c, DateTime? trialStart) {
    return !c.purchased && trialExpired(trialStart);
  }

  /// True when there is at least one companion the user could still unlock.
  static bool hasLockedCompanions(List<Companion> companions, DateTime? trialStart) {
    return companions.any((c) =>
        c.status != CompanionStatus.deleted && !c.purchased && trialStart != null);
  }
}
