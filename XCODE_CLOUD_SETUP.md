# Xcode Cloud Setup

Use this checklist after pushing `SqueezeRushIOS` to a Git repository.

## App Store Connect App Record

1. Sign in to App Store Connect.
2. Create a new app record.
3. Use these values:
   - Platform: iOS
   - Name: Squeeze Rush
   - Primary language: English
   - Bundle ID: `com.kasiga.squeezerush`
   - SKU: `loop-bloom-ios`
   - User Access: Full Access

If `com.kasiga.squeezerush` is not available in the Bundle ID dropdown, create it first in Certificates, Identifiers & Profiles.

## Xcode Cloud Workflow

1. Open the Squeeze Rush app record in App Store Connect.
2. Go to Xcode Cloud.
3. Connect the Git repository that contains this folder.
4. Create a workflow with these values:
   - Product: SqueezeRushIOS
   - Scheme: SqueezeRushIOS
   - Branch: main
   - Environment: Latest available Xcode and iOS SDK
   - Action: Archive
   - Distribution: TestFlight
5. Let Xcode Cloud manage signing automatically using the Apple Developer team.
6. Start the first build manually.

## After the First Build

1. Wait for the build to process in App Store Connect.
2. Add yourself as an internal TestFlight tester.
3. Install the TestFlight build on an iPhone and verify:
   - The dark launch artwork hands off cleanly to the Squeeze Rush menu.
   - Daily Bloom, Level Run, and Speed Seeds start correctly.
   - Tile rotation, Undo, Hint, Reset, completion, and Next Puzzle work.
   - The timer pauses while the app is backgrounded and resumes without a jump.
   - Native haptics and the share sheet respond.
   - Daily records, speed records, and level progress persist after relaunching.

## Required Before App Review

- Add Squeeze Rush to `https://gsingh302.github.io/kasiga-app-support/` with a dedicated privacy-policy page.
- Complete the Squeeze Rush version metadata, review contact, copyright, and support URL.
- Confirm the **Generate Privacy Manifest** build phase creates `PrivacyInfo.xcprivacy` in the archived app bundle.
- Complete the current age-rating questionnaire and App Privacy declaration from the final build.
- Upload 10 prepared 1290 x 2796 iPhone screenshots in filename order.
- Run a physical-iPhone TestFlight pass before selecting the build for review.
