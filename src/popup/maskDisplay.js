export const MASK_TEXT = "●".repeat(8);

export function formatDisplayValue(value, maskEnabled) {
  return maskEnabled ? MASK_TEXT : value;
}
