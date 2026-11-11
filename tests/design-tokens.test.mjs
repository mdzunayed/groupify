import assert from "node:assert/strict";
import { test } from "node:test";

import { colors } from "../src/theme/tokens.ts";

function luminance(hex) {
  assert.match(hex, /^#[\da-f]{6}$/i);
  const channels = hex.match(/[\da-f]{2}/gi).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

test("design-system text colors meet normal-text contrast against their surfaces", () => {
  const pairs = [
    [colors.onBrand, colors.brand],
    [colors.text, colors.background],
    [colors.text, colors.surface],
    [colors.textMuted, colors.background],
    [colors.textMuted, colors.surface],
    [colors.successText, colors.successBackground],
    [colors.warningText, colors.warningBackground],
    [colors.dangerText, colors.dangerBackground],
    [colors.infoText, colors.infoBackground],
  ];
  for (const [foreground, background] of pairs) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    assert.ok(ratio >= 4.5, `${foreground} on ${background} has contrast ${ratio.toFixed(2)}:1`);
  }
});
