import { describe, expect, it } from "vitest";
import { formatDisplayValue, MASK_TEXT } from "../../src/popup/maskDisplay.js";

describe("formatDisplayValue - mask display logic (T014)", () => {
  it("returns a fixed-length mask regardless of value length when masking is enabled", () => {
    expect(formatDisplayValue("東京都", true)).toBe(MASK_TEXT);
    expect(formatDisplayValue("a", true)).toBe(MASK_TEXT);
    expect(formatDisplayValue("a".repeat(2000), true)).toBe(MASK_TEXT);
  });

  it("returns the original value unchanged when masking is disabled", () => {
    expect(formatDisplayValue("東京都千代田区", false)).toBe("東京都千代田区");
  });
});
