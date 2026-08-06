import Foundation
import UIKit
import UserMessagingPlatform

final class SqueezeRushConsentManager: SqueezeRushConsentServing {
    private weak var presentationOwner: UIViewController?
    private var flowState = SqueezeRushConsentFlowState()
    private var updateCompleted = false
    private var isUsingTestConfiguration = false
    private var privacyRequestSequence = 0
    private var activePrivacyRequest: Int?
    private var activePrivacyCompletion: ((SqueezeRushConsentOperationResult) -> Void)?

    var onConsentStateChanged: ((SqueezeRushConsentSnapshot) -> Void)?

    init(presentationOwner: UIViewController) {
        self.presentationOwner = presentationOwner
    }

    var snapshot: SqueezeRushConsentSnapshot {
        let information = ConsentInformation.shared
        return SqueezeRushConsentSnapshot(
            consentStatus: Self.mapConsentStatus(information.consentStatus),
            canRequestAds: information.canRequestAds,
            privacyOptionsRequired: Self.mapPrivacyOptions(information.privacyOptionsRequirementStatus),
            updateCompleted: updateCompleted,
            formPresentationInProgress: flowState.formPresentationInProgress,
            lastErrorCode: flowState.lastErrorCode,
            isUsingTestConfiguration: isUsingTestConfiguration
        )
    }

    func requestConsentUpdateOncePerLaunch() {
        runOnMain { [weak self] in
            guard let self, self.flowState.beginUpdateOnce() else { return }

            let parameters = RequestParameters()
            self.configureDebugTesting(parameters)

            ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { [weak self] error in
                self?.enqueueConsentUpdateCompletion(error)
            }
            self.flowState.markPostRequestSnapshotPublished()
            self.publishSnapshot()
        }
    }

    func presentPrivacyOptions(completion: @escaping (SqueezeRushConsentOperationResult) -> Void) {
        runOnMain { [weak self] in
            guard let self else {
                completion(Self.unavailableSnapshotResult(code: "consent_service_unavailable"))
                return
            }

            let information = ConsentInformation.shared
            let privacyOptionsRequirement = Self.mapPrivacyOptions(
                information.privacyOptionsRequirementStatus
            )
            guard SqueezeRushPrivacyOptionsPolicy.canPresent(
                requirement: privacyOptionsRequirement
            ) else {
                completion(SqueezeRushConsentOperationResult(
                    status: .unavailable,
                    snapshot: self.snapshot,
                    errorCode: "privacy_options_unavailable"
                ))
                return
            }
            guard self.flowState.beginFormPresentation() else {
                completion(SqueezeRushConsentOperationResult(
                    status: .unavailable,
                    snapshot: self.snapshot,
                    errorCode: "presentation_busy"
                ))
                return
            }
            guard let owner = self.presentationOwner,
                  owner.viewIfLoaded?.window != nil,
                  owner.presentedViewController == nil else {
                self.flowState.finishFormPresentation()
                completion(SqueezeRushConsentOperationResult(
                    status: .unavailable,
                    snapshot: self.snapshot,
                    errorCode: "presentation_busy"
                ))
                return
            }

            self.privacyRequestSequence += 1
            let request = self.privacyRequestSequence
            self.activePrivacyRequest = request
            self.activePrivacyCompletion = completion
            self.publishSnapshot()
            ConsentForm.presentPrivacyOptionsForm(from: owner) { [weak self] error in
                self?.runOnMain {
                    self?.finishPrivacyRequest(request, error: error)
                }
            }
        }
    }

    func teardown() {
        runOnMain { [weak self] in
            guard let self else { return }
            let completion = self.activePrivacyCompletion
            self.activePrivacyRequest = nil
            self.activePrivacyCompletion = nil
            self.flowState.finishFormPresentation()
            let result = SqueezeRushConsentOperationResult(
                status: .cancelled,
                snapshot: self.snapshot,
                errorCode: "consent_service_torn_down"
            )
            completion?(result)
            self.onConsentStateChanged = nil
            self.presentationOwner = nil
        }
    }

    private func enqueueConsentUpdateCompletion(_ error: Error?) {
        DispatchQueue.main.async { [weak self] in
            self?.processConsentUpdateCompletion(error)
        }
    }

    private func processConsentUpdateCompletion(_ error: Error?) {
        let errorCode = error.map {
            Self.normalizedErrorCode(prefix: "consent_update", error: $0)
        }
        guard let shouldLoadRequiredForm = flowState.completeUpdate(errorCode: errorCode) else {
            return
        }
        updateCompleted = true
        publishSnapshot()
        guard shouldLoadRequiredForm else { return }
        loadAndPresentRequiredForm()
    }

    private func loadAndPresentRequiredForm() {
        guard flowState.beginFormPresentation() else { return }
        guard let owner = presentationOwner,
              owner.viewIfLoaded?.window != nil,
              owner.presentedViewController == nil else {
            flowState.completeConsentForm(errorCode: "consent_presentation_owner_unavailable")
            publishSnapshot()
            return
        }

        publishSnapshot()
        ConsentForm.loadAndPresentIfRequired(from: owner) { [weak self] error in
            self?.runOnMain {
                guard let self else { return }
                let errorCode = error.map {
                    Self.normalizedErrorCode(prefix: "consent_form", error: $0)
                }
                self.flowState.completeConsentForm(errorCode: errorCode)
                self.publishSnapshot()
            }
        }
    }

    private func finishPrivacyRequest(_ request: Int, error: Error?) {
        guard activePrivacyRequest == request else { return }
        let completion = activePrivacyCompletion
        activePrivacyRequest = nil
        activePrivacyCompletion = nil
        let errorCode = error.map {
            Self.normalizedErrorCode(prefix: "privacy_options", error: $0)
        }
        flowState.completePrivacyOptions(errorCode: errorCode)
        let result = SqueezeRushConsentOperationResult(
            status: error == nil ? .success : .failed,
            snapshot: snapshot,
            errorCode: errorCode
        )
        publishSnapshot()
        completion?(result)
    }

    private func publishSnapshot() {
        onConsentStateChanged?(snapshot)
    }

    private func configureDebugTesting(_ parameters: RequestParameters) {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        let buildSetting = (Bundle.main.object(forInfoDictionaryKey: "SqueezeRushUMPDebugGeography") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        if arguments.contains("-SqueezeRushUMPResetConsent") {
            ConsentInformation.shared.reset()
            isUsingTestConfiguration = true
        }

        let geography: DebugGeography?
        if arguments.contains("-SqueezeRushUMPTestEEA") || buildSetting == "eea" {
            geography = .EEA
        }
        else if arguments.contains("-SqueezeRushUMPTestUSState") || buildSetting == "us_state" {
            geography = .regulatedUSState
        }
        else if arguments.contains("-SqueezeRushUMPTestOther") || buildSetting == "other" {
            geography = .other
        }
        else {
            geography = nil
        }

        if let geography {
            let settings = DebugSettings()
            settings.geography = geography
            parameters.debugSettings = settings
            isUsingTestConfiguration = true
        }
        #endif
    }

    private static func mapConsentStatus(_ status: ConsentStatus) -> SqueezeRushConsentStatusValue {
        switch status {
        case .required:
            return .required
        case .notRequired:
            return .notRequired
        case .obtained:
            return .obtained
        case .unknown:
            return .unknown
        @unknown default:
            return .unknown
        }
    }

    private static func mapPrivacyOptions(
        _ status: PrivacyOptionsRequirementStatus
    ) -> SqueezeRushPrivacyOptionsValue {
        switch status {
        case .required:
            return .required
        case .notRequired:
            return .notRequired
        case .unknown:
            return .unknown
        @unknown default:
            return .unknown
        }
    }

    private static func unavailableSnapshotResult(code: String) -> SqueezeRushConsentOperationResult {
        SqueezeRushConsentOperationResult(
            status: .unavailable,
            snapshot: SqueezeRushConsentSnapshot(
                consentStatus: .unknown,
                canRequestAds: false,
                privacyOptionsRequired: .unknown,
                updateCompleted: false,
                formPresentationInProgress: false,
                lastErrorCode: code,
                isUsingTestConfiguration: false
            ),
            errorCode: code
        )
    }

    private static func normalizedErrorCode(prefix: String, error: Error) -> String {
        let nsError = error as NSError
        let domain = nsError.domain.map { character in
            character.isLetter || character.isNumber ? String(character).lowercased() : "_"
        }.joined()
        return "\(prefix)_\(domain)_\(nsError.code)"
    }

    private func runOnMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread {
            work()
        }
        else {
            DispatchQueue.main.async(execute: work)
        }
    }
}
