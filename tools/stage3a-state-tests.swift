@main
enum SqueezeRushStage3AStateTests {
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
        let launchBegan = launchFlow.beginUpdateOnce()
        launchFlow.markPostRequestSnapshotPublished()
        check(
            "A",
            "Post-request canRequestAds snapshot is published before update completion",
            launchBegan && launchFlow.postRequestSnapshotPublished && launchFlow.lastErrorCode == nil
        )

        let previousSessionSnapshot = SqueezeRushConsentSnapshot(
            consentStatus: .obtained,
            canRequestAds: true,
            privacyOptionsRequired: .notRequired,
            updateCompleted: false,
            formPresentationInProgress: false,
            lastErrorCode: nil,
            isUsingTestConfiguration: false
        )
        var failedUpdateFlow = SqueezeRushConsentFlowState()
        _ = failedUpdateFlow.beginUpdateOnce()
        failedUpdateFlow.markPostRequestSnapshotPublished()
        let shouldLoadAfterFailure = failedUpdateFlow.completeUpdate(errorCode: "consent_update_7")
        check(
            "B",
            "Consent-information update failure skips required-form loading",
            shouldLoadAfterFailure == false
        )
        check(
            "C",
            "Consent-information update failure preserves UMP canRequestAds",
            previousSessionSnapshot.canRequestAds && failedUpdateFlow.lastErrorCode == "consent_update_7"
        )

        var successfulUpdateFlow = SqueezeRushConsentFlowState()
        successfulUpdateFlow.completeConsentForm(errorCode: "consent_update_7")
        _ = successfulUpdateFlow.beginUpdateOnce()
        successfulUpdateFlow.markPostRequestSnapshotPublished()
        let shouldLoadAfterSuccess = successfulUpdateFlow.completeUpdate(errorCode: nil)
        check(
            "D",
            "Successful update clears the prior update error",
            shouldLoadAfterSuccess == true && successfulUpdateFlow.lastErrorCode == nil
        )

        var consentFormFlow = SqueezeRushConsentFlowState()
        _ = consentFormFlow.beginFormPresentation()
        consentFormFlow.completeConsentForm(errorCode: "consent_form_8")
        _ = consentFormFlow.beginFormPresentation()
        consentFormFlow.completeConsentForm(errorCode: nil)
        check(
            "E",
            "Successful required-form completion clears a prior form error",
            consentFormFlow.lastErrorCode == nil && !consentFormFlow.formPresentationInProgress
        )

        var privacyFlow = SqueezeRushConsentFlowState()
        _ = privacyFlow.beginFormPresentation()
        privacyFlow.completePrivacyOptions(errorCode: "privacy_options_9")
        _ = privacyFlow.beginFormPresentation()
        privacyFlow.completePrivacyOptions(errorCode: nil)
        check(
            "F",
            "Successful privacy-options completion clears a prior error",
            privacyFlow.lastErrorCode == nil && !privacyFlow.formPresentationInProgress
        )

        var initialization = SqueezeRushAdStateCoordinator()
        let firstStart = initialization.updateConsent(canRequestAds: true)
        check(
            "G",
            "SDK start is requested once when consent first becomes true",
            firstStart && initialization.sdkInitializationStarted
        )

        let falseWhileStarting = initialization.updateConsent(canRequestAds: false)
        let completionRecorded = initialization.markSDKInitialized()
        check(
            "H",
            "Consent false during SDK start does not lose completion",
            !falseWhileStarting && completionRecorded && initialization.sdkInitialized
        )
        initialization.setRewardedReady(true)
        initialization.setInterstitialReady(true)
        check(
            "I",
            "SDK completion while consent is false records initialized without loading",
            initialization.sdkInitialized && !initialization.canRequestAds &&
                !initialization.rewardedReady && !initialization.interstitialReady
        )

        let secondStart = initialization.updateConsent(canRequestAds: true)
        initialization.setRewardedReady(true)
        check(
            "J",
            "Later consent true reuses initialized SDK without a second start",
            !secondStart && initialization.sdkInitialized && initialization.rewardedReady
        )

        var transitions = SqueezeRushAdStateCoordinator()
        var startRequests = 0
        if transitions.updateConsent(canRequestAds: true) { startRequests += 1 }
        if transitions.updateConsent(canRequestAds: true) { startRequests += 1 }
        if transitions.updateConsent(canRequestAds: false) { startRequests += 1 }
        if transitions.updateConsent(canRequestAds: true) { startRequests += 1 }
        check(
            "K",
            "Repeated true-false changes request SDK start only once",
            startRequests == 1
        )

        _ = transitions.markSDKInitialized()
        transitions.setRewardedReady(true)
        transitions.setInterstitialReady(true)
        _ = transitions.updateConsent(canRequestAds: false)
        check(
            "L",
            "Consent false clears readiness without uninitializing SDK",
            transitions.sdkInitialized && !transitions.rewardedReady && !transitions.interstitialReady
        )

        transitions.teardown()
        let recoveryAfterTeardown = transitions.updateConsent(canRequestAds: true)
        transitions.setRewardedReady(true)
        check(
            "M",
            "Teardown prevents recovery and loading",
            !recoveryAfterTeardown && !transitions.canRequestAds && !transitions.rewardedReady
        )

        print("STAGE 3A CORE TEST RESULT: \(passed)/13 passed, \(failed) failed")
        if failed > 0 {
            fatalError("Stage 3A state tests failed")
        }
    }
}
