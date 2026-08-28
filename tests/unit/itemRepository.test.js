import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as ItemRepository from "../../src/storage/itemRepository.js";
import { ValidationError, NotFoundError } from "../../src/storage/errors.js";

beforeEach(() => {
  installChromeStorageMock();
});

describe("ItemRepository.create - boundary validation (T007)", () => {
  it("rejects empty name", async () => {
    await expect(ItemRepository.create({ name: "", value: "v" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("accepts name of exactly 50 characters", async () => {
    const name = "a".repeat(50);
    const item = await ItemRepository.create({ name, value: "v" });
    expect(item.name).toBe(name);
  });

  it("rejects name of 51 characters", async () => {
    const name = "a".repeat(51);
    await expect(ItemRepository.create({ name, value: "v" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects empty value", async () => {
    await expect(ItemRepository.create({ name: "n", value: "" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("accepts value of exactly 2000 characters, including newlines", async () => {
    const value = "line1\nline2\n" + "a".repeat(1988);
    expect(value.length).toBe(2000);
    const item = await ItemRepository.create({ name: "n", value });
    expect(item.value).toBe(value);
  });

  it("rejects value of 2001 characters", async () => {
    const value = "a".repeat(2001);
    await expect(ItemRepository.create({ name: "n", value })).rejects.toThrow(
      ValidationError,
    );
  });

  it("allows the 500th item and rejects the 501st", async () => {
    for (let i = 0; i < 499; i++) {
      await ItemRepository.create({ name: `n${i}`, value: "v" });
    }
    const items = await ItemRepository.list();
    expect(items).toHaveLength(499);

    const item500 = await ItemRepository.create({ name: "n499", value: "v" });
    expect(item500).toBeDefined();
    expect(await ItemRepository.list()).toHaveLength(500);

    await expect(ItemRepository.create({ name: "n500", value: "v" })).rejects.toThrow(
      ValidationError,
    );
    expect(await ItemRepository.list()).toHaveLength(500);
  });
});

describe("ItemRepository.update / remove (T008)", () => {
  it("updates name and value of an existing item", async () => {
    const created = await ItemRepository.create({ name: "住所", value: "東京都..." });
    const updated = await ItemRepository.update(created.id, {
      name: "自宅住所",
      value: "東京都新宿区...",
    });
    expect(updated.name).toBe("自宅住所");
    expect(updated.value).toBe("東京都新宿区...");
    expect(updated.id).toBe(created.id);
  });

  it("throws NotFoundError when updating a non-existent id", async () => {
    await expect(
      ItemRepository.update("no-such-id", { name: "x" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("removes an existing item", async () => {
    const created = await ItemRepository.create({ name: "住所", value: "東京都..." });
    await ItemRepository.remove(created.id);
    expect(await ItemRepository.list()).toHaveLength(0);
  });

  it("throws NotFoundError when removing a non-existent id", async () => {
    await expect(ItemRepository.remove("no-such-id")).rejects.toThrow(NotFoundError);
  });
});

describe("ItemRepository.removeMany / removeByGroup (req-000004 v1.1)", () => {
  it("removes only the specified items and leaves the rest untouched", async () => {
    const a = await ItemRepository.create({ name: "a", value: "v" });
    const b = await ItemRepository.create({ name: "b", value: "v" });
    const c = await ItemRepository.create({ name: "c", value: "v" });

    await ItemRepository.removeMany([a.id, b.id]);

    const items = await ItemRepository.list();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(c.id);
  });

  it("ignores ids that do not exist without throwing", async () => {
    const a = await ItemRepository.create({ name: "a", value: "v" });
    await ItemRepository.removeMany(["no-such-id", a.id]);
    expect(await ItemRepository.list()).toHaveLength(0);
  });

  it("leaves items unchanged when given an empty array", async () => {
    await ItemRepository.create({ name: "a", value: "v" });
    await ItemRepository.removeMany([]);
    expect(await ItemRepository.list()).toHaveLength(1);
  });

  it("removeByGroup deletes only items belonging to the given group", async () => {
    const inGroup = await ItemRepository.create({ name: "a", value: "v", groupId: "g1" });
    const otherGroup = await ItemRepository.create({ name: "b", value: "v", groupId: "g2" });
    const unassigned = await ItemRepository.create({ name: "c", value: "v" });

    await ItemRepository.removeByGroup("g1");

    const items = await ItemRepository.list();
    expect(items.find((i) => i.id === inGroup.id)).toBeUndefined();
    expect(items.find((i) => i.id === otherGroup.id)).toBeDefined();
    expect(items.find((i) => i.id === unassigned.id)).toBeDefined();
  });
});

describe("ItemRepository.reorderGroup (req-000005)", () => {
  it("reverses the order of items within the same group", async () => {
    const a = await ItemRepository.create({ name: "a", value: "v", groupId: "g1" });
    const b = await ItemRepository.create({ name: "b", value: "v", groupId: "g1" });
    const c = await ItemRepository.create({ name: "c", value: "v", groupId: "g1" });

    await ItemRepository.reorderGroup("g1", [c.id, b.id, a.id]);

    const items = await ItemRepository.list();
    expect(items.map((i) => i.id)).toEqual([c.id, b.id, a.id]);
  });

  it("does not affect the relative order of items in other groups", async () => {
    const a1 = await ItemRepository.create({ name: "a1", value: "v", groupId: "g1" });
    const b1 = await ItemRepository.create({ name: "b1", value: "v", groupId: "g2" });
    const a2 = await ItemRepository.create({ name: "a2", value: "v", groupId: "g1" });
    const b2 = await ItemRepository.create({ name: "b2", value: "v", groupId: "g2" });

    await ItemRepository.reorderGroup("g1", [a2.id, a1.id]);

    const items = await ItemRepository.list();
    expect(items.map((i) => i.id)).toEqual([a2.id, b1.id, a1.id, b2.id]);
  });

  it("throws ValidationError when orderedIds does not match the group's item set", async () => {
    const a = await ItemRepository.create({ name: "a", value: "v", groupId: "g1" });
    await ItemRepository.create({ name: "b", value: "v", groupId: "g1" });

    await expect(ItemRepository.reorderGroup("g1", [a.id])).rejects.toThrow(ValidationError);
    await expect(ItemRepository.reorderGroup("g1", ["no-such-id"])).rejects.toThrow(
      ValidationError,
    );

    const items = await ItemRepository.list();
    expect(items.map((i) => i.id)).toContain(a.id);
  });
});

describe("ItemRepository.update - repositions item on group change (req-000005 / FR-005)", () => {
  it("moves the item to the end of the array when its groupId changes", async () => {
    const a = await ItemRepository.create({ name: "a", value: "v", groupId: "g1" });
    const b = await ItemRepository.create({ name: "b", value: "v", groupId: "g2" });
    const c = await ItemRepository.create({ name: "c", value: "v", groupId: "g2" });

    await ItemRepository.update(a.id, { groupId: "g2" });

    const items = await ItemRepository.list();
    expect(items.map((i) => i.id)).toEqual([b.id, c.id, a.id]);
  });

  it("does not reposition the item when groupId is unchanged", async () => {
    const a = await ItemRepository.create({ name: "a", value: "v", groupId: "g1" });
    const b = await ItemRepository.create({ name: "b", value: "v", groupId: "g1" });

    await ItemRepository.update(a.id, { name: "a-renamed", groupId: "g1" });

    const items = await ItemRepository.list();
    expect(items.map((i) => i.id)).toEqual([a.id, b.id]);
  });
});
