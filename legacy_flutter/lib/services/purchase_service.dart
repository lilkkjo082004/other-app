import '../models/companion.dart';

/// Result of an attempted purchase.
enum PurchaseResult { success, cancelled, failed }

/// One-time companion unlock.
///
/// This is a SIMULATED implementation so the freemium loop is fully playable
/// without a payment backend. To ship for real, replace the body of
/// [unlockCompanion] with a store integration — Google Play Billing /
/// RevenueCat / Stripe — and report the genuine result. The rest of the app
/// only depends on the returned [PurchaseResult], so nothing else needs to
/// change.
class PurchaseService {
  PurchaseService._();
  static final PurchaseService instance = PurchaseService._();

  Future<PurchaseResult> unlockCompanion(Companion companion) async {
    // TODO(payments): kick off the real one-time purchase here and await it.
    await Future.delayed(const Duration(milliseconds: 700));
    return PurchaseResult.success;
  }
}
