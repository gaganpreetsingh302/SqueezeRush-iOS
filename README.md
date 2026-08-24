# Squeeze Rush iOS

This is the clean revision 2.0.0 native iOS project for Squeeze Rush. It loads the bundled game from `SqueezeRushIOS/Web` in a fullscreen `WKWebView`, uses a storyboard-free launch screen, pauses safely while backgrounded, and routes sharing and haptics through native iOS APIs.

## Open and Run

1. Move or clone this folder onto a Mac with Xcode installed.
2. Open `SqueezeRushIOS.xcodeproj`.
3. Select the `SqueezeRushIOS` scheme.
4. In the target Signing & Capabilities tab, select your Apple Developer Team.
5. Confirm the bundle identifier is `com.kasiga.squeezerush`.
6. Run on an iPhone simulator or connected iPhone.

## Without Owning a Mac

You still need Apple's iOS build toolchain, but you do not necessarily need to own a Mac. The practical no-Mac path is to push this project to a Git repository and build it with Xcode Cloud or another hosted macOS CI service. Xcode Cloud is built into App Store Connect and can create App Store/TestFlight builds from your repository after a workflow is configured.

Use `XCODE_CLOUD_SETUP.md` for the exact App Store Connect and workflow settings.

## App Store Build

1. Confirm the final bundle identifier before creating the App Store Connect app record.
2. Set the marketing version and build number in the target settings.
3. Choose Product > Archive in Xcode.
4. Use Organizer > Distribute App > App Store Connect to upload.
5. Submit the uploaded build through App Store Connect after metadata, screenshots, age rating, privacy details, and review notes are complete.

## Revision Identity

- Marketing version: `2.0.0`
- Build: `3`
- Bundle identifier: `com.kasiga.squeezerush`
- Canonical web source on the Windows workstation: `D:\Games\Squeeze rush\SqueezeRush\SqueezeRush`
- Privacy manifest: generated into the built app by the `Generate Privacy Manifest` build phase
- Launch screen: `UILaunchScreen` in `Info.plist`; no storyboard file is required

## Store Metadata Needed

- App name: Squeeze Rush
- Subtitle
- Promotional text
- Short and full descriptions
- Support URL
- Privacy policy URL
- Support email
- Screenshots for required iPhone sizes
- App privacy answers
- Age rating answers
- Copyright owner
- Review notes
