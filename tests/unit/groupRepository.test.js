import { beforeEach, describe, expect, it } from "vitest";
import { installChromeStorageMock } from "./chromeMock.js";
import * as GroupRepository from "../../src/storage/groupRepository.js";
import * as ItemRepository from "../../src/storage/itemRepository.js";
import { NotFoundError, ValidationError } from "../../src/storage/errors.js";
import { UNASSIGNED_TAB_ID } from "../../src/storage/tabOrder.js";

let store;

beforeEach(() => {
  store = installChromeStorageMock();
});

describe("GroupRepository.create - boundary validation (T022)", () => {
  it("rejects empty name", async () => {
    await expect(GroupRepository.create("")).rejects.toThrow(ValidationError);
  });

  it("accepts name of exactly 20 characters", async () => {
    const name = "g".repeat(20);
    const group = await GroupRepository.create(name);
    expect(group.name).toBe(name);
  });

  it("rejects name of 21 characters", async () => {
    await expect(GroupRepository.create("g".repeat(21))).rejects.toThrow(ValidationError);
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

describe("GroupRepository.listTabOrder - normalized tab order (req-000010)", () => {
  it("returns the sentinel followed by groups in array order when nothing is stored", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");
    const c = await GroupRepository.create("g3");

    expect(await GroupRepository.listTabOrder()).toEqual([
      UNASSIGNED_TAB_ID,
      a.id,
      b.id,
      c.id,
    ]);
  });

  it("returns only the sentinel when there are no groups", async () => {
    expect(await GroupRepository.listTabOrder()).toEqual([UNASSIGNED_TAB_ID]);
  });

  it("preserves a stored order in which the sentinel is not first", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");
    store.tabOrder = [b.id, UNASSIGNED_TAB_ID, a.id];

    expect(await GroupRepository.listTabOrder()).toEqual([b.id, UNASSIGNED_TAB_ID, a.id]);
  });

  it("drops ids of groups that no longer exist", async () => {
    const a = await GroupRepository.create("g1");
    store.tabOrder = [UNASSIGNED_TAB_ID, a.id, "deleted-group-id"];

    expect(await GroupRepository.listTabOrder()).toEqual([UNASSIGNED_TAB_ID, a.id]);
  });

  it("appends groups that are missing from the stored order", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");
    store.tabOrder = [UNASSIGNED_TAB_ID, b.id];

    expect(await GroupRepository.listTabOrder()).toEqual([UNASSIGNED_TAB_ID, b.id, a.id]);
  });

  it("does not write to storage", async () => {
    await GroupRepository.create("g1");
    delete store.tabOrder;

    await GroupRepository.listTabOrder();

    expect(Object.prototype.hasOwnProperty.call(store, "tabOrder")).toBe(false);
  });
});

describe("GroupRepository.reorderTabs - persists the tab order (req-000010)", () => {
  it("saves a reordering of the current tabs and returns it", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");
    const next = [b.id, a.id, UNASSIGNED_TAB_ID];

    const saved = await GroupRepository.reorderTabs(next);

    expect(saved).toEqual(next);
    expect(await GroupRepository.listTabOrder()).toEqual(next);
  });

  it("allows the unassigned tab to be placed anywhere", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");

    await GroupRepository.reorderTabs([a.id, UNASSIGNED_TAB_ID, b.id]);

    expect(await GroupRepository.listTabOrder()).toEqual([a.id, UNASSIGNED_TAB_ID, b.id]);
  });

  it("rejects an order with too few elements and leaves tabOrder untouched", async () => {
    const a = await GroupRepository.create("g1");
    await GroupRepository.create("g2");
    const before = store.tabOrder;

    await expect(GroupRepository.reorderTabs([UNASSIGNED_TAB_ID, a.id])).rejects.toThrow(
      ValidationError,
    );
    expect(store.tabOrder).toBe(before);
  });

  it("rejects an order containing duplicates", async () => {
    const a = await GroupRepository.create("g1");
    await GroupRepository.create("g2");

    await expect(
      GroupRepository.reorderTabs([UNASSIGNED_TAB_ID, a.id, a.id]),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an order containing an id that does not exist", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");

    await expect(
      GroupRepository.reorderTabs([UNASSIGNED_TAB_ID, a.id, b.id, "ghost"]),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an order that omits the unassigned sentinel", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");

    await expect(GroupRepository.reorderTabs([a.id, b.id])).rejects.toThrow(ValidationError);
  });

  it("rejects values that are not arrays", async () => {
    await GroupRepository.create("g1");

    await expect(GroupRepository.reorderTabs(undefined)).rejects.toThrow(ValidationError);
    await expect(GroupRepository.reorderTabs("nope")).rejects.toThrow(ValidationError);
  });

  it("does not modify the groups array", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");
    const groupsBefore = await GroupRepository.list();

    await GroupRepository.reorderTabs([b.id, a.id, UNASSIGNED_TAB_ID]);

    expect(await GroupRepository.list()).toEqual(groupsBefore);
  });
});

describe("GroupRepository.remove / create - tabOrder maintenance (req-000010)", () => {
  it("removes the deleted group's id from the stored tabOrder", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");
    await GroupRepository.reorderTabs([b.id, UNASSIGNED_TAB_ID, a.id]);

    await GroupRepository.remove(a.id);

    expect(store.tabOrder).toEqual([b.id, UNASSIGNED_TAB_ID]);
    expect(await GroupRepository.listTabOrder()).toEqual([b.id, UNASSIGNED_TAB_ID]);
  });

  it("still deletes the items of the removed group", async () => {
    const group = await GroupRepository.create("g1");
    const item = await ItemRepository.create({ name: "項目", value: "v", groupId: group.id });
    await GroupRepository.reorderTabs([group.id, UNASSIGNED_TAB_ID]);

    await GroupRepository.remove(group.id);

    const items = await ItemRepository.list();
    expect(items.find((i) => i.id === item.id)).toBeUndefined();
  });

  it("does not fail when no tabOrder has been stored yet", async () => {
    const group = await GroupRepository.create("g1");

    await GroupRepository.remove(group.id);

    expect(await GroupRepository.listTabOrder()).toEqual([UNASSIGNED_TAB_ID]);
  });

  it("leaves tabOrder untouched when the id does not exist", async () => {
    const a = await GroupRepository.create("g1");
    await GroupRepository.reorderTabs([a.id, UNASSIGNED_TAB_ID]);
    const before = [...store.tabOrder];

    await expect(GroupRepository.remove("ghost")).rejects.toThrow(NotFoundError);
    expect(store.tabOrder).toEqual(before);
  });

  it("cannot remove the unassigned sentinel because it is not a group", async () => {
    await expect(GroupRepository.remove(UNASSIGNED_TAB_ID)).rejects.toThrow(NotFoundError);
  });

  it("places a newly created group at the end of the tab order without writing tabOrder", async () => {
    const a = await GroupRepository.create("g1");
    await GroupRepository.reorderTabs([a.id, UNASSIGNED_TAB_ID]);
    const storedBefore = [...store.tabOrder];

    const b = await GroupRepository.create("g2");

    expect(store.tabOrder).toEqual(storedBefore);
    expect(await GroupRepository.listTabOrder()).toEqual([a.id, UNASSIGNED_TAB_ID, b.id]);
  });
});

describe("GroupRepository.NAME_MAX_LENGTH - lowered to 20 (req-000010)", () => {
  it("exposes the limit so the UI can derive maxlength and the counter from it", () => {
    expect(GroupRepository.NAME_MAX_LENGTH).toBe(20);
  });

  it("accepts a rename to exactly 20 characters and rejects 21", async () => {
    const group = await GroupRepository.create("g1");
    const name = "あ".repeat(20);

    const renamed = await GroupRepository.rename(group.id, name);
    expect(renamed.name).toBe(name);

    await expect(GroupRepository.rename(group.id, "あ".repeat(21))).rejects.toThrow(
      ValidationError,
    );
    expect((await GroupRepository.list())[0].name).toBe(name);
  });

  it("does not truncate a stored name that is longer than the new limit", async () => {
    // 上限を下げる前に保存された名前を模して、storeへ直接投入する
    const longName = "が".repeat(25);
    store.groups = [{ id: "legacy", name: longName }];

    const groups = await GroupRepository.list();
    expect(groups[0].name).toBe(longName);
    expect(await GroupRepository.listTabOrder()).toEqual([UNASSIGNED_TAB_ID, "legacy"]);
  });

  it("applies the new limit when an over-length stored name is renamed", async () => {
    store.groups = [{ id: "legacy", name: "が".repeat(25) }];

    await expect(GroupRepository.rename("legacy", "が".repeat(21))).rejects.toThrow(
      ValidationError,
    );

    const renamed = await GroupRepository.rename("legacy", "短い名前");
    expect(renamed.name).toBe("短い名前");
  });

  it("keeps the tab order unchanged across a rename", async () => {
    const a = await GroupRepository.create("g1");
    const b = await GroupRepository.create("g2");
    await GroupRepository.reorderTabs([b.id, a.id, UNASSIGNED_TAB_ID]);

    await GroupRepository.rename(a.id, "g1-renamed");

    expect(await GroupRepository.listTabOrder()).toEqual([b.id, a.id, UNASSIGNED_TAB_ID]);
  });
});
