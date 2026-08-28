import { describe, expect, it } from "vitest";
import { filterItemsByTabAndSearch, UNASSIGNED_TAB_ID } from "../../src/sidepanel/itemFilter.js";

const items = [
  { id: "1", name: "会社名", value: "株式会社サンプル", groupId: "group-a" },
  { id: "2", name: "住所", value: "東京都千代田区", groupId: "group-a" },
  { id: "3", name: "サンプル文言", value: "よろしくお願いします", groupId: "group-b" },
  { id: "4", name: "メモ", value: "個人用メモ", groupId: null },
];

describe("filterItemsByTabAndSearch", () => {
  it("returns only items with groupId === null for the unassigned tab", () => {
    const result = filterItemsByTabAndSearch(items, UNASSIGNED_TAB_ID, "");
    expect(result).toEqual([items[3]]);
  });

  it("returns only items matching the selected group id", () => {
    const result = filterItemsByTabAndSearch(items, "group-a", "");
    expect(result).toEqual([items[0], items[1]]);
  });

  it("further filters by case-insensitive name substring match when a search term is given", () => {
    const result = filterItemsByTabAndSearch(items, "group-a", "住所");
    expect(result).toEqual([items[1]]);
  });

  it("matches names regardless of upper/lower case", () => {
    const withMixedCase = [{ id: "5", name: "ABCsample", value: "x", groupId: "group-a" }];
    const result = filterItemsByTabAndSearch(withMixedCase, "group-a", "abcsample");
    expect(result).toEqual(withMixedCase);
  });

  it("returns an empty array when nothing matches", () => {
    const result = filterItemsByTabAndSearch(items, "group-a", "存在しない");
    expect(result).toEqual([]);
  });

  it("returns an empty array when the item list itself is empty", () => {
    const result = filterItemsByTabAndSearch([], "group-a", "");
    expect(result).toEqual([]);
  });
});
