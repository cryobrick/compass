# Debugging Compass on a Physical KaiOS Device

To view console logs and debug the app on a real KaiOS feature phone, use **WebIDE** (recommended) or **ADB**.

## WebIDE (Firefox)

1. Enable **Developer Mode** and **Remote Debugging** on your KaiOS device (Settings → Device → Developer).
2. Connect the device via USB. Use **File Transfer** mode, not USB Storage.
3. On your computer: open Firefox → press `Shift + F8` (or Tools → Web Developer → WebIDE).
4. In WebIDE, select your connected device.
5. Open the Compass app on the device. It should appear in WebIDE; click it to attach.
6. Open the **Console** tab in WebIDE to see logs and errors in real time.

## ADB

If you use the Android Debug Bridge (ADB) with KaiOS:

1. Install ADB and ensure the device is authorized (`adb devices`).
2. Use `adb logcat` or your KaiOS ADB setup to stream logs while the app runs.

Logs may be mixed with system output; filter by process or tag if your setup supports it.
