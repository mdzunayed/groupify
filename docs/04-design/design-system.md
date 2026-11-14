# Groupify design system

## Direction and status

The owner selected the helmet-and-road identity and Inter typography from the checked-in [design-system reference](../../design/design-system-ref.png). The [app reference](../../design/app-design-ref.png) remains a screen-layout reference where it agrees with approved product behavior; it does not override the tap-again PTT interaction or active-ride location boundaries.

The [vector mark](../../assets/brand/groupify-mark.svg) and [light-theme tokens](../../src/theme/tokens.ts) are implemented increments in review. The app renders the vector through Expo Image and uses its exact [launch exports](../../assets/brand/README.md). Bundled Inter weights (300–800) load with Expo Font before the authenticated navigator mounts; startup exposes loading and font-error states. Named font families are used explicitly because platform font-weight resolution differs. Shared buttons/fields/notices, protected navigation, home and text-profile editing are integrated; remaining component coverage and device accessibility still need work. The app and JavaScript intro use the approved light direction; the photo onboarding keeps contrasting white copy. No app dark mode is implemented or approved.

## Light-theme tokens

The token file is the source of truth for the brand blue, text, surfaces, borders, feedback colors, spacing, corner radii, and typography scale. Feedback colors use readable text/surface pairs rather than relying on color alone. The automated contrast check covers the listed normal-text pairs at a minimum 4.5:1 ratio; component-level contrast, focus, screen-reader labels, touch targets, and dynamic text still need verification when components are built.

Spacing follows 4, 8, 12, 16, 24, 32, and 40 points. Heading sizes are 32/40, 24/32, and 20/28; body sizes are 16/24 and 14/20; caption is 12/16. Values are font-size/line-height in points. Use meaningful labels and text alongside status color or icons.

## Remaining P3 work

- Validate Inter, vector/launch assets and actual controls on Android, including offline startup, large text, native keyboard, launcher masks/splash and TalkBack. Browser checks do not establish these behaviors.
- Complete remaining cards, chips, dialogs, map controls and ride-status elements as their actual feature contracts become implementable. Existing buttons, fields and notices already cover auth/home/profile; do not add inert controls or fictional data to imply unfinished capabilities.
- Validate accessibility and contrast on representative screens and Android devices. Do not present sample ride or location data as live information.
- Record the approved navigation, native implementation, and any later dark-mode decision before relying on them.

## Shared button

`src/components/Button.tsx` provides primary and text variants. Pass a visible `label`, an `onPress` handler and optional `disabled`, `loading`, `loadingLabel` and layout `style`. Loading disables interaction and reports busy/disabled accessibility states while keeping a readable label beside the spinner. The component uses Inter and theme colors, has a minimum 48-point target and grows vertically with text. Callers own request deduplication, errors and authorization; the component does not infer request success. Send OTP, verify OTP and sign-out use this component. Native focus, TalkBack announcements and enlarged text remain device checks.

## Shared text field

`src/components/TextField.tsx` wraps a controlled React Native input with a persistent visible `label`, Inter body typography, and neutral, focus, disabled and optional validation-error states. `hideLabel` retains the accessibility label for the six OTP digits; the OTP group uses two rows of three so each input stays at least 48 points wide at narrow widths. Inputs have a minimum 48-point height and vertical padding rather than a fixed height. Neutral borders use the muted-text color for readable boundaries, while focus and error borders use brand and danger colors.

Pass standard `TextInput` value/change/keyboard/autocomplete properties and `editable` from the caller. `ref` points to the native input, and focus/blur callbacks are forwarded. `containerStyle` controls layout; `style` customizes the input. An optional field-specific `error` is displayed as an alert and included in the input's accessibility hint. Request-level failures stay in the form alert; a server/network failure must not automatically mark a phone number invalid. Native keyboard/autofill, TalkBack, and large-text behavior still require Android validation.

## Authentication accessibility evidence

Onboarding scrolls when content exceeds the viewport; its login text wraps and the start action grows with text. There is one onboarding page, so no page-count indicator is announced. Form titles expose heading semantics, phone fields stack vertically, and back/mode-switch/resend controls have minimum 48-point targets. Resend's disabled label states the remaining seconds; it is not a live region that announces every tick. The decorative background image is not an accessibility element.

At 320×568, normal and simulated double-size browser text passed the documented checks in [implementation status](../05-development/implementation-status.md). To repeat on Android: use default and largest font/display sizes, navigate welcome → phone → OTP, confirm every heading/control can be reached by scrolling with the keyboard open, verify no clipped labels or values, then use TalkBack to check reading order, labels, disabled/busy state and error announcements. Test both sign-in and sign-up with an authorized development identity. Browser results do not replace this device evidence.

## Shared startup and home states

`StateNotice` renders a title and message with optional `info` (default), `loading` or `error` treatment. Loading has a decorative spinner and `aria-busy`; errors expose an alert with danger text. Actions may be supplied as children, but the component never invents a retry operation. `fontsReady={false}` uses system fonts so font-loading and font-failure messages can render independently of Inter. `StateScreen` wraps the notice in a scrollable, safe-area-aware screen and requires `SafeAreaProvider`.

Startup uses these components for font loading/failure, missing sign-in configuration, session loading and required account setup. The provider only mounts after fonts load and a publishable key exists. Home uses informational notices for unavailable rides and location features. These are not fetched empty results or detected offline states. Network detection, retryable data requests and offline synchronization remain work for their implementing features. Shared buttons use supported `aria-busy`/`aria-disabled` aliases for loading semantics on native and web.

Browser fixture checks exercised the actual root/home components at 320×568 and simulated doubled text, with mocked Clerk, router and font failures. Font loading/failure and missing-key states did not mount Clerk. Session loading, pending setup/current tasks, fixture route selection, home notices and sign-out failure/retry were checked. Screenshots were inspected. This evidence does not establish a live session, Expo Router integration, TalkBack or native safe-area/font-scaling behavior.

## Authentication typography and light intro

The JavaScript intro now matches the native light splash and uses the full-color
approved mark with dark system-bar content. Existing timing/continue action is
unchanged. Authentication headings/descriptions, version metadata and request
alerts use the shared Inter typography; phone/OTP and sign-out feedback use the
14/20 body-small token rather than 12/13px system-font defaults. Mode-switch text
and nearby feedback spacing also use shared tokens. Fixed safe messages and all
authorization/request guards remain unchanged.

An actual-screen browser fixture at 320×568 with normal and simulated 2× text
verified loaded Inter, reachable 48px controls, readable 14/28px feedback and no
raw synthetic failure text/runtime errors. Its initial font check asked for an
unused, lazily unloaded face on the intro; checking/loading the face actually used
resolved the test assumption. This is not a native font-loading failure or proof
of Android font scaling. The committed Router/UI suite separately tests guards
and failure/retry behavior with mocked identity/HTTP; it is stronger routing
evidence than the older browser fixture, still without live/device claims.
