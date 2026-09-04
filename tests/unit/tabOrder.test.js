import { describe, expect, it } from "vitest";
import {
  UNASSIGNED_TAB_ID,
  isValidTabOrder,
  normalizeTabOrder,
} from "../../src/storage/tabOrder.js";

function groupsOf(...ids) {
  return ids.map((id) => ({ id, name: `name-${id}` }));
}

describe("UNASSIGNED_TAB_ID", () => {
  it("is the sentinel shared with itemFilter", () => {
    expect(UNASSIGNED_TAB_ID).toBe("__unassigned__");
  });
});

describe("normalizeTabOrder - defaults", () => {
  it("returns the sentinel followed by groups in array order when nothing is stored", () => {
    const groups = groupsOf("a", "b", "c");
    expect(normalizeTabOrder([], groups)).toEqual([UNASSIGNED_TAB_ID, "a", "b", "c"]);
  });

  it("treats undefined, null and non-array values as an empty stored order", () => {
    const groups = groupsOf("a", "b");
    const expected = [UNASSIGNED_TAB_ID, "a", "b"];
    expect(normalizeTabOrder(undefined, groups)).toEqual(expected);
    expect(normalizeTabOrder(null, groups)).toEqual(expected);
    expect(normalizeTabOrder("not-an-array", groups)).toEqual(expected);
    expect(normalizeTabOrder({ 0: "a" }, groups)).toEqual(expected);
  });

  it("returns only the sentinel when there are no groups", () => {
    expect(normalizeTabOrder([], [])).toEqual([UNASSIGNED_TAB_ID]);
  });
});

describe("normalizeTabOrder - rule 1: drop ids that no longer exist", () => {
  it("removes ids of deleted groups", () => {
    const stored = [UNASSIGNED_TAB_ID, "a", "deleted", "b"];
    expect(normalizeTabOrder(stored, groupsOf("a", "b"))).toEqual([UNASSIGNED_TAB_ID, "a", "b"]);
  });

  it("removes values that are neither the sentinel nor a known group id", () => {
    const stored = [UNASSIGNED_TAB_ID, "a", null, 42, "", "b"];
    expect(normalizeTabOrder(stored, groupsOf("a", "b"))).toEqual([UNASSIGNED_TAB_ID, "a", "b"]);
  });
});

describe("normalizeTabOrder - rule 2: keep only the first occurrence of duplicates", () => {
  it("removes repeated group ids", () => {
    const stored = [UNASSIGNED_TAB_ID, "a", "b", "a"];
    expect(normalizeTabOrder(stored, groupsOf("a", "b"))).toEqual([UNASSIGNED_TAB_ID, "a", "b"]);
  });

  it("removes a repeated sentinel", () => {
    const stored = [UNASSIGNED_TAB_ID, "a", UNASSIGNED_TAB_ID];
    expect(normalizeTabOrder(stored, groupsOf("a"))).toEqual([UNASSIGNED_TAB_ID, "a"]);
  });
});

describe("normalizeTabOrder - rule 3: restore the sentinel", () => {
  it("prepends the sentinel when it is missing", () => {
    expect(normalizeTabOrder(["a", "b"], groupsOf("a", "b"))).toEqual([
      UNASSIGNED_TAB_ID,
      "a",
      "b",
    ]);
  });

  it("keeps the sentinel where it is when it is not first", () => {
    const stored = ["a", UNASSIGNED_TAB_ID, "b"];
    expect(normalizeTabOrder(stored, groupsOf("a", "b"))).toEqual(["a", UNASSIGNED_TAB_ID, "b"]);
  });
});

describe("normalizeTabOrder - rule 4: append groups that are not listed yet", () => {
  it("appends a newly created group at the end", () => {
    const stored = [UNASSIGNED_TAB_ID, "a"];
    expect(normalizeTabOrder(stored, groupsOf("a", "new"))).toEqual([
      UNASSIGNED_TAB_ID,
      "a",
      "new",
    ]);
  });

  it("appends several missing groups keeping the groups array order", () => {
    const stored = ["b", UNASSIGNED_TAB_ID];
    expect(normalizeTabOrder(stored, groupsOf("a", "b", "c", "d"))).toEqual([
      "b",
      UNASSIGNED_TAB_ID,
      "a",
      "c",
      "d",
    ]);
  });
});

describe("normalizeTabOrder - combined rules and invariants", () => {
  it("applies all four rules to a broken stored order", () => {
    // 削除済みID・重複・センチネル欠落・未収録グループがすべて含まれる入力
    const stored = ["b", "deleted", "b", "a"];
    const groups = groupsOf("a", "b", "c");
    expect(normalizeTabOrder(stored, groups)).toEqual([UNASSIGNED_TAB_ID, "b", "a", "c"]);
  });

  it("does not mutate the arguments", () => {
    const stored = ["b", "deleted", "b"];
    const storedCopyBefore = [...stored];
    const groups = groupsOf("a", "b");
    const groupsCopyBefore = groups.map((group) => ({ ...group }));

    normalizeTabOrder(stored, groups);

    expect(stored).toEqual(storedCopyBefore);
    expect(groups).toEqual(groupsCopyBefore);
  });

  it("returns groups.length + 1 elements at the 50 group limit", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `g${i}`);
    const groups = groupsOf(...ids);
    const stored = [UNASSIGNED_TAB_ID, ...ids];

    const result = normalizeTabOrder(stored, groups);

    expect(result).toHaveLength(51);
    expect(new Set(result).size).toBe(51);
    expect(result.filter((id) => id === UNASSIGNED_TAB_ID)).toHaveLength(1);
  });
});

describe("isValidTabOrder", () => {
  const normalized = [UNASSIGNED_TAB_ID, "a", "b", "c"];

  it("accepts a reordering of the normalized order", () => {
    expect(isValidTabOrder(["c", UNASSIGNED_TAB_ID, "a", "b"], normalized)).toBe(true);
  });

  it("accepts the identical order", () => {
    expect(isValidTabOrder([...normalized], normalized)).toBe(true);
  });

  it("rejects an order with a different length", () => {
    expect(isValidTabOrder([UNASSIGNED_TAB_ID, "a", "b"], normalized)).toBe(false);
    expect(isValidTabOrder([...normalized, "d"], normalized)).toBe(false);
  });

  it("rejects an order containing duplicates", () => {
    expect(isValidTabOrder([UNASSIGNED_TAB_ID, "a", "a", "b"], normalized)).toBe(false);
  });

  it("rejects an order containing an unknown id", () => {
    expect(isValidTabOrder([UNASSIGNED_TAB_ID, "a", "b", "zzz"], normalized)).toBe(false);
  });

  it("rejects an order where a known id is replaced by another known id", () => {
    // 要素数は同じだが "c" が欠け "a" が2度現れる形（重複判定と集合判定の両方で弾かれる）
    expect(isValidTabOrder([UNASSIGNED_TAB_ID, "a", "b", "a"], normalized)).toBe(false);
  });

  it("rejects values that are not arrays", () => {
    expect(isValidTabOrder(undefined, normalized)).toBe(false);
    expect(isValidTabOrder(null, normalized)).toBe(false);
    expect(isValidTabOrder("abc", normalized)).toBe(false);
    expect(isValidTabOrder({ 0: UNASSIGNED_TAB_ID }, normalized)).toBe(false);
  });
});
