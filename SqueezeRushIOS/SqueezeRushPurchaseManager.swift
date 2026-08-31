import Foundation
import StoreKit

enum SqueezeRushPurchaseOperationStatus {
    case success
    case unavailable
    case cancelled
    case failed
}

enum SqueezeRushPurchaseCatalogState: String {
    case idle
    case loading
    case ready
    case empty
    case failed
    case misconfigured
}

struct SqueezeRushPurchaseSnapshot {
    let productAvailable: Bool
    let removeAdsEntitled: Bool
    let localizedPrice: String?
    let catalogState: SqueezeRushPurchaseCatalogState
    let storefrontCountryCode: String?
    let diagnosticCode: String?
}

struct SqueezeRushPurchaseOperationResult {
    let status: SqueezeRushPurchaseOperationStatus
    let snapshot: SqueezeRushPurchaseSnapshot
    let errorCode: String?
}

protocol SqueezeRushPurchaseServing: AnyObject {
    var snapshot: SqueezeRushPurchaseSnapshot { get }
    func start()
    func prepareProducts()
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
    private var catalogState: SqueezeRushPurchaseCatalogState = .idle
    private var storefrontCountryCode: String?
    private var catalogDiagnosticCode: String?
    private var transactionUpdatesTask: Task<Void, Never>?
    private var storefrontUpdatesTask: Task<Void, Never>?
    private var productLoadingTask: Task<Void, Never>?
    private var started = false

    init(bundle: Bundle = .main) {
        let configured = (bundle.object(forInfoDictionaryKey: "SqueezeRushRemoveAdsProductID") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        productID = configured.flatMap { $0.isEmpty ? nil : $0 }
        if productID == nil {
            catalogState = .misconfigured
            catalogDiagnosticCode = "missing_product_id"
        }
    }

    var snapshot: SqueezeRushPurchaseSnapshot {
        SqueezeRushPurchaseSnapshot(
            productAvailable: removeAdsProduct != nil,
            removeAdsEntitled: removeAdsEntitled,
            localizedPrice: removeAdsProduct?.displayPrice,
            catalogState: catalogState,
            storefrontCountryCode: storefrontCountryCode,
            diagnosticCode: catalogDiagnosticCode
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

        storefrontUpdatesTask = Task { [weak self] in
            for await storefront in Storefront.updates {
                guard let self else { return }
                let storefrontChanged = self.storefrontCountryCode != storefront.countryCode
                self.storefrontCountryCode = storefront.countryCode
                if storefrontChanged {
                    self.removeAdsProduct = nil
                    self.prepareProducts()
                }
            }
        }

        prepareProducts()
    }

    func prepareProducts() {
        guard productID != nil else {
            catalogState = .misconfigured
            catalogDiagnosticCode = "missing_product_id"
            return
        }
        guard removeAdsProduct == nil else {
            catalogState = .ready
            catalogDiagnosticCode = nil
            return
        }
        guard productLoadingTask == nil else { return }

        catalogState = .loading
        catalogDiagnosticCode = nil
        productLoadingTask = Task { [weak self] in
            guard let self else { return }
            await self.loadProductAndEntitlementsWithRetry()
            self.productLoadingTask = nil
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
                self.complete(
                    .unavailable,
                    code: self.catalogDiagnosticCode ?? "product_unavailable",
                    completion: completion
                )
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
                self.complete(
                    .failed,
                    code: Self.diagnosticCode(for: error, prefix: "purchase"),
                    completion: completion
                )
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
                _ = await self.loadProductWithRetry(
                    delaysNanoseconds: Self.purchaseProductRetryDelaysNanoseconds
                )
            }
            self.complete(.success, code: nil, completion: completion)
        }
    }

    func teardown() {
        transactionUpdatesTask?.cancel()
        transactionUpdatesTask = nil
        storefrontUpdatesTask?.cancel()
        storefrontUpdatesTask = nil
        productLoadingTask?.cancel()
        productLoadingTask = nil
        started = false
    }

    private func loadProductAndEntitlementsWithRetry() async {
        await reloadEntitlements()
        _ = await loadProductWithRetry(delaysNanoseconds: Self.startupProductRetryDelaysNanoseconds)
    }

    private func loadProductWithRetry(delaysNanoseconds: [UInt64]) async -> Product? {
        guard let productID else {
            catalogState = .misconfigured
            catalogDiagnosticCode = "missing_product_id"
            return nil
        }
        if let removeAdsProduct { return removeAdsProduct }

        if let storefront = await Storefront.current {
            storefrontCountryCode = storefront.countryCode
        }

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
                catalogState = .loading
                let products = try await Product.products(for: [productID])
                if let product = products.first(where: { $0.id == productID }) {
                    removeAdsProduct = product
                    catalogState = .ready
                    catalogDiagnosticCode = nil
                    return product
                }
                catalogState = .empty
                catalogDiagnosticCode = "catalog_empty"
            } catch {
                catalogState = .failed
                catalogDiagnosticCode = Self.diagnosticCode(for: error, prefix: "catalog")
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

    private static func diagnosticCode(for error: Error, prefix: String) -> String {
        let nsError = error as NSError
        let normalizedDomain = nsError.domain
            .lowercased()
            .map { character in
                character.isLetter || character.isNumber ? character : "_"
            }
        let boundedDomain = String(normalizedDomain.prefix(48))
        return "\(prefix)_\(boundedDomain)_\(nsError.code)"
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
