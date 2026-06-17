Android & iOS native manifest snippets

Android
- Add camera permission to `android/app/src/main/AndroidManifest.xml` (inside `<manifest>`):

```xml
<!-- Allow camera access -->
<uses-permission android:name="android.permission.CAMERA" />
<!-- For Android 13+ (optional) to read images from shared storage -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

- If your app also writes to external storage on older Android versions, consider:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

- Notes:
  - Runtime permission must be requested on Android 6.0+ (handled in JS/native code). Adding the `uses-permission` entry only declares the permission to the system.
  - If using Capacitor, the manifest path is `android/app/src/main/AndroidManifest.xml`.

iOS
- Add camera usage description to `Info.plist` (inside the top-level `<dict>`):

```xml
<key>NSCameraUsageDescription</key>
<string>App needs access to your camera to attach photos to documents.</string>
```

- If your app reads photos from the user's library, also include:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>App needs access to your photo library to attach existing photos.</string>
```

- Notes:
  - iOS will display the `NS*UsageDescription` text to users when requesting permission. Provide a clear, user-facing reason.
  - For Capacitor, edit `ios/App/App/Info.plist` (or the equivalent path in your Xcode project).

Runtime permission reminders
- Always perform runtime permission checks and request flows in the app code before opening the camera or calling native camera APIs. Web browsers will prompt automatically when using `getUserMedia` or when a file input with `capture` is used, but native wrappers (Capacitor/Cordova/React Native) require explicit runtime permission handling.

Example quick checklist
- Add the manifest/plist entries above.
- On Android, request `android.permission.CAMERA` at runtime and handle denial gracefully.
- On iOS, ensure `NSCameraUsageDescription` is present and user-friendly.
- Test on real devices (Android and iOS) and use remote debugging (Chrome for Android, Safari for iOS) to capture errors.
