enum SqueezeRushRewardedPlacement: String {
    case revive
    case doubleRewards = "double_rewards"
}

enum SqueezeRushInterstitialPlacement: String {
    case runEnd = "run_end"
}

enum SqueezeRushConsentOperation: String {
    case status
    case presentPrivacyOptions
}

enum SqueezeRushConsentStatusValue: String {
    case unknown
    case required
    case notRequired = "not_required"
    case obtained
}

enum SqueezeRushPrivacyOptionsValue: String {
    case unknown
    case required
    case notRequired = "not_required"
}

enum SqueezeRushPrivacyOptionsPolicy {
    static func canPresent(requirement: SqueezeRushPrivacyOptionsValue) -> Bool {
        requirement == .required
    }
}

struct SqueezeRushConsentSnapshot {
    let consentStatus: SqueezeRushConsentStatusValue
    let canRequestAds: Bool
    let privacyOptionsRequired: SqueezeRushPrivacyOptionsValue
    let updateCompleted: Bool
    let formPresentationInProgress: Bool
    let lastErrorCode: String?
    let isUsingTestConfiguration: Bool
}

struct SqueezeRushAdServiceSnapshot {
    let adsTestMode: Bool
    let sdkInitialized: Bool
    let rewardedReady: Bool
    let interstitialReady: Bool
    let presentationBusy: Bool
}

enum SqueezeRushAdOperationStatus: String {
    case success
    case unavailable
    case cancelled
    case failed
}

struct SqueezeRushAdOperationResult {
    let status: SqueezeRushAdOperationStatus
    let placement: String
    let earned: Bool?
    let rewardType: String?
    let rewardAmount: Double?
    let errorCode: String?
}

struct SqueezeRushConsentOperationResult {
    let status: SqueezeRushAdOperationStatus
    let snapshot: SqueezeRushConsentSnapshot
    let errorCode: String?
}

protocol SqueezeRushConsentServing: AnyObject {
    var snapshot: SqueezeRushConsentSnapshot { get }
    func presentPrivacyOptions(completion: @escaping (SqueezeRushConsentOperationResult) -> Void)
}

protocol SqueezeRushAdServing: AnyObject {
    var snapshot: SqueezeRushAdServiceSnapshot { get }
    func showRewarded(
        placement: SqueezeRushRewardedPlacement,
        completion: @escaping (SqueezeRushAdOperationResult) -> Void
    )
    func showInterstitial(
        placement: SqueezeRushInterstitialPlacement,
        completion: @escaping (SqueezeRushAdOperationResult) -> Void
    )
}

enum SqueezeRushFullScreenKind: Equatable {
    case rewarded
    case interstitial
}

enum SqueezeRushAdRequestValidation: Equatable {
    case accepted
    case rejected(code: String)
}

enum SqueezeRushAdRequestPolicy {
    static func validateRewarded(
        placement: String?,
        runId: String?,
        resultSequence: Int?,
        lifecyclePhase: String?
    ) -> SqueezeRushAdRequestValidation {
        guard placement.flatMap(SqueezeRushRewardedPlacement.init(rawValue:)) != nil else {
            return .rejected(code: "invalid_placement")
        }
        guard runId != nil, resultSequence != nil, lifecyclePhase == "result_pending" else {
            return .rejected(code: "invalid_lifecycle_context")
        }
        return .accepted
    }

    static func validateInterstitial(
        placement: String?,
        runId: String?,
        resultSequence: Int?,
        lifecyclePhase: String?
    ) -> SqueezeRushAdRequestValidation {
        guard placement.flatMap(SqueezeRushInterstitialPlacement.init(rawValue:)) != nil else {
            return .rejected(code: "invalid_placement")
        }
        guard runId != nil, resultSequence != nil,
              lifecyclePhase == "result_pending" || lifecyclePhase == "finalized" else {
            return .rejected(code: "invalid_lifecycle_context")
        }
        return .accepted
    }
}

struct SqueezeRushConsentFlowState {
    private(set) var updateStarted = false
    private(set) var postRequestSnapshotPublished = false
    private(set) var updateCompletionProcessed = false
    private(set) var formPresentationInProgress = false
    private(set) var lastErrorCode: String?

    mutating func beginUpdateOnce() -> Bool {
        guard !updateStarted else { return false }
        updateStarted = true
        return true
    }

    mutating func markPostRequestSnapshotPublished() {
        guard updateStarted else { return }
        postRequestSnapshotPublished = true
    }

    mutating func completeUpdate(errorCode: String?) -> Bool? {
        guard updateStarted, postRequestSnapshotPublished, !updateCompletionProcessed else {
            return nil
        }
        updateCompletionProcessed = true
        lastErrorCode = errorCode
        return errorCode == nil
    }

    mutating func beginFormPresentation() -> Bool {
        guard !formPresentationInProgress else { return false }
        formPresentationInProgress = true
        return true
    }

    mutating func finishFormPresentation() {
        formPresentationInProgress = false
    }

    mutating func completeConsentForm(errorCode: String?) {
        finishFormPresentation()
        lastErrorCode = errorCode
    }

    mutating func completePrivacyOptions(errorCode: String?) {
        finishFormPresentation()
        lastErrorCode = errorCode
    }
}

struct SqueezeRushAdStateCoordinator {
    private(set) var canRequestAds = false
    private(set) var sdkInitializationStarted = false
    private(set) var sdkInitialized = false
    private(set) var rewardedReady = false
    private(set) var interstitialReady = false
    private(set) var activePresentation: SqueezeRushFullScreenKind?
    private(set) var isTornDown = false

    mutating func updateConsent(canRequestAds: Bool) -> Bool {
        guard !isTornDown else { return false }
        self.canRequestAds = canRequestAds
        if !canRequestAds {
            rewardedReady = false
            interstitialReady = false
            return false
        }
        guard !sdkInitializationStarted else { return false }
        sdkInitializationStarted = true
        return true
    }

    mutating func markSDKInitialized() -> Bool {
        guard !isTornDown, sdkInitializationStarted, !sdkInitialized else {
            return false
        }
        sdkInitialized = true
        return true
    }

    mutating func setRewardedReady(_ ready: Bool) {
        rewardedReady = ready && canRequestAds && sdkInitialized && !isTornDown
    }

    mutating func setInterstitialReady(_ ready: Bool) {
        interstitialReady = ready && canRequestAds && sdkInitialized && !isTornDown
    }

    mutating func beginRewardedPresentation() -> SqueezeRushAdRequestValidation {
        guard !isTornDown, canRequestAds else {
            return .rejected(code: "consent_not_ready")
        }
        guard sdkInitialized else {
            return .rejected(code: "ad_sdk_not_ready")
        }
        guard activePresentation == nil else {
            return .rejected(code: "presentation_busy")
        }
        guard rewardedReady else {
            return .rejected(code: "ad_not_ready")
        }
        rewardedReady = false
        activePresentation = .rewarded
        return .accepted
    }

    mutating func beginInterstitialPresentation() -> SqueezeRushAdRequestValidation {
        guard !isTornDown, canRequestAds else {
            return .rejected(code: "consent_not_ready")
        }
        guard sdkInitialized else {
            return .rejected(code: "ad_sdk_not_ready")
        }
        guard activePresentation == nil else {
            return .rejected(code: "presentation_busy")
        }
        guard interstitialReady else {
            return .rejected(code: "ad_not_ready")
        }
        interstitialReady = false
        activePresentation = .interstitial
        return .accepted
    }

    mutating func finishPresentation(_ kind: SqueezeRushFullScreenKind) -> Bool {
        guard activePresentation == kind else { return false }
        activePresentation = nil
        return canRequestAds && sdkInitialized && !isTornDown
    }

    mutating func teardown() {
        isTornDown = true
        canRequestAds = false
        rewardedReady = false
        interstitialReady = false
        activePresentation = nil
    }
}

final class SqueezeRushAdPresentationSession {
    let kind: SqueezeRushFullScreenKind
    let placement: String

    private(set) var earned = false
    private(set) var settled = false
    private var rewardType: String?
    private var rewardAmount: Double?

    init(kind: SqueezeRushFullScreenKind, placement: String) {
        self.kind = kind
        self.placement = placement
    }

    func recordEarned(type: String, amount: Double) {
        guard kind == .rewarded, !settled, !earned, amount.isFinite else { return }
        earned = true
        rewardType = type
        rewardAmount = amount
    }

    func settleAfterDismissal() -> SqueezeRushAdOperationResult? {
        guard !settled else { return nil }
        settled = true
        if kind == .interstitial {
            return SqueezeRushAdOperationResult(
                status: .success,
                placement: placement,
                earned: nil,
                rewardType: nil,
                rewardAmount: nil,
                errorCode: nil
            )
        }
        if earned {
            return SqueezeRushAdOperationResult(
                status: .success,
                placement: placement,
                earned: true,
                rewardType: rewardType,
                rewardAmount: rewardAmount,
                errorCode: nil
            )
        }
        return SqueezeRushAdOperationResult(
            status: .cancelled,
            placement: placement,
            earned: false,
            rewardType: nil,
            rewardAmount: nil,
            errorCode: "reward_not_earned"
        )
    }

    func settleFailure(code: String) -> SqueezeRushAdOperationResult? {
        guard !settled else { return nil }
        settled = true
        return SqueezeRushAdOperationResult(
            status: .failed,
            placement: placement,
            earned: kind == .rewarded ? false : nil,
            rewardType: nil,
            rewardAmount: nil,
            errorCode: code
        )
    }

    func settleTeardown() -> SqueezeRushAdOperationResult? {
        guard !settled else { return nil }
        settled = true
        return SqueezeRushAdOperationResult(
            status: .cancelled,
            placement: placement,
            earned: kind == .rewarded ? false : nil,
            rewardType: nil,
            rewardAmount: nil,
            errorCode: "ad_service_torn_down"
        )
    }
}
