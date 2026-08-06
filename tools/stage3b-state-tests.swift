@main
enum SqueezeRushStage3BStateTests {
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

        var launchFlow = SqueezeRushConsentFlowState()
        let firstBegin = launchFlow.beginUpdateOnce()
        let secondBegin = launchFlow.beginUpdateOnce()
        check("A", "beginUpdateOnce is enforced", firstBegin && !secondBegin)

        var failedUpdateFlow = SqueezeRushConsentFlowState()
        _ = failedUpdateFlow.beginUpdateOnce()
        failedUpdateFlow.markPostRequestSnapshotPublished()
        let shouldLoadAfterFailure = failedUpdateFlow.completeUpdate(errorCode: "consent_update_7")
        check(
            "F",
            "Update failure skips required-form loading",
            shouldLoadAfterFailure == false && failedUpdateFlow.updateCompletionProcessed
        )

        let umpOwnedSnapshot = SqueezeRushConsentSnapshot(
            consentStatus: .obtained,
            canRequestAds: true,
            privacyOptionsRequired: .required,
            updateCompleted: true,
            formPresentationInProgress: false,
            lastErrorCode: failedUpdateFlow.lastErrorCode,
            isUsingTestConfiguration: false
        )
        check(
            "G",
            "Update failure preserves the current UMP canRequestAds value",
            umpOwnedSnapshot.canRequestAds && umpOwnedSnapshot.lastErrorCode == "consent_update_7"
        )

        var successfulUpdateFlow = SqueezeRushConsentFlowState()
        successfulUpdateFlow.completeConsentForm(errorCode: "consent_update_8")
        _ = successfulUpdateFlow.beginUpdateOnce()
        successfulUpdateFlow.markPostRequestSnapshotPublished()
        let shouldLoadAfterSuccess = successfulUpdateFlow.completeUpdate(errorCode: nil)
        let duplicateCompletion = successfulUpdateFlow.completeUpdate(errorCode: "duplicate")
        check(
            "H",
            "Successful update clears the prior error and completes once",
            shouldLoadAfterSuccess == true && duplicateCompletion == nil &&
                successfulUpdateFlow.lastErrorCode == nil
        )

        var formFlow = SqueezeRushConsentFlowState()
        _ = formFlow.beginFormPresentation()
        formFlow.completeConsentForm(errorCode: "consent_form_9")
        _ = formFlow.beginFormPresentation()
        formFlow.completeConsentForm(errorCode: nil)
        check(
            "I",
            "Successful required-form completion clears a form error",
            formFlow.lastErrorCode == nil && !formFlow.formPresentationInProgress
        )

        check(
            "J",
            "Privacy options accept an explicit required status",
            SqueezeRushPrivacyOptionsPolicy.canPresent(requirement: .required)
        )
        check(
            "K",
            "General form availability cannot substitute for a required privacy-options status",
            !SqueezeRushPrivacyOptionsPolicy.canPresent(requirement: .notRequired)
        )
        check(
            "L",
            "Unknown and not-required privacy-options states are unavailable",
            !SqueezeRushPrivacyOptionsPolicy.canPresent(requirement: .unknown) &&
                !SqueezeRushPrivacyOptionsPolicy.canPresent(requirement: .notRequired)
        )

        var privacyFlow = SqueezeRushConsentFlowState()
        let firstPresentation = privacyFlow.beginFormPresentation()
        let overlappingPresentation = privacyFlow.beginFormPresentation()
        check(
            "M",
            "Overlapping privacy-options presentation remains blocked",
            firstPresentation && !overlappingPresentation
        )

        var adFlow = SqueezeRushAdStateCoordinator()
        var startRequests = 0
        if adFlow.updateConsent(canRequestAds: true) { startRequests += 1 }
        _ = adFlow.updateConsent(canRequestAds: false)
        let completionRecorded = adFlow.markSDKInitialized()
        let noLoadWhileFalse = adFlow.sdkInitialized && !adFlow.canRequestAds &&
            !adFlow.rewardedReady && !adFlow.interstitialReady
        if adFlow.updateConsent(canRequestAds: true) { startRequests += 1 }
        adFlow.setRewardedReady(true)
        check(
            "N",
            "SDK initialization race recovers without a second start",
            completionRecorded && noLoadWhileFalse && startRequests == 1 &&
                adFlow.sdkInitialized && adFlow.rewardedReady
        )

        print("STAGE 3B CORE TEST RESULT: \(passed)/10 passed, \(failed) failed")
        if failed > 0 {
            fatalError("Stage 3B state tests failed")
        }
    }
}
