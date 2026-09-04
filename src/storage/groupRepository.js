import { getItem, setItem } from "./storageClient.js";
import { ValidationError, NotFoundError } from "./errors.js";
import { removeByGroup } from "./itemRepository.js";
import { isValidTabOrder, normalizeTabOrder } from "./tabOrder.js";

const KEY = "groups";
const ORDER_KEY = "tabOrder";
const MAX_GROUPS = 50;
// パネルの縦リスト1行に全角で収まる文字数。上限を下げても既存の名前は切り詰めない
// （validateNameはcreate/renameの入力にのみ適用する）。
export const NAME_MAX_LENGTH = 20;

function validateName(name) {
  if (!name || name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new ValidationError("name", `name must be 1-${NAME_MAX_LENGTH} characters`);
  }
}

export async function list() {
  return getItem(KEY, []);
}

// タブの並び順を返す。保存データが実在するグループと食い違っていても正規化で吸収するため、
// 呼び出し側は「重複なし・欠落なし」の並びを前提にできる。書き込みは行わない。
export async function listTabOrder() {
  const [groups, storedOrder] = await Promise.all([list(), getItem(ORDER_KEY, [])]);
  return normalizeTabOrder(storedOrder, groups);
}

// 並び替えの確定値を保存する。tabOrderへの書き込み口はここに絞ってあるため、
// 順序が意図せず変わる経路を減らせる。集合が現在のタブと一致しない値は保存しない。
export async function reorderTabs(orderedTabIds) {
  const current = await listTabOrder();
  if (!isValidTabOrder(orderedTabIds, current)) {
    throw new ValidationError("orderedTabIds", "orderedTabIds must exactly match the current tabs");
  }
  const next = [...orderedTabIds];
  await setItem(ORDER_KEY, next);
  return next;
}

export async function create(name) {
  validateName(name);
  const groups = await list();
  if (groups.length >= MAX_GROUPS) {
    throw new ValidationError("limit", `cannot exceed ${MAX_GROUPS} groups`);
  }
  const group = { id: crypto.randomUUID(), name };
  await setItem(KEY, [...groups, group]);
  return group;
}

export async function rename(id, name) {
  validateName(name);
  const groups = await list();
  const index = groups.findIndex((group) => group.id === id);
  if (index === -1) {
    throw new NotFoundError(id);
  }
  const updated = { ...groups[index], name };
  const nextGroups = [...groups];
  nextGroups[index] = updated;
  await setItem(KEY, nextGroups);
  return updated;
}

export async function remove(id) {
  const groups = await list();
  const index = groups.findIndex((group) => group.id === id);
  if (index === -1) {
    throw new NotFoundError(id);
  }
  await removeByGroup(id);
  const nextGroups = [...groups];
  nextGroups.splice(index, 1);
  await setItem(KEY, nextGroups);

  // 表示は listTabOrder() の正規化で除去されるが、作成と削除を繰り返したときに
  // 実在しないIDが保存データへ蓄積するのを防ぐため、発生元で刈り取る。
  const storedOrder = await getItem(ORDER_KEY, []);
  if (Array.isArray(storedOrder) && storedOrder.includes(id)) {
    await setItem(
      ORDER_KEY,
      storedOrder.filter((tabId) => tabId !== id),
    );
  }
}
