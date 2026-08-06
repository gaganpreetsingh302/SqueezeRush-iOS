import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = GameViewController()
        window.backgroundColor = UIColor(red: 16 / 255, green: 17 / 255, blue: 20 / 255, alpha: 1)
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
