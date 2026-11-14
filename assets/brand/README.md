# Groupify launch exports

`groupify-mark.svg` is the existing approved helmet-and-road mark. It remains
unchanged. The PNG files are size/format exports of its exact paths/colors:

| Asset | Format | Use |
| --- | --- | --- |
| groupify-app-icon.png | 1024×1024 RGB, opaque white | Default/legacy and iOS PNG icon |
| groupify-adaptive-foreground.png | 1024×1024 RGBA, transparent | Android adaptive foreground and its alpha-based monochrome layer |
| groupify-splash-mark.png | 1024×1024 RGBA, transparent | Light splash mark, configured at 160 logical pixels |
| groupify-favicon.png | 48×48 RGB, opaque white | Web favicon |

The adaptive export renders the source's 128-unit canvas into 600 pixels centered
on a 1024-pixel canvas. Every visible alpha pixel is inside the conservative
central 66dp-diameter circle of Android's 108dp canvas; measured farthest pixel is
291.4px versus 312.89px safe radius. Android's themed layer uses the same artwork's
alpha, with system coloring rather than a different brand design. Actual launcher
masks, themed appearance and Android 12+ splash behavior still need device checks.
No app dark mode is enabled.

Regenerate with `node scripts/export-launch-assets.cjs` from the repository root.
Prerequisites are the pinned Node, Playwright with Chromium, and ImageMagick for
opaque PNG encoding. They are developer export tools, not new app dependencies;
checked-in exports require none of them to install/test/bundle the app. With an
existing external tool installation, set `GROUPIFY_PLAYWRIGHT_MODULE`,
`GROUPIFY_CHROMIUM_PATH` and optionally `GROUPIFY_IMAGE_CONVERTER`. In an isolated
container that requires Chromium's no-sandbox flag, opt in with
`GROUPIFY_EXPORT_NO_SANDBOX=1`; it is not the default.

The browser rasterizes the exact SVG. ImageMagick strips the already-opaque alpha
channel from icon/favicon PNGs so they are RGB; it does not need an SVG delegate.
The exporter checks image sizes, PNG color types and the adaptive safe circle.
Local toolchain: Node26.13.0, Playwright1.57.0, Chromium156.0.8078.79. Two exports
with this toolchain produced identical bytes for all four files; renderer/version
changes may produce different anti-aliasing. The source vector stays authoritative.

The app name/config now use Groupify and these assets. The previous starter files
are retained unchanged, with no active launch references to them. A temporary
Expo Android prebuild using an explicit fixture application ID generated and
validated 25 launcher/splash PNG/WebP resources, expected adaptive XML and light
colors/name. No root native project, APK, production package identifier, signing,
deployment or physical-device validation is implied. See
[implementation status](../../docs/05-development/implementation-status.md).
