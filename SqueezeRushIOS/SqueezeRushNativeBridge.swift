import Foundation
import UIKit
import WebKit

enum SqueezeRushBridgeAction: String, CaseIterable {
    case capabilities = "bridge.capabilities"
    case hapticPerform = "haptic.perform"
    case sharePresent = "share.present"
    case rewardedShow = "rewarded.show"
    case interstitialShow = "interstitial.show"
    case purchaseBuy = "purchase.buy"
    case purchaseRestore = "purchase.restore"
    case entitlementsRefresh = "entitlements.refresh"
    case reviewRequest = "review.request"
    case moreGamesOpen = "moreGames.open"
    case analyticsTrack = "analytics.track"
    case consentStatus = "consent.status"
}

enum SqueezeRushBridgeStatus: String {
    case success
    case unavailable
    case cancelled
    case failed
    case invalidRequest = "invalid_request"
    case stale
    case timeout
}

private enum SqueezeRushHapticStyle: String, CaseIterable {
    case light
    case medium
    case heavy
    case success
    case error
}

private struct SqueezeRushBridgeContext {
    let runId: String?
    let resultSequence: Int?
    let lifecyclePhase: String?

    static let empty = SqueezeRushBridgeContext(runId: nil, resultSequence: nil, lifecyclePhase: nil)

    var dictionary: [String: Any] {
        [
            "runId": runId.map { $0 as Any } ?? NSNull(),
            "resultSequence": resultSequence.map { $0 as Any } ?? NSNull(),
            "lifecyclePhase": lifecyclePhase.map { $0 as Any } ?? NSNull()
        ]
    }
}

private struct SqueezeRushBridgeError {
    let code: String
    let message: String

    var dictionary: [String: Any] {
        ["code": code, "message": message]
    }
}

private struct SqueezeRushBridgeRequest {
    let requestId: String
    let action: SqueezeRushBridgeAction
    let context: SqueezeRushBridgeContext
    let payload: [String: Any]
}

private enum SqueezeRushValidatedPayload {
    case capabilities
    case haptic(SqueezeRushHapticStyle)
    case share(String)
    case rewarded(SqueezeRushRewardedPlacement)
    case interstitial(SqueezeRushInterstitialPlacement)
    case consent(SqueezeRushConsentOperation)
    case purchaseBuy
    case purchaseRestore
    case entitlementsRefresh
    case unavailable
}

final class SqueezeRushNativeBridge: NSObject, WKScriptMessageHandler {
    static let protocolVersion = 1
    static let messageHandlerName = "squeezeRushBridge"

    private static let receiverScript = "window.SqueezeRushNative.__receive(response)"
    private static let maximumRequestIdLength = 128
    private static let maximumRunIdLength = 128
    private static let maximumShareLength = 1000
    private static let allowedRequestIdCharacters = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._:-")
    private static let allowedLifecyclePhases: Set<String> = ["idle", "countdown", "active", "result_pending", "finalized"]

    private weak var presentationOwner: UIViewController?
    private weak var webView: WKWebView?
    private weak var userContentController: WKUserContentController?
    private weak var adService: SqueezeRushAdServing?
    private weak var consentService: SqueezeRushConsentServing?
    private weak var purchaseService: SqueezeRushPurchaseServing?
    private var inFlightRequests: [String: SqueezeRushBridgeAction] = [:]
    private var shareRequestId: String?

    init(
        presentationOwner: UIViewController,
        adService: SqueezeRushAdServing? = nil,
        consentService: SqueezeRushConsentServing? = nil,
        purchaseService: SqueezeRushPurchaseServing? = nil
    ) {
        self.presentationOwner = presentationOwner
        self.adService = adService
        self.consentService = consentService
        self.purchaseService = purchaseService
        super.init()
    }

    func register(with userContentController: WKUserContentController) {
        if self.userContentController !== userContentController {
            self.userContentController?.removeScriptMessageHandler(forName: Self.messageHandlerName)
            userContentController.add(self, name: Self.messageHandlerName)
            self.userContentController = userContentController
        }
    }

    func attach(to webView: WKWebView) {
        self.webView = webView
    }

    func detach() {
        userContentController?.removeScriptMessageHandler(forName: Self.messageHandlerName)
        userContentController = nil
        webView = nil
        presentationOwner = nil
        adService = nil
        consentService = nil
        purchaseService = nil
        shareRequestId = nil
        inFlightRequests.removeAll()
    }

    deinit {
        userContentController?.removeScriptMessageHandler(forName: Self.messageHandlerName)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.messageHandlerName else {
            return
        }

        if Thread.isMainThread {
            handleMessageBody(message.body)
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.handleMessageBody(message.body)
            }
        }
    }

    private func handleMessageBody(_ body: Any) {
        guard let dictionary = body as? [String: Any] else {
            debugLog("Rejected non-object message body.")
            return
        }

        guard let requestId = Self.validRequestId(dictionary["requestId"]) else {
            debugLog("Rejected missing or invalid requestId.")
            return
        }
        guard let actionName = dictionary["action"] as? String,
              let action = SqueezeRushBridgeAction(rawValue: actionName) else {
            debugLog("Rejected unknown action for request \(requestId).")
            return
        }

        let responseContext = Self.parseContext(dictionary["context"]) ?? .empty
        guard Self.integer(from: dictionary["protocolVersion"]) == Self.protocolVersion else {
            sendInvalidRequest(
                requestId: requestId,
                action: action,
                context: responseContext,
                code: "invalid_protocol_version",
                message: "protocolVersion must equal 1."
            )
            return
        }
        guard let context = Self.parseContext(dictionary["context"]) else {
            sendInvalidRequest(
                requestId: requestId,
                action: action,
                context: .empty,
                code: "invalid_context",
                message: "context is malformed."
            )
            return
        }
        guard let payload = dictionary["payload"] as? [String: Any] else {
            sendInvalidRequest(
                requestId: requestId,
                action: action,
                context: context,
                code: "invalid_payload",
                message: "payload must be an object."
            )
            return
        }

        guard inFlightRequests[requestId] == nil else {
            debugLog("Ignored duplicate in-flight requestId \(requestId).")
            return
        }

        let request = SqueezeRushBridgeRequest(requestId: requestId, action: action, context: context, payload: payload)
        guard let validatedPayload = validatePayload(for: request) else {
            sendInvalidRequest(
                requestId: requestId,
                action: action,
                context: context,
                code: "invalid_payload",
                message: "The payload is invalid for \(action.rawValue)."
            )
            return
        }

        inFlightRequests[requestId] = action
        handleAcceptedRequest(request, payload: validatedPayload)
    }

    private func validatePayload(for request: SqueezeRushBridgeRequest) -> SqueezeRushValidatedPayload? {
        switch request.action {
        case .capabilities:
            return request.payload.isEmpty ? .capabilities : nil
        case .hapticPerform:
            guard request.payload.count == 1,
                  let styleName = request.payload["style"] as? String,
                  let style = SqueezeRushHapticStyle(rawValue: styleName) else {
                return nil
            }
            return .haptic(style)
        case .sharePresent:
            guard request.payload.count == 1,
                  let text = request.payload["text"] as? String,
                  !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  text.count <= Self.maximumShareLength else {
                return nil
            }
            return .share(text)
        case .rewardedShow:
            guard request.payload.count == 1,
                  let placementName = request.payload["placement"] as? String,
                  let placement = SqueezeRushRewardedPlacement(rawValue: placementName),
                  SqueezeRushAdRequestPolicy.validateRewarded(
                    placement: placementName,
                    runId: request.context.runId,
                    resultSequence: request.context.resultSequence,
                    lifecyclePhase: request.context.lifecyclePhase
                  ) == .accepted else {
                return nil
            }
            return .rewarded(placement)
        case .interstitialShow:
            guard request.payload.count == 1,
                  let placementName = request.payload["placement"] as? String,
                  let placement = SqueezeRushInterstitialPlacement(rawValue: placementName),
                  SqueezeRushAdRequestPolicy.validateInterstitial(
                    placement: placementName,
                    runId: request.context.runId,
                    resultSequence: request.context.resultSequence,
                    lifecyclePhase: request.context.lifecyclePhase
                  ) == .accepted else {
                return nil
            }
            return .interstitial(placement)
        case .consentStatus:
            if request.payload.isEmpty {
                return .consent(.status)
            }
            guard request.payload.count == 1,
                  let operationName = request.payload["operation"] as? String,
                  let operation = SqueezeRushConsentOperation(rawValue: operationName) else {
                return nil
            }
            return .consent(operation)
        case .purchaseBuy:
            return request.payload.isEmpty ? .purchaseBuy : nil
        case .purchaseRestore:
            return request.payload.isEmpty ? .purchaseRestore : nil
        case .entitlementsRefresh:
            return request.payload.isEmpty ? .entitlementsRefresh : nil
        case .reviewRequest,
             .moreGamesOpen,
             .analyticsTrack:
            return request.payload.isEmpty ? .unavailable : nil
        }
    }

    private func handleAcceptedRequest(_ request: SqueezeRushBridgeRequest, payload: SqueezeRushValidatedPayload) {
        switch payload {
        case .capabilities:
            let currentCapabilities = capabilities
            purchaseService?.prepareProducts()
            settle(
                request,
                status: .success,
                data: currentCapabilities,
                error: nil
            )
        case .haptic(let style):
            performHaptic(style)
            settle(
                request,
                status: .success,
                data: ["performed": true, "style": style.rawValue],
                error: nil
            )
        case .share(let text):
            presentShareSheet(text: text, request: request)
        case .rewarded(let placement):
            presentRewarded(placement: placement, request: request)
        case .interstitial(let placement):
            presentInterstitial(placement: placement, request: request)
        case .consent(let operation):
            handleConsent(operation: operation, request: request)
        case .purchaseBuy:
            handlePurchase(request: request)
        case .purchaseRestore:
            handleRestore(request: request)
        case .entitlementsRefresh:
            handleEntitlementsRefresh(request: request)
        case .unavailable:
            settle(
                request,
                status: .unavailable,
                data: [:],
                error: SqueezeRushBridgeError(
                    code: "not_implemented_stage3",
                    message: "This action is reserved but unavailable during Stage 3."
                )
            )
        }
    }

    private func presentRewarded(
        placement: SqueezeRushRewardedPlacement,
        request: SqueezeRushBridgeRequest
    ) {
        guard consentService?.snapshot.canRequestAds == true else {
            settleUnavailable(request, code: "consent_not_ready")
            return
        }
        guard let adService else {
            settleUnavailable(request, code: "ad_sdk_not_ready")
            return
        }
        let adSnapshot = adService.snapshot
        guard adSnapshot.sdkInitialized else {
            settleUnavailable(request, code: "ad_sdk_not_ready")
            return
        }
        guard !adSnapshot.presentationBusy else {
            settleUnavailable(request, code: "presentation_busy")
            return
        }
        guard adSnapshot.rewardedReady else {
            settleUnavailable(request, code: "ad_not_ready")
            return
        }

        adService.showRewarded(placement: placement) { [weak self] result in
            DispatchQueue.main.async {
                self?.settleAdOperation(result, request: request, rewarded: true)
            }
        }
    }

    private func presentInterstitial(
        placement: SqueezeRushInterstitialPlacement,
        request: SqueezeRushBridgeRequest
    ) {
        guard consentService?.snapshot.canRequestAds == true else {
            settleUnavailable(request, code: "consent_not_ready")
            return
        }
        guard let adService else {
            settleUnavailable(request, code: "ad_sdk_not_ready")
            return
        }
        let adSnapshot = adService.snapshot
        guard adSnapshot.sdkInitialized else {
            settleUnavailable(request, code: "ad_sdk_not_ready")
            return
        }
        guard !adSnapshot.presentationBusy else {
            settleUnavailable(request, code: "presentation_busy")
            return
        }
        guard adSnapshot.interstitialReady else {
            settleUnavailable(request, code: "ad_not_ready")
            return
        }

        adService.showInterstitial(placement: placement) { [weak self] result in
            DispatchQueue.main.async {
                self?.settleAdOperation(result, request: request, rewarded: false)
            }
        }
    }

    private func handleConsent(
        operation: SqueezeRushConsentOperation,
        request: SqueezeRushBridgeRequest
    ) {
        guard let consentService else {
            settleUnavailable(request, code: "consent_service_unavailable")
            return
        }
        switch operation {
        case .status:
            settle(
                request,
                status: .success,
                data: Self.consentDictionary(consentService.snapshot),
                error: nil
            )
        case .presentPrivacyOptions:
            consentService.presentPrivacyOptions { [weak self] result in
                DispatchQueue.main.async {
                    guard let self else { return }
                    let status = Self.bridgeStatus(result.status)
                    self.settle(
                        request,
                        status: status,
                        data: Self.consentDictionary(result.snapshot),
                        error: status == .success ? nil : SqueezeRushBridgeError(
                            code: result.errorCode ?? "consent_operation_failed",
                            message: "The consent operation could not be completed."
                        )
                    )
                }
            }
        }
    }

    private func handlePurchase(request: SqueezeRushBridgeRequest) {
        guard let purchaseService else {
            settleUnavailable(request, code: "purchase_service_unavailable")
            return
        }
        purchaseService.purchaseRemoveAds { [weak self] result in
            self?.settlePurchaseOperation(result, request: request)
        }
    }

    private func handleRestore(request: SqueezeRushBridgeRequest) {
        guard let purchaseService else {
            settleUnavailable(request, code: "purchase_service_unavailable")
            return
        }
        purchaseService.restorePurchases { [weak self] result in
            self?.settlePurchaseOperation(result, request: request)
        }
    }

    private func handleEntitlementsRefresh(request: SqueezeRushBridgeRequest) {
        guard let purchaseService else {
            settleUnavailable(request, code: "purchase_service_unavailable")
            return
        }
        purchaseService.refreshEntitlements { [weak self] result in
            self?.settlePurchaseOperation(result, request: request)
        }
    }

    private func settlePurchaseOperation(
        _ result: SqueezeRushPurchaseOperationResult,
        request: SqueezeRushBridgeRequest
    ) {
        let status = Self.bridgeStatus(result.status)
        settle(
            request,
            status: status,
            data: Self.purchaseDictionary(result.snapshot),
            error: status == .success ? nil : SqueezeRushBridgeError(
                code: result.errorCode ?? "purchase_operation_failed",
                message: "The purchase operation could not be completed."
            )
        )
    }

    private func settleAdOperation(
        _ result: SqueezeRushAdOperationResult,
        request: SqueezeRushBridgeRequest,
        rewarded: Bool
    ) {
        var status = Self.bridgeStatus(result.status)
        var data: [String: Any] = ["placement": result.placement]
        var errorCode = result.errorCode

        if rewarded {
            let earned = result.earned == true
            data["earned"] = earned
            if status == .success {
                guard earned,
                      let rewardAmount = result.rewardAmount,
                      rewardAmount.isFinite else {
                    status = .failed
                    errorCode = "invalid_reward_result"
                    settle(
                        request,
                        status: status,
                        data: ["placement": result.placement, "earned": false],
                        error: SqueezeRushBridgeError(
                            code: errorCode ?? "invalid_reward_result",
                            message: "The rewarded ad result was invalid."
                        )
                    )
                    return
                }
                data["rewardType"] = Self.boundedRewardType(result.rewardType)
                data["rewardAmount"] = rewardAmount
            }
        }

        settle(
            request,
            status: status,
            data: data,
            error: status == .success ? nil : SqueezeRushBridgeError(
                code: errorCode ?? "ad_operation_failed",
                message: "The ad operation did not complete successfully."
            )
        )
    }

    private func settleUnavailable(_ request: SqueezeRushBridgeRequest, code: String) {
        settle(
            request,
            status: .unavailable,
            data: [:],
            error: SqueezeRushBridgeError(
                code: code,
                message: "The requested native operation is not ready."
            )
        )
    }

    private func presentShareSheet(text: String, request: SqueezeRushBridgeRequest) {
        guard shareRequestId == nil else {
            settle(
                request,
                status: .unavailable,
                data: [:],
                error: SqueezeRushBridgeError(
                    code: "share_already_presented",
                    message: "A share sheet is already active."
                )
            )
            return
        }
        guard let owner = presentationOwner,
              owner.viewIfLoaded?.window != nil,
              owner.presentedViewController == nil,
              !owner.isBeingDismissed else {
            settle(
                request,
                status: .unavailable,
                data: [:],
                error: SqueezeRushBridgeError(
                    code: "presentation_unavailable",
                    message: "The share sheet cannot be presented right now."
                )
            )
            return
        }

        let controller = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        controller.popoverPresentationController?.sourceView = owner.view
        controller.popoverPresentationController?.sourceRect = CGRect(
            x: owner.view.bounds.midX,
            y: owner.view.bounds.midY,
            width: 1,
            height: 1
        )
        shareRequestId = request.requestId
        controller.completionWithItemsHandler = { [weak self] _, completed, _, activityError in
            DispatchQueue.main.async {
                guard let self, self.shareRequestId == request.requestId else {
                    return
                }
                self.shareRequestId = nil
                if let activityError {
                    self.settle(
                        request,
                        status: .failed,
                        data: [:],
                        error: SqueezeRushBridgeError(
                            code: "share_failed",
                            message: activityError.localizedDescription
                        )
                    )
                } else if completed {
                    self.settle(request, status: .success, data: ["completed": true], error: nil)
                } else {
                    self.settle(
                        request,
                        status: .cancelled,
                        data: ["completed": false],
                        error: SqueezeRushBridgeError(
                            code: "share_cancelled",
                            message: "The share sheet was dismissed without sharing."
                        )
                    )
                }
            }
        }
        owner.present(controller, animated: true)
    }

    private func performHaptic(_ style: SqueezeRushHapticStyle) {
        switch style {
        case .success:
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.success)
        case .error:
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.error)
        case .light, .medium, .heavy:
            let feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle
            switch style {
            case .medium: feedbackStyle = .medium
            case .heavy: feedbackStyle = .heavy
            default: feedbackStyle = .light
            }
            let generator = UIImpactFeedbackGenerator(style: feedbackStyle)
            generator.prepare()
            generator.impactOccurred()
        }
    }

    private func settle(
        _ request: SqueezeRushBridgeRequest,
        status: SqueezeRushBridgeStatus,
        data: [String: Any],
        error: SqueezeRushBridgeError?
    ) {
        guard inFlightRequests.removeValue(forKey: request.requestId) != nil else {
            debugLog("Ignored repeated settlement for \(request.requestId).")
            return
        }
        sendResponse(
            requestId: request.requestId,
            action: request.action,
            status: status,
            context: request.context,
            data: data,
            error: error
        )
    }

    private func sendInvalidRequest(
        requestId: String,
        action: SqueezeRushBridgeAction,
        context: SqueezeRushBridgeContext,
        code: String,
        message: String
    ) {
        sendResponse(
            requestId: requestId,
            action: action,
            status: .invalidRequest,
            context: context,
            data: [:],
            error: SqueezeRushBridgeError(code: code, message: message)
        )
    }

    private func sendResponse(
        requestId: String,
        action: SqueezeRushBridgeAction,
        status: SqueezeRushBridgeStatus,
        context: SqueezeRushBridgeContext,
        data: [String: Any],
        error: SqueezeRushBridgeError?
    ) {
        guard let webView else {
            debugLog("Dropped response because the web view was released.")
            return
        }

        let errorValue: Any = error.map { $0.dictionary as Any } ?? NSNull()
        let response: [String: Any] = [
            "protocolVersion": Self.protocolVersion,
            "requestId": requestId,
            "action": action.rawValue,
            "status": status.rawValue,
            "context": context.dictionary,
            "data": data,
            "error": errorValue
        ]

        webView.callAsyncJavaScript(
            Self.receiverScript,
            arguments: ["response": response],
            in: nil,
            in: .page
        ) { [weak self] result in
            if case .failure(let callbackError) = result {
                self?.debugLog("Native response callback failed: \(callbackError.localizedDescription)")
            }
        }
    }

    private static func validRequestId(_ value: Any?) -> String? {
        guard let requestId = value as? String,
              !requestId.isEmpty,
              requestId.count <= maximumRequestIdLength,
              requestId.rangeOfCharacter(from: allowedRequestIdCharacters.inverted) == nil else {
            return nil
        }
        return requestId
    }

    private static func parseContext(_ value: Any?) -> SqueezeRushBridgeContext? {
        guard let dictionary = value as? [String: Any],
              Set(dictionary.keys) == Set(["runId", "resultSequence", "lifecyclePhase"]) else {
            return nil
        }

        let runId: String?
        if dictionary["runId"] is NSNull {
            runId = nil
        } else if let value = dictionary["runId"] as? String,
                  !value.isEmpty,
                  value.count <= maximumRunIdLength,
                  value.rangeOfCharacter(from: allowedRequestIdCharacters.inverted) == nil {
            runId = value
        } else {
            return nil
        }

        let resultSequence: Int?
        if dictionary["resultSequence"] is NSNull {
            resultSequence = nil
        } else if let value = integer(from: dictionary["resultSequence"]), value >= 0 {
            resultSequence = value
        } else {
            return nil
        }

        let lifecyclePhase: String?
        if dictionary["lifecyclePhase"] is NSNull {
            lifecyclePhase = nil
        } else if let value = dictionary["lifecyclePhase"] as? String,
                  allowedLifecyclePhases.contains(value) {
            lifecyclePhase = value
        } else {
            return nil
        }

        return SqueezeRushBridgeContext(
            runId: runId,
            resultSequence: resultSequence,
            lifecyclePhase: lifecyclePhase
        )
    }

    private static func integer(from value: Any?) -> Int? {
        if value is Bool {
            return nil
        }
        if let integer = value as? Int {
            return integer
        }
        guard let number = value as? NSNumber else {
            return nil
        }
        let double = number.doubleValue
        guard double.isFinite,
              double.rounded(.towardZero) == double,
              double >= Double(Int.min),
              double <= Double(Int.max) else {
            return nil
        }
        return Int(double)
    }

    private var capabilities: [String: Any] {
        let consentSnapshot = consentService?.snapshot ?? SqueezeRushConsentSnapshot(
            consentStatus: .unknown,
            canRequestAds: false,
            privacyOptionsRequired: .unknown,
            updateCompleted: false,
            formPresentationInProgress: false,
            lastErrorCode: nil,
            isUsingTestConfiguration: false
        )
        let adSnapshot = adService?.snapshot ?? SqueezeRushAdServiceSnapshot(
            adsTestMode: false,
            sdkInitialized: false,
            rewardedReady: false,
            interstitialReady: false,
            presentationBusy: false
        )
        let purchaseSnapshot = purchaseService?.snapshot ?? SqueezeRushPurchaseSnapshot(
            productAvailable: false,
            removeAdsEntitled: false,
            localizedPrice: nil,
            catalogState: .idle,
            storefrontCountryCode: nil,
            diagnosticCode: nil
        )
        return [
            "nativeBridge": true,
            "protocolVersion": Self.protocolVersion,
            "platform": "ios",
            "share": true,
            "haptics": true,
            "rewardedAds": true,
            "interstitialAds": true,
            "purchases": purchaseSnapshot.productAvailable,
            "restorePurchases": purchaseService != nil,
            "entitlements": purchaseService != nil,
            "reviewRequest": false,
            "moreGames": false,
            "analytics": false,
            "consent": true,
            "adsTestMode": adSnapshot.adsTestMode,
            "adSdkInitialized": adSnapshot.sdkInitialized,
            "canRequestAds": consentSnapshot.canRequestAds,
            "rewardedAdReady": adSnapshot.rewardedReady,
            "interstitialAdReady": adSnapshot.interstitialReady,
            "privacyOptionsRequired": consentSnapshot.privacyOptionsRequired == .required,
            "consentStatus": consentSnapshot.consentStatus.rawValue,
            "removeAdsEntitled": purchaseSnapshot.removeAdsEntitled,
            "removeAdsPrice": purchaseSnapshot.localizedPrice.map { $0 as Any } ?? NSNull(),
            "purchaseCatalogState": purchaseSnapshot.catalogState.rawValue,
            "purchaseStorefrontCountryCode": purchaseSnapshot.storefrontCountryCode.map { $0 as Any } ?? NSNull(),
            "purchaseDiagnosticCode": purchaseSnapshot.diagnosticCode.map { $0 as Any } ?? NSNull()
        ]
    }

    private static func purchaseDictionary(_ snapshot: SqueezeRushPurchaseSnapshot) -> [String: Any] {
        [
            "product": "remove_ads",
            "productAvailable": snapshot.productAvailable,
            "removeAdsEntitled": snapshot.removeAdsEntitled,
            "localizedPrice": snapshot.localizedPrice.map { $0 as Any } ?? NSNull(),
            "catalogState": snapshot.catalogState.rawValue,
            "storefrontCountryCode": snapshot.storefrontCountryCode.map { $0 as Any } ?? NSNull(),
            "diagnosticCode": snapshot.diagnosticCode.map { $0 as Any } ?? NSNull()
        ]
    }

    private static func consentDictionary(_ snapshot: SqueezeRushConsentSnapshot) -> [String: Any] {
        [
            "consentStatus": snapshot.consentStatus.rawValue,
            "canRequestAds": snapshot.canRequestAds,
            "privacyOptionsRequired": snapshot.privacyOptionsRequired.rawValue,
            "updateCompleted": snapshot.updateCompleted,
            "formPresentationInProgress": snapshot.formPresentationInProgress,
            "lastErrorCode": snapshot.lastErrorCode.map { $0 as Any } ?? NSNull(),
            "isUsingTestConfiguration": snapshot.isUsingTestConfiguration
        ]
    }

    private static func bridgeStatus(_ status: SqueezeRushAdOperationStatus) -> SqueezeRushBridgeStatus {
        switch status {
        case .success:
            return .success
        case .unavailable:
            return .unavailable
        case .cancelled:
            return .cancelled
        case .failed:
            return .failed
        }
    }

    private static func bridgeStatus(_ status: SqueezeRushPurchaseOperationStatus) -> SqueezeRushBridgeStatus {
        switch status {
        case .success:
            return .success
        case .unavailable:
            return .unavailable
        case .cancelled:
            return .cancelled
        case .failed:
            return .failed
        }
    }

    private static func boundedRewardType(_ value: String?) -> String {
        let trimmed = (value ?? "reward").trimmingCharacters(in: .whitespacesAndNewlines)
        let source = trimmed.isEmpty ? "reward" : trimmed
        return String(source.prefix(64))
    }

    private func debugLog(_ message: @autoclosure () -> String) {
        #if DEBUG
        print("[SqueezeRushNativeBridge] \(message())")
        #endif
    }
}
