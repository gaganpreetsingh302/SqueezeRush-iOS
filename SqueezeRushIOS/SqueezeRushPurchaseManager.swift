import Foundation
import StoreKit

enum SqueezeRushPurchaseOperationStatus {
    case success
    case unavailable
    case cancelled
    case failed
}

struct SqueezeRushPurchaseSnapshot {
    let productAvailable: Bool
    let removeAdsEntitled: Bool
    let localizedPrice: String?
}

struct SqueezeRushPurchaseOperationResult {
    let status: SqueezeRushPurchaseOperationStatus
    let snapshot: SqueezeRushPurchaseSnapshot
    let errorCode: String?
}

protocol SqueezeRushPurchaseServing: AnyObject {
    var snapshot: SqueezeRushPurchaseSnapshot { get }
    func start()
    func purchaseRemoveAds(completion: @escaping (SqueezeRushPurchaseOperationResult) -> Void)
    func restorePurchases(completion: @escaping (SqueezeRushPurchaseOperationResult) -> Void)
    func refreshEntitlements(completion: @escaping (SqueezeRushPurchaseOperationResult) -> Void)
    func teardown()
}

final class SqueezeRushPurchaseManager: SqueezeRushPurchaseServing {
    private static let startupProductRetryDelaysNanoseconds: [UInt64] = [
        0,
        400_000_000,
        900_000_000,
        1_800_000_000,
        3_600_000_000,
        7_200_000_000
    ]
    private static let purchaseProductRetryDelaysNanoseconds: [UInt64] = [
        0,
        750_000_000,
        2_000_000_000
    ]

    private let productID: String?
    private var removeAdsProduct: Product?
    private var removeAdsEntitled = false
    private var transactionUpdatesTask: Task<Void, Never>?
    private var productLoadingTask: Task<Void, Never>?
    private var started = false

    init(bundle: Bundle = .main) {
        let configured = (bundle.object(forInfoDictionaryKey: "SqueezeRushRemoveAdsProductID") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        productID = configured.flatMap { $0.isEmpty ? nil : $0 }
    }

    var snapshot: SqueezeRushPurchaseSnapshot {
        SqueezeRushPurchaseSnapshot(
            productAvailable: removeAdsProduct != nil,
            removeAdsEntitled: removeAdsEntitled,
            localizedPrice: removeAdsProduct?.displayPrice
        )
    }

    func start() {
        guard !started else { return }
        started = true

        transactionUpdatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                guard case .verified(let transaction) = result else { continue }
                await transaction.finish()
                await self.reloadEntitlements()
            }
        }

        productLoadingTask = Task { [weak self] in
            await self?.loadProductAndEntitlementsWithRetry()
        }
    }

    func purchaseRemoveAds(completion: @escaping (SqueezeRushPurchaseOperationResult) -> Void) {
        Task { [weak self] in
            guard let self else { return }

            var product = self.removeAdsProduct
            if product == nil {
                product = await self.loadProductWithRetry(
                    delaysNanoseconds: Self.purchaseProductRetryDelaysNanoseconds
                )
            }
            guard let product else {
                self.complete(.unavailable, code: "product_unavailable", completion: completion)
                return
            }

            do {
                let purchaseResult = try await product.purchase()
                switch purchaseResult {
                case .success(let verification):
                    guard case .verified(let transaction) = verification,
                          transaction.productID == self.productID else {
                        self.complete(.failed, code: "transaction_unverified", completion: completion)
                        return
                    }
                    await transaction.finish()
                    await self.reloadEntitlements()
                    self.complete(.success, code: nil, completion: completion)
                case .pending:
                    self.complete(.unavailable, code: "purchase_pending", completion: completion)
                case .userCancelled:
                    self.complete(.cancelled, code: "user_cancelled", completion: completion)
                @unknown default:
                    self.complete(.failed, code: "unknown_purchase_result", completion: completion)
                }
            } catch {
                self.complete(.failed, code: "purchase_failed", completion: completion)
            }
        }
    }

    func restorePurchases(completion: @escaping (SqueezeRushPurchaseOperationResult) -> Void) {
        Task { [weak self] in
            guard let self else { return }
            do {
                try await AppStore.sync()
                await self.reloadEntitlements()
                self.complete(.success, code: nil, completion: completion)
            } catch {
                self.complete(.failed, code: "restore_failed", completion: completion)
            }
        }
    }

    func refreshEntitlements(completion: @escaping (SqueezeRushPurchaseOperationResult) -> Void) {
        Task { [weak self] in
            guard let self else { return }
            await self.reloadEntitlements()
            if self.removeAdsProduct == nil {
                _ = await self.loadProductWithRetry(delaysNanoseconds: [0])
            }
            self.complete(.success, code: nil, completion: completion)
        }
    }

    func teardown() {
        transactionUpdatesTask?.cancel()
        transactionUpdatesTask = nil
        productLoadingTask?.cancel()
        productLoadingTask = nil
        started = false
    }

    private func loadProductAndEntitlementsWithRetry() async {
        await reloadEntitlements()
        _ = await loadProductWithRetry(delaysNanoseconds: Self.startupProductRetryDelaysNanoseconds)
    }

    private func loadProductWithRetry(delaysNanoseconds: [UInt64]) async -> Product? {
        guard let productID else { return nil }
        if let removeAdsProduct { return removeAdsProduct }

        for delay in delaysNanoseconds {
            guard !Task.isCancelled else { return removeAdsProduct }
            if delay > 0 {
                do {
                    try await Task.sleep(nanoseconds: delay)
                } catch {
                    return removeAdsProduct
                }
            }

            do {
                let products = try await Product.products(for: [productID])
                if let product = products.first(where: { $0.id == productID }) {
                    removeAdsProduct = product
                    return product
                }
            } catch {
                // StoreKit may briefly return an error while the storefront starts.
            }
        }

        return removeAdsProduct
    }

    private func reloadEntitlements() async {
        guard let productID else {
            removeAdsEntitled = false
            return
        }

        var entitled = false
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result,
                  transaction.productID == productID,
                  transaction.revocationDate == nil else {
                continue
            }
            entitled = true
        }
        removeAdsEntitled = entitled
    }

    private func complete(
        _ status: SqueezeRushPurchaseOperationStatus,
        code: String?,
        completion: @escaping (SqueezeRushPurchaseOperationResult) -> Void
    ) {
        let result = SqueezeRushPurchaseOperationResult(status: status, snapshot: snapshot, errorCode: code)
        DispatchQueue.main.async {
            completion(result)
        }
    }
}
