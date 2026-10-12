import UIKit
import Capacitor
import AVFAudio

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        return true
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

class NorthlineViewController: CAPBridgeViewController {
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if #available(iOS 16.4, *) { webView?.isInspectable = true }
        #if DEBUG && NORTHLINE_QA
        startNativeQA()
        #endif
    }
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.scrollView.isScrollEnabled = false
        webView?.scrollView.bounces = false
    }
    #if DEBUG && NORTHLINE_QA
    private var qaTimer: Timer?
    private var qaCommand: String?
    private var qaBusy = false
    func startNativeQA() {
        guard qaTimer == nil else { return }
        qaTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.nativeQATick() }
    }
    private func nativeQATick() {
        guard !qaBusy, let view = webView else { return }
        let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let commandURL = folder.appendingPathComponent("northline-qa-command.json")
        guard let data = try? Data(contentsOf: commandURL),
              let request = (try? JSONSerialization.jsonObject(with: data)) as? [String: String],
              let id = request["id"], id != qaCommand,
              let code = request["code"] else { return }
        qaCommand = id
        qaBusy = true
        view.evaluateJavaScript(code) { [weak self] value, error in
            let response: [String: Any] = ["id": id, "value": value ?? NSNull(), "error": error?.localizedDescription ?? ""]
            if let payload = try? JSONSerialization.data(withJSONObject: response) {
                try? payload.write(to: folder.appendingPathComponent("northline-qa-response.json"), options: .atomic)
            }
            self?.qaBusy = false
        }
    }
    #endif

}
