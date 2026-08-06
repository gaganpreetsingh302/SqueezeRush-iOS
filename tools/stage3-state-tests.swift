@main
enum SqueezeRushStage3StateTests {
    static func main() {
        var passed = 0
        var failed = 0

        func check(_ letter: String, _ name: String, _ condition: @autoclosure () -> Bool) {
            if condition() {
                passed += 1
                print("PASS: \(letter). \(name)")
            }
            else {
                failed += 1
                print("FAIL: \(letter). \(name)")
            }
        }

        var consentBlockedState = SqueezeRushAdStateCoordinator()
        check(
            "A",
            "Consent false prevents MobileAds start",
            consentBlockedState.updateConsent(canRequestAds: false) == false &&
                consentBlockedState.sdkInitializationStarted == false
        )

        var startOnceState = SqueezeRushAdStateCoordinator()
        let firstStart = startOnceState.updateConsent(canRequestAds: true)
        check("B", "canRequestAds true starts MobileAds once", firstStart && startOnceState.sdkInitializationStarted)
        check(
            "C",
            "Repeated consent callbacks do not initialize ads twice",
            startOnceState.updateConsent(canRequestAds: true) == false
        )

        var preInitializationState = SqueezeRushAdStateCoordinator()
        _ = preInitializationState.updateConsent(canRequestAds: true)
        preInitializationState.setRewardedReady(true)
        preInitializationState.setInterstitialReady(true)
        check(
            "D",
            "Ads are not loaded before initialization",
            !preInitializationState.rewardedReady && !preInitializationState.interstitialReady
        )

        var readinessState = SqueezeRushAdStateCoordinator()
        check("E", "Rewarded readiness starts false", readinessState.rewardedReady == false)
        _ = readinessState.updateConsent(canRequestAds: true)
        _ = readinessState.markSDKInitialized()
        readinessState.setRewardedReady(true)
        check("F", "Rewarded load success changes readiness to true", readinessState.rewardedReady)

        readinessState.setInterstitialReady(true)
        let rewardedBegan = readinessState.beginRewardedPresentation() == .accepted
        let overlappingInterstitial = readinessState.beginInterstitialPresentation()
        check(
            "G",
            "Rewarded presentation locks other full-screen presentations",
            rewardedBegan && overlappingInterstitial == .rejected(code: "presentation_busy")
        )

        let earnedSession = SqueezeRushAdPresentationSession(kind: .rewarded, placement: "revive")
        earnedSession.recordEarned(type: "coin", amount: 1)
        check("H", "Earned callback alone does not settle before dismissal", earnedSession.earned && !earnedSession.settled)
        let earnedResult = earnedSession.settleAfterDismissal()
        check(
            "I",
            "Dismissal after earned callback settles success once",
            earnedResult?.status == .success && earnedResult?.earned == true && earnedSession.settleAfterDismissal() == nil
        )

        let cancelledSession = SqueezeRushAdPresentationSession(kind: .rewarded, placement: "double_rewards")
        let cancelledResult = cancelledSession.settleAfterDismissal()
        check(
            "J",
            "Dismissal without earned callback settles cancelled once",
            cancelledResult?.status == .cancelled && cancelledResult?.earned == false
        )

        let duplicateEarnSession = SqueezeRushAdPresentationSession(kind: .rewarded, placement: "revive")
        duplicateEarnSession.recordEarned(type: "first", amount: 1)
        duplicateEarnSession.recordEarned(type: "second", amount: 99)
        let duplicateEarnResult = duplicateEarnSession.settleAfterDismissal()
        check(
            "K",
            "Duplicate earned callback does not duplicate completion",
            duplicateEarnResult?.rewardType == "first" && duplicateEarnResult?.rewardAmount == 1 &&
                duplicateEarnSession.settleAfterDismissal() == nil
        )

        let failureSession = SqueezeRushAdPresentationSession(kind: .rewarded, placement: "revive")
        let failureResult = failureSession.settleFailure(code: "ad_present_1")
        check(
            "L",
            "Failure to present settles failed once",
            failureResult?.status == .failed && failureSession.settleFailure(code: "duplicate") == nil
        )

        let rewardedReload = readinessState.finishPresentation(.rewarded)
        check(
            "M",
            "Rewarded ad clears and schedules reload after completion",
            rewardedReload && readinessState.activePresentation == nil && !readinessState.rewardedReady
        )

        let interstitialSession = SqueezeRushAdPresentationSession(kind: .interstitial, placement: "run_end")
        let interstitialDismissal = interstitialSession.settleAfterDismissal()
        check(
            "N",
            "Interstitial dismissal settles success once",
            interstitialDismissal?.status == .success && interstitialSession.settleAfterDismissal() == nil
        )

        let interstitialFailureSession = SqueezeRushAdPresentationSession(kind: .interstitial, placement: "run_end")
        let interstitialFailure = interstitialFailureSession.settleFailure(code: "ad_present_2")
        check(
            "O",
            "Interstitial presentation failure settles failed once",
            interstitialFailure?.status == .failed && interstitialFailureSession.settleAfterDismissal() == nil
        )

        var interstitialReloadState = SqueezeRushAdStateCoordinator()
        _ = interstitialReloadState.updateConsent(canRequestAds: true)
        _ = interstitialReloadState.markSDKInitialized()
        interstitialReloadState.setInterstitialReady(true)
        _ = interstitialReloadState.beginInterstitialPresentation()
        check(
            "P",
            "Interstitial clears and schedules reload after completion",
            interstitialReloadState.finishPresentation(.interstitial) &&
                interstitialReloadState.activePresentation == nil &&
                !interstitialReloadState.interstitialReady
        )

        var teardownState = SqueezeRushAdStateCoordinator()
        _ = teardownState.updateConsent(canRequestAds: true)
        _ = teardownState.markSDKInitialized()
        teardownState.setRewardedReady(true)
        _ = teardownState.beginRewardedPresentation()
        let teardownSession = SqueezeRushAdPresentationSession(kind: .rewarded, placement: "revive")
        let teardownResult = teardownSession.settleTeardown()
        teardownState.teardown()
        check(
            "Q",
            "Teardown safely rejects or cancels pending operations",
            teardownResult?.status == .cancelled && teardownSession.settleTeardown() == nil &&
                teardownState.beginRewardedPresentation() == .rejected(code: "consent_not_ready")
        )

        let boundedSnapshot = SqueezeRushConsentSnapshot(
            consentStatus: .obtained,
            canRequestAds: true,
            privacyOptionsRequired: .notRequired,
            updateCompleted: true,
            formPresentationInProgress: false,
            lastErrorCode: nil,
            isUsingTestConfiguration: true
        )
        check(
            "R",
            "consent.status returns bounded fields",
            boundedSnapshot.consentStatus.rawValue == "obtained" &&
                boundedSnapshot.privacyOptionsRequired.rawValue == "not_required" &&
                boundedSnapshot.canRequestAds && boundedSnapshot.updateCompleted
        )

        var consentFlow = SqueezeRushConsentFlowState()
        let firstForm = consentFlow.beginFormPresentation()
        let overlappingForm = consentFlow.beginFormPresentation()
        check("S", "Privacy-options presentation lock prevents overlap", firstForm && !overlappingForm)

        check(
            "T",
            "Bridge rejects rewarded active-game lifecycle context",
            SqueezeRushAdRequestPolicy.validateRewarded(
                placement: "revive",
                runId: "run-1",
                resultSequence: 1,
                lifecyclePhase: "active"
            ) == .rejected(code: "invalid_lifecycle_context")
        )

        let missingRun = SqueezeRushAdRequestPolicy.validateRewarded(
            placement: "revive",
            runId: nil,
            resultSequence: 1,
            lifecyclePhase: "result_pending"
        )
        let missingSequence = SqueezeRushAdRequestPolicy.validateInterstitial(
            placement: "run_end",
            runId: "run-1",
            resultSequence: nil,
            lifecyclePhase: "finalized"
        )
        check(
            "U",
            "Bridge rejects missing run ID or result sequence",
            missingRun == .rejected(code: "invalid_lifecycle_context") &&
                missingSequence == .rejected(code: "invalid_lifecycle_context")
        )

        check(
            "V",
            "Bridge rejects unknown placement",
            SqueezeRushAdRequestPolicy.validateRewarded(
                placement: "unknown",
                runId: "run-1",
                resultSequence: 1,
                lifecyclePhase: "result_pending"
            ) == .rejected(code: "invalid_placement")
        )

        print("STAGE 3 CORE TEST RESULT: \(passed)/22 passed, \(failed) failed")
        if failed > 0 {
            fatalError("Stage 3 state tests failed")
        }
    }
}
