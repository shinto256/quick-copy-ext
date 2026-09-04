import { describe, expect, it } from "vitest";
import { visibleTabIndexes } from "../../src/sidepanel/tabOverflow.js";

const NONE = -1;

function asArray(set) {
  return [...set].sort((a, b) => a - b);
}

describe("visibleTabIndexes - everything fits or not", () => {
  it("returns all indexes when the total width fits", () => {
    // 3個 * 30 + gap 8 * 2 = 106
    expect(asArray(visibleTabIndexes([30, 30, 30], 106, 8, NONE))).toEqual([0, 1, 2]);
  });

  it("drops the last tab when the total exceeds by 1px", () => {
    expect(asArray(visibleTabIndexes([30, 30, 30], 105, 8, NONE))).toEqual([0, 1]);
  });

  it("returns an empty set for an empty list", () => {
    expect(asArray(visibleTabIndexes([], 200, 8, NONE))).toEqual([]);
  });

  it("returns an empty set when no width is available and nothing is selected", () => {
    expect(asArray(visibleTabIndexes([30, 30], 0, 8, NONE))).toEqual([]);
    expect(asArray(visibleTabIndexes([30, 30], -50, 8, NONE))).toEqual([]);
  });
});

describe("visibleTabIndexes - gap handling", () => {
  it("does not add a gap before the first tab", () => {
    expect(asArray(visibleTabIndexes([40, 40], 40, 8, NONE))).toEqual([0]);
  });

  it("keeps only one tab when the gap pushes the pair over the limit", () => {
    // 40 + 40 = 80 は収まるが、gap 8 を足すと 88 で超える
    expect(asArray(visibleTabIndexes([40, 40], 80, 8, NONE))).toEqual([0]);
    expect(asArray(visibleTabIndexes([40, 40], 88, 8, NONE))).toEqual([0, 1]);
  });

  it("works with a zero gap", () => {
    expect(asArray(visibleTabIndexes([40, 40], 80, 0, NONE))).toEqual([0, 1]);
  });
});

describe("visibleTabIndexes - selected tab is always included", () => {
  it("does not hide extra tabs when the selected tab already fits", () => {
    // 選択中が先頭から収まる範囲（0..1）にある → 手順1の候補をそのまま返す
    const withoutSelection = asArray(visibleTabIndexes([30, 30, 30], 105, 8, NONE));
    const withSelection = asArray(visibleTabIndexes([30, 30, 30], 105, 8, 1));
    expect(withSelection).toEqual(withoutSelection);
    expect(withSelection).toEqual([0, 1]);
  });

  it("includes a selected tab that would not fit, hiding others to make room", () => {
    // 幅 105 では先頭2個までしか入らないが、選択中は index 2
    const result = asArray(visibleTabIndexes([30, 30, 30], 105, 8, 2));
    expect(result).toContain(2);
    // 選択中(30) + gap 8 + 先頭(30) = 68 <= 105、さらに index 1 を足すと 106 で超える
    expect(result).toEqual([0, 2]);
  });

  it("returns only the selected tab when it alone exceeds the available width", () => {
    expect(asArray(visibleTabIndexes([30, 500], 100, 8, 1))).toEqual([1]);
  });

  it("returns only the selected tab when the available width is zero", () => {
    expect(asArray(visibleTabIndexes([30, 30], 0, 8, 1))).toEqual([1]);
  });

  it("includes a selected tab at the end when everything else must hide", () => {
    // 選択中(40) だけで 40、残り 45 - 8 = 37 では先頭(40) が入らない
    expect(asArray(visibleTabIndexes([40, 40, 40], 45, 8, 2))).toEqual([2]);
  });

  it("falls back to the plain fit when selectedIndex is -1 or out of range", () => {
    const plain = asArray(visibleTabIndexes([30, 30, 30], 105, 8, NONE));
    expect(asArray(visibleTabIndexes([30, 30, 30], 105, 8, -5))).toEqual(plain);
    expect(asArray(visibleTabIndexes([30, 30, 30], 105, 8, 3))).toEqual(plain);
    expect(asArray(visibleTabIndexes([30, 30, 30], 105, 8, 99))).toEqual(plain);
  });

  it("returns all indexes when everything fits even with a selection", () => {
    expect(asArray(visibleTabIndexes([30, 30, 30], 200, 8, 2))).toEqual([0, 1, 2]);
  });
});

describe("visibleTabIndexes - purity", () => {
  it("does not mutate the widths argument", () => {
    const widths = [30, 30, 30];
    const before = [...widths];

    visibleTabIndexes(widths, 105, 8, 2);

    expect(widths).toEqual(before);
  });

  it("only returns valid indexes", () => {
    const widths = [30, 30, 30];
    for (const index of visibleTabIndexes(widths, 105, 8, 2)) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(widths.length);
    }
  });
});

describe("visibleTabIndexes - at the tab count limit", () => {
  it("handles 51 tabs (unassigned + 50 groups)", () => {
    const widths = Array.from({ length: 51 }, () => 40);
    // 全部収まる幅: 51 * 40 + 50 * 8 = 2440
    expect(visibleTabIndexes(widths, 2440, 8, NONE).size).toBe(51);
    // 先頭2個ぶんだけの幅
    expect(asArray(visibleTabIndexes(widths, 88, 8, NONE))).toEqual([0, 1]);
    // 末尾が選択中でも必ず含まれる
    expect(visibleTabIndexes(widths, 88, 8, 50).has(50)).toBe(true);
  });
});
