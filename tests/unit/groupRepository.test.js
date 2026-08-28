import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as GroupRepository from "../../src/storage/groupRepository.js";
import * as ItemRepository from "../../src/storage/itemRepository.js";
import { ValidationError } from "../../src/storage/errors.js";

beforeEach(() => {
  installChromeStorageMock();
});

describe("GroupRepository.create - boundary validation (T022)", () => {
  it("rejects empty name", async () => {
    await expect(GroupRepository.create("")).rejects.toThrow(ValidationError);
  });

  it("accepts name of exactly 30 characters", async () => {
    const name = "g".repeat(30);
    const group = await GroupRepository.create(name);
    expect(group.name).toBe(name);
  });

  it("rejects name of 31 characters", async () => {
    await expect(GroupRepository.create("g".repeat(31))).rejects.toThrow(ValidationError);
  });

  it("allows the 50th group and rejects the 51st", async () => {
    for (let i = 0; i < 49; i++) {
      await GroupRepository.create(`g${i}`);
    }
    expect(await GroupRepository.list()).toHaveLength(49);

    await GroupRepository.create("g49");
    expect(await GroupRepository.list()).toHaveLength(50);

    await expect(GroupRepository.create("g50")).rejects.toThrow(ValidationError);
    expect(await GroupRepository.list()).toHaveLength(50);
  });
});

describe("GroupRepository.delete - cascades to items in the group (req-000004 v1.1)", () => {
  it("deletes all items that belonged to the deleted group", async () => {
    const group = await GroupRepository.create("英語住所");
    const itemA = await ItemRepository.create({
      name: "住所A",
      value: "v",
      groupId: group.id,
    });
    const itemB = await ItemRepository.create({
      name: "住所B",
      value: "v",
      groupId: group.id,
    });
    const other = await ItemRepository.create({ name: "その他", value: "v" });

    await GroupRepository.remove(group.id);

    const items = await ItemRepository.list();
    expect(items.find((i) => i.id === itemA.id)).toBeUndefined();
    expect(items.find((i) => i.id === itemB.id)).toBeUndefined();
    expect(items.find((i) => i.id === other.id)).toBeDefined();
    expect(await GroupRepository.list()).toHaveLength(0);
  });

  it("does not delete items when a group is unaffected by another group's deletion", async () => {
    const groupA = await GroupRepository.create("グループA");
    const groupB = await GroupRepository.create("グループB");
    const itemInA = await ItemRepository.create({ name: "項目A", value: "v", groupId: groupA.id });
    const itemInB = await ItemRepository.create({ name: "項目B", value: "v", groupId: groupB.id });

    await GroupRepository.remove(groupA.id);

    const items = await ItemRepository.list();
    expect(items.find((i) => i.id === itemInA.id)).toBeUndefined();
    expect(items.find((i) => i.id === itemInB.id)).toEqual(itemInB);
  });
});
