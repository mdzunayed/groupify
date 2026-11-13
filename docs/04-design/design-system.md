# Groupify design system

## Direction and status

The owner selected the helmet-and-road identity and Inter typography from the checked-in [design-system reference](../../design/design-system-ref.png). The [app reference](../../design/app-design-ref.png) remains a screen-layout reference where it agrees with approved product behavior; it does not override the tap-again PTT interaction or active-ride location boundaries.

The [vector mark](../../assets/brand/groupify-mark.svg) and [light-theme tokens](../../src/theme/tokens.ts) are a first implementation slice. The app now renders the vector through Expo Image. Bundled Inter weights (300–800) load with Expo Font before the authenticated navigator mounts; startup exposes loading and font-error states. Named font families are used explicitly because platform font-weight resolution differs. The app configuration requests light mode; the white logo variant is for contrasting brand backgrounds. Reusable components, navigation, state treatments, and device accessibility validation remain P3 work. Dark mode is not selected by the logo/typeface decision and remains open.

## Light-theme tokens

The token file is the source of truth for the brand blue, text, surfaces, borders, feedback colors, spacing, corner radii, and typography scale. Feedback colors use readable text/surface pairs rather than relying on color alone. The automated contrast check covers the listed normal-text pairs at a minimum 4.5:1 ratio; component-level contrast, focus, screen-reader labels, touch targets, and dynamic text still need verification when components are built.

Spacing follows 4, 8, 12, 16, 24, 32, and 40 points. Heading sizes are 32/40, 24/32, and 20/28; body sizes are 16/24 and 14/20; caption is 12/16. Values are font-size/line-height in points. Use meaningful labels and text alongside status color or icons.

## Remaining P3 work

- Validate the integrated Inter fonts and vector mark on Android, including offline startup, large text, and TalkBack. Home and startup use theme tokens; the authentication layout still needs a full token and accessibility pass.
- Build reusable buttons, fields, cards, chips, dialogs, navigation, map controls, and ride-status elements with loading, empty, offline, and error states.
- Validate accessibility and contrast on representative screens and Android devices. Do not present sample ride or location data as live information.
- Record the approved navigation, native implementation, and any later dark-mode decision before relying on them.

## Shared button

`src/components/Button.tsx` provides primary and text variants. Pass a visible `label`, an `onPress` handler and optional `disabled`, `loading`, `loadingLabel` and layout `style`. Loading disables interaction and reports busy/disabled accessibility states while keeping a readable label beside the spinner. The component uses Inter and theme colors, has a minimum 48-point target and grows vertically with text. Callers own request deduplication, errors and authorization; the component does not infer request success. Send OTP, verify OTP and sign-out use this component. Native focus, TalkBack announcements and enlarged text remain device checks.

## Shared text field

`src/components/TextField.tsx` wraps a controlled React Native input with a persistent visible `label`, Inter body typography, and neutral, focus, disabled and optional validation-error states. `hideLabel` retains the accessibility label for the six OTP digits; the OTP group uses two rows of three so each input stays at least 48 points wide at narrow widths. Inputs have a minimum 48-point height and vertical padding rather than a fixed height. Neutral borders use the muted-text color for readable boundaries, while focus and error borders use brand and danger colors.

Pass standard `TextInput` value/change/keyboard/autocomplete properties and `editable` from the caller. `ref` points to the native input, and focus/blur callbacks are forwarded. `containerStyle` controls layout; `style` customizes the input. An optional field-specific `error` is displayed as an alert and included in the input's accessibility hint. Request-level failures stay in the form alert; a server/network failure must not automatically mark a phone number invalid. Native keyboard/autofill, TalkBack, and large-text behavior still require Android validation.
