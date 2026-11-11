# Groupify design system

## Direction and status

The owner selected the helmet-and-road identity and Inter typography from the checked-in [design-system reference](../../design/design-system-ref.png). The [app reference](../../design/app-design-ref.png) remains a screen-layout reference where it agrees with approved product behavior; it does not override the tap-again PTT interaction or active-ride location boundaries.

The [vector mark](../../assets/brand/groupify-mark.svg) and [light-theme tokens](../../src/theme/tokens.ts) are a first implementation slice. They are not yet wired into the app. Inter must be installed and loaded before the typography can be used in screens. Reusable components, navigation, state treatments, and device accessibility validation remain P3 work. Dark mode is not selected by the logo/typeface decision and remains open.

## Light-theme tokens

The token file is the source of truth for the brand blue, text, surfaces, borders, feedback colors, spacing, corner radii, and typography scale. Feedback colors use readable text/surface pairs rather than relying on color alone. The automated contrast check covers the listed normal-text pairs at a minimum 4.5:1 ratio; component-level contrast, focus, screen-reader labels, touch targets, and dynamic text still need verification when components are built.

Spacing follows 4, 8, 12, 16, 24, 32, and 40 points. Heading sizes are 32/40, 24/32, and 20/28; body sizes are 16/24 and 14/20; caption is 12/16. Values are font-size/line-height in points. Use meaningful labels and text alongside status color or icons.

## Remaining P3 work

- Load Inter and connect the selected brand mark and tokens to the Expo/React Native application.
- Build reusable buttons, fields, cards, chips, dialogs, navigation, map controls, and ride-status elements with loading, empty, offline, and error states.
- Validate accessibility and contrast on representative screens and Android devices. Do not present sample ride or location data as live information.
- Record the approved navigation, native implementation, and any later dark-mode decision before relying on them.
