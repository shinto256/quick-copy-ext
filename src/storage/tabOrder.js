// タブの並び順（tabOrder）を扱う純関数モジュール。
// DOMにもchrome APIにも依存しないため、storage層とUI層の双方から使える。

export const UNASSIGNED_TAB_ID = "__unassigned__";

// 保存されている並び順と実在するグループを突き合わせ、正規化した並び順を返す。
// 保存データがどんな状態でも「重複なし・欠落なし」に収束させるため、読み出しのたびに適用する。
export function normalizeTabOrder(storedOrder, groups) {
  const groupIds = groups.map((group) => group.id);
  const knownIds = new Set(groupIds);
  const source = Array.isArray(storedOrder) ? storedOrder : [];

  const seen = new Set();
  const normalized = [];

  // ルール1・2: 実在しない値を除去し、重複は最初の出現のみ残す。
  for (const id of source) {
    if (id !== UNASSIGNED_TAB_ID && !knownIds.has(id)) {
      continue;
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push(id);
  }

  // ルール3: 未分類が欠けていれば先頭に補う。既にある場合は位置を動かさない。
  if (!seen.has(UNASSIGNED_TAB_ID)) {
    seen.add(UNASSIGNED_TAB_ID);
    normalized.unshift(UNASSIGNED_TAB_ID);
  }

  // ルール4: 未収録のグループをgroupsの配列順で末尾に足す（新規作成分がここに来る）。
  for (const id of groupIds) {
    if (!seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  }

  return normalized;
}

// 並び替えの確定値が、現在の正規化済み並び順と同じ集合かを判定する。
// 順序は問わない（並び替えなので順序が変わるのが正常）。
export function isValidTabOrder(candidate, normalizedOrder) {
  if (!Array.isArray(candidate) || candidate.length !== normalizedOrder.length) {
    return false;
  }
  const allowed = new Set(normalizedOrder);
  const seen = new Set();
  for (const id of candidate) {
    if (!allowed.has(id) || seen.has(id)) {
      return false;
    }
    seen.add(id);
  }
  return true;
}
