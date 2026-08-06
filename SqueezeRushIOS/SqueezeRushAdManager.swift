import Foundation
import GoogleMobileAds
import UIKit

struct SqueezeRushAdConfiguration {
    let rewardedAdUnitID: String
    let interstitialAdUnitID: String
    let isTestMode: Bool

    static func fromBundle(_ bundle: Bundle = .main) -> SqueezeRushAdConfiguration? {
        guard let rewarded = bundle.object(forInfoDictionaryKey: "SqueezeRushRewardedAdUnitID") as? String,
              let interstitial = bundle.object(forInfoDictionaryKey: "SqueezeRushInterstitialAdUnitID") as? String else {
            return nil
        }

        let trimmedRewarded = rewarded.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedInterstitial = interstitial.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedRewarded.isEmpty, !trimmedInterstitial.isEmpty else {
            return nil
        }

        #if DEBUG
        let isTestMode = trimmedRewarded.contains("3940256099942544") &&
            trimmedInterstitial.contains("3940256099942544")
        #else
        let isTestMode = false
        #endif

        return SqueezeRushAdConfiguration(
            rewardedAdUnitID: trimmedRewarded,
            interstitialAdUnitID: trimmedInterstitial,
            isTestMode: isTestMode
        )
    }
}

final class SqueezeRushAdManager: NSObject, SqueezeRushAdServing, FullScreenContentDelegate {
    private weak var presentationOwner: UIViewController?
    private let configuration: SqueezeRushAdConfiguration?
    private var coordinator = SqueezeRushAdStateCoordinator()
    private var rewardedAd: RewardedAd?
    private var interstitialAd: InterstitialAd?
    private var rewardedLoadInProgress = false
    private var interstitialLoadInProgress = false
    private var activeSession: SqueezeRushAdPresentationSession?
    private var activeCompletion: ((SqueezeRushAdOperationResult) -> Void)?

    init(
        presentationOwner: UIViewController,
        configuration: SqueezeRushAdConfiguration? = SqueezeRushAdConfiguration.fromBundle()
    ) {
        self.presentationOwner = presentationOwner
        self.configuration = configuration
        super.init()
    }

    var snapshot: SqueezeRushAdServiceSnapshot {
        SqueezeRushAdServiceSnapshot(
            adsTestMode: configuration?.isTestMode ?? false,
            sdkInitialized: coordinator.sdkInitialized,
            rewardedReady: coordinator.rewardedReady,
            interstitialReady: coordinator.interstitialReady,
            presentationBusy: coordinator.activePresentation != nil
        )
    }

    func updateConsent(canRequestAds: Bool) {
        runOnMain { [weak self] in
            guard let self else { return }
            guard self.configuration != nil else {
                self.debugLog("Ad configuration is unavailable; SDK start remains blocked.")
                return
            }

            let shouldStart = self.coordinator.updateConsent(canRequestAds: canRequestAds)
            guard canRequestAds else {
                self.rewardedAd?.fullScreenContentDelegate = nil
                self.interstitialAd?.fullScreenContentDelegate = nil
                self.rewardedAd = nil
                self.interstitialAd = nil
                return
            }

            if shouldStart {
                self.startSDKOnce()
            }
            else if self.coordinator.sdkInitialized {
                self.preloadAdsIfAllowed()
            }
        }
    }

    func showRewarded(
        placement: SqueezeRushRewardedPlacement,
        completion: @escaping (SqueezeRushAdOperationResult) -> Void
    ) {
        runOnMain { [weak self] in
            guard let self else {
                completion(Self.unavailable(placement: placement.rawValue, code: "ad_service_unavailable", rewarded: true))
                return
            }
            guard let owner = self.presentationOwner,
                  owner.viewIfLoaded?.window != nil,
                  owner.presentedViewController == nil else {
                completion(Self.unavailable(placement: placement.rawValue, code: "presentation_busy", rewarded: true))
                return
            }

            switch self.coordinator.beginRewardedPresentation() {
            case .accepted:
                break
            case .rejected(let code):
                completion(Self.unavailable(placement: placement.rawValue, code: code, rewarded: true))
                return
            }

            guard let ad = self.rewardedAd else {
                _ = self.coordinator.finishPresentation(.rewarded)
                completion(Self.unavailable(placement: placement.rawValue, code: "ad_not_ready", rewarded: true))
                self.scheduleReload(for: .rewarded)
                return
            }

            self.rewardedAd = nil
            let session = SqueezeRushAdPresentationSession(kind: .rewarded, placement: placement.rawValue)
            self.activeSession = session
            self.activeCompletion = completion
            ad.fullScreenContentDelegate = self
            let rewardType = ad.adReward.type
            let rewardAmount = ad.adReward.amount.doubleValue
            ad.present(from: owner) { [weak self] in
                self?.activeSession?.recordEarned(type: rewardType, amount: rewardAmount)
            }
        }
    }

    func showInterstitial(
        placement: SqueezeRushInterstitialPlacement,
        completion: @escaping (SqueezeRushAdOperationResult) -> Void
    ) {
        runOnMain { [weak self] in
            guard let self else {
                completion(Self.unavailable(placement: placement.rawValue, code: "ad_service_unavailable", rewarded: false))
                return
            }
            guard let owner = self.presentationOwner,
                  owner.viewIfLoaded?.window != nil,
                  owner.presentedViewController == nil else {
                completion(Self.unavailable(placement: placement.rawValue, code: "presentation_busy", rewarded: false))
                return
            }

            switch self.coordinator.beginInterstitialPresentation() {
            case .accepted:
                break
            case .rejected(let code):
                completion(Self.unavailable(placement: placement.rawValue, code: code, rewarded: false))
                return
            }

            guard let ad = self.interstitialAd else {
                _ = self.coordinator.finishPresentation(.interstitial)
                completion(Self.unavailable(placement: placement.rawValue, code: "ad_not_ready", rewarded: false))
                self.scheduleReload(for: .interstitial)
                return
            }

            self.interstitialAd = nil
            self.activeSession = SqueezeRushAdPresentationSession(
                kind: .interstitial,
                placement: placement.rawValue
            )
            self.activeCompletion = completion
            ad.fullScreenContentDelegate = self
            ad.present(from: owner)
        }
    }

    func ad(
        _ ad: FullScreenPresentingAd,
        didFailToPresentFullScreenContentWithError error: Error
    ) {
        runOnMain { [weak self] in
            guard let self, let session = self.activeSession else { return }
            let result = session.settleFailure(code: Self.normalizedErrorCode(prefix: "ad_present", error: error))
            self.completeActivePresentation(with: result)
        }
    }

    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        runOnMain { [weak self] in
            guard let self, let session = self.activeSession else { return }
            self.completeActivePresentation(with: session.settleAfterDismissal())
        }
    }

    func teardown() {
        runOnMain { [weak self] in
            guard let self else { return }
            self.rewardedAd?.fullScreenContentDelegate = nil
            self.interstitialAd?.fullScreenContentDelegate = nil
            self.rewardedAd = nil
            self.interstitialAd = nil
            let teardownResult = self.activeSession?.settleTeardown()
            let completion = self.activeCompletion
            self.activeSession = nil
            self.activeCompletion = nil
            self.coordinator.teardown()
            if let teardownResult {
                completion?(teardownResult)
            }
            self.presentationOwner = nil
        }
    }

    private func startSDKOnce() {
        guard configuration != nil else { return }
        MobileAds.shared.requestConfiguration.setPublisherFirstPartyIDEnabled(false)
        MobileAds.shared.start { [weak self] _ in
            DispatchQueue.main.async {
                guard let self, self.coordinator.markSDKInitialized() else { return }
                self.preloadAdsIfAllowed()
            }
        }
    }

    private func preloadAdsIfAllowed() {
        guard coordinator.canRequestAds, coordinator.sdkInitialized, !coordinator.isTornDown else { return }
        loadRewardedIfNeeded()
        loadInterstitialIfNeeded()
    }

    private func loadRewardedIfNeeded() {
        guard let configuration,
              rewardedAd == nil,
              !rewardedLoadInProgress,
              coordinator.canRequestAds,
              coordinator.sdkInitialized,
              !coordinator.isTornDown else { return }

        rewardedLoadInProgress = true
        RewardedAd.load(with: configuration.rewardedAdUnitID, request: Request()) { [weak self] ad, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.rewardedLoadInProgress = false
                guard self.coordinator.canRequestAds,
                      self.coordinator.sdkInitialized,
                      !self.coordinator.isTornDown else {
                    self.rewardedAd = nil
                    self.coordinator.setRewardedReady(false)
                    return
                }
                if let error {
                    self.rewardedAd = nil
                    self.coordinator.setRewardedReady(false)
                    self.debugLog(Self.normalizedErrorCode(prefix: "rewarded_load", error: error))
                    return
                }
                self.rewardedAd = ad
                self.rewardedAd?.fullScreenContentDelegate = self
                self.coordinator.setRewardedReady(ad != nil)
            }
        }
    }

    private func loadInterstitialIfNeeded() {
        guard let configuration,
              interstitialAd == nil,
              !interstitialLoadInProgress,
              coordinator.canRequestAds,
              coordinator.sdkInitialized,
              !coordinator.isTornDown else { return }

        interstitialLoadInProgress = true
        InterstitialAd.load(with: configuration.interstitialAdUnitID, request: Request()) { [weak self] ad, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.interstitialLoadInProgress = false
                guard self.coordinator.canRequestAds,
                      self.coordinator.sdkInitialized,
                      !self.coordinator.isTornDown else {
                    self.interstitialAd = nil
                    self.coordinator.setInterstitialReady(false)
                    return
                }
                if let error {
                    self.interstitialAd = nil
                    self.coordinator.setInterstitialReady(false)
                    self.debugLog(Self.normalizedErrorCode(prefix: "interstitial_load", error: error))
                    return
                }
                self.interstitialAd = ad
                self.interstitialAd?.fullScreenContentDelegate = self
                self.coordinator.setInterstitialReady(ad != nil)
            }
        }
    }

    private func completeActivePresentation(with result: SqueezeRushAdOperationResult?) {
        guard let session = activeSession else { return }
        let completion = activeCompletion
        activeSession = nil
        activeCompletion = nil
        let shouldReload = coordinator.finishPresentation(session.kind)
        if let result {
            completion?(result)
        }
        if shouldReload {
            scheduleReload(for: session.kind)
        }
    }

    private func scheduleReload(for kind: SqueezeRushFullScreenKind) {
        DispatchQueue.main.async { [weak self] in
            guard let self,
                  self.coordinator.canRequestAds,
                  self.coordinator.sdkInitialized,
                  !self.coordinator.isTornDown else { return }
            switch kind {
            case .rewarded:
                self.loadRewardedIfNeeded()
            case .interstitial:
                self.loadInterstitialIfNeeded()
            }
        }
    }

    private static func unavailable(
        placement: String,
        code: String,
        rewarded: Bool
    ) -> SqueezeRushAdOperationResult {
        SqueezeRushAdOperationResult(
            status: .unavailable,
            placement: placement,
            earned: rewarded ? false : nil,
            rewardType: nil,
            rewardAmount: nil,
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

    private func debugLog(_ message: @autoclosure () -> String) {
        #if DEBUG
        print("[SqueezeRushAdManager] \(message())")
        #endif
    }
}
