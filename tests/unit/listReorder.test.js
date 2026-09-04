import { describe, expect, it } from "vitest";
import { moveInList } from "../../src/sidepanel/listReorder.js";

describe("moveInList - moves an element within range", () => {
  it("moves an element one position up", () => {
    expect(moveInList(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
  });

  it("moves an element one position down", () => {
    expect(moveInList(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("moves an element by more than one position when the target is in range", () => {
    expect(moveInList(["a", "b", "c", "d"], 3, -2)).toEqual(["a", "d", "b", "c"]);
  });
});

describe("moveInList - boundaries leave the order unchanged (FR-011)", () => {
  it("does not change the order when moving the first element up", () => {
    expect(moveInList(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });

  it("does not change the order when moving the last element down", () => {
    expect(moveInList(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });

  it("does not change the order for a single element list in either direction", () => {
    expect(moveInList(["only"], 0, -1)).toEqual(["only"]);
    expect(moveInList(["only"], 0, 1)).toEqual(["only"]);
  });

  it("does not change an empty list and does not throw", () => {
    expect(moveInList([], 0, -1)).toEqual([]);
    expect(moveInList([], 0, 1)).toEqual([]);
  });

  it("does not change the order when index is out of range", () => {
    expect(moveInList(["a", "b"], -1, 1)).toEqual(["a", "b"]);
    expect(moveInList(["a", "b"], 2, -1)).toEqual(["a", "b"]);
  });
});

describe("moveInList - purity", () => {
  it("does not mutate the argument", () => {
    const list = ["a", "b", "c"];
    const before = [...list];

    moveInList(list, 2, -1);

    expect(list).toEqual(before);
  });

  it("always returns a new array instance", () => {
    const list = ["a", "b", "c"];
    // 順序が変わらないケースでも新しい配列を返す
    expect(moveInList(list, 0, -1)).not.toBe(list);
    expect(moveInList(list, 1, -1)).not.toBe(list);
  });

  it("keeps the same element count and the same set of elements", () => {
    const list = ["a", "b", "c", "d"];
    const result = moveInList(list, 0, 2);

    expect(result).toHaveLength(list.length);
    expect([...result].sort()).toEqual([...list].sort());
  });
});

describe("moveInList - at the tab count limit", () => {
  it("brings the last element to the front after 50 single-step moves", () => {
    // 未分類1 + グループ上限50 = 51要素
    const list = Array.from({ length: 51 }, (_, i) => `t${i}`);
    const target = list[list.length - 1];

    let current = list;
    for (let i = 0; i < 50; i++) {
      current = moveInList(current, current.indexOf(target), -1);
    }

    expect(current[0]).toBe(target);
    expect(current).toHaveLength(51);
    expect(new Set(current).size).toBe(51);
  });
});
