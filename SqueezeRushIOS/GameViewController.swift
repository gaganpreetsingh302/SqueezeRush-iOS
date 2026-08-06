import UIKit
import WebKit

private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

final class GameViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private var webView: WKWebView?
    private var nativeBridge: SqueezeRushNativeBridge?
    private var consentManager: SqueezeRushConsentManager?
    private var adManager: SqueezeRushAdManager?
    private var didStartConsentFlow = false

    override var prefersStatusBarHidden: Bool {
        true
    }

    override var prefersHomeIndicatorAutoHidden: Bool {
        true
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        let gameBackground = UIColor(red: 16 / 255, green: 17 / 255, blue: 20 / 255, alpha: 1)
        view.backgroundColor = gameBackground

        let contentController = WKUserContentController()
        contentController.add(WeakScriptMessageHandler(delegate: self), name: "SqueezeRushIOS")
        let adManager = SqueezeRushAdManager(presentationOwner: self)
        let consentManager = SqueezeRushConsentManager(presentationOwner: self)
        consentManager.onConsentStateChanged = { [weak adManager] snapshot in
            adManager?.updateConsent(canRequestAds: snapshot.canRequestAds)
        }
        let nativeBridge = SqueezeRushNativeBridge(
            presentationOwner: self,
            adService: adManager,
            consentService: consentManager
        )
        nativeBridge.register(with: contentController)
        self.adManager = adManager
        self.consentManager = consentManager
        self.nativeBridge = nativeBridge
        contentController.addUserScript(WKUserScript(
            source: Self.platformBootstrapScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        configuration.allowsInlineMediaPlayback = true

        if #available(iOS 14.0, *) {
            configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        } else {
            configuration.preferences.javaScriptEnabled = true
        }

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.backgroundColor = gameBackground
        webView.isOpaque = true
        webView.navigationDelegate = self
        webView.scrollView.backgroundColor = gameBackground
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(webView)
        self.webView = webView
        nativeBridge.attach(to: webView)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        loadGame(in: webView)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !didStartConsentFlow else { return }
        didStartConsentFlow = true
        consentManager?.requestConsentUpdateOncePerLaunch()
    }

    deinit {
        nativeBridge?.detach()
        consentManager?.teardown()
        adManager?.teardown()
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "SqueezeRushIOS")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "SqueezeRushIOS" else {
            return
        }

        if let payload = message.body as? [String: Any],
           payload["action"] as? String == "haptic" {
            performHaptic(payload["strength"] as? String ?? "light")
            return
        }

        if let payload = message.body as? [String: Any],
           payload["action"] as? String == "share",
           let text = payload["text"] as? String {
            presentShareSheet(text: text)
            return
        }

        if let text = message.body as? String {
            presentShareSheet(text: text)
        }
    }

    private func loadGame(in webView: WKWebView) {
        guard let webRoot = Bundle.main.resourceURL?.appendingPathComponent("Web", isDirectory: true) else {
            showLoadError()
            return
        }

        let indexURL = webRoot.appendingPathComponent("index.html")
        webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
    }

    private func presentShareSheet(text: String) {
        let controller = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        controller.popoverPresentationController?.sourceView = view
        controller.popoverPresentationController?.sourceRect = CGRect(
            x: view.bounds.midX,
            y: view.bounds.midY,
            width: 1,
            height: 1
        )
        present(controller, animated: true)
    }

    private func performHaptic(_ strength: String) {
        if strength == "success" {
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.success)
            return
        }
        if strength == "error" {
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.error)
            return
        }
        let style: UIImpactFeedbackGenerator.FeedbackStyle
        switch strength {
        case "heavy": style = .heavy
        case "medium": style = .medium
        default: style = .light
        }
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.prepare()
        generator.impactOccurred()
    }

    private func showLoadError() {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Squeeze Rush could not load."
        label.textAlignment = .center
        label.textColor = .white
        label.font = .preferredFont(forTextStyle: .headline)
        view.addSubview(label)

        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    private static let platformBootstrapScript = """
    document.documentElement.classList.add("ios-app");
    window.SqueezeRushIOS = {
      share: function(text) {
        window.webkit.messageHandlers.SqueezeRushIOS.postMessage({
          action: "share",
          text: String(text || "")
        });
      },
      haptic: function(strength) {
        window.webkit.messageHandlers.SqueezeRushIOS.postMessage({
          action: "haptic",
          strength: String(strength || "light")
        });
      }
    };
    var squeezeRushNativeVibrate = function(pattern) {
      var values = Array.isArray(pattern) ? pattern : [pattern];
      var duration = values.reduce(function(maximum, value) {
        var number = Number(value) || 0;
        return number > maximum ? number : maximum;
      }, 0);
      window.SqueezeRushIOS.haptic(duration >= 50 ? "heavy" : duration >= 25 ? "medium" : "light");
      return true;
    };
    try {
      Object.defineProperty(window.navigator, "vibrate", { configurable: true, value: squeezeRushNativeVibrate });
    } catch (error) {
      try { window.navigator.vibrate = squeezeRushNativeVibrate; } catch (ignored) {}
    }
    """
}
