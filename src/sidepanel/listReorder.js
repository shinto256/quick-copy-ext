// 並び順の組み替え。DOMにも chrome API にも依存しない純関数。
// 境界での無変更（先頭で上へ、末尾で下へ動かしても順序を変えない）を
// ユニットテストで担保するために切り出している。

// list の index の要素を offset 分だけ移動した新しい配列を返す。
// 移動先または index が範囲外のときは順序を変えずに複製を返す（エラーにしない）。
export function moveInList(list, index, offset) {
  const next = [...list];
  const target = index + offset;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) {
    return next;
  }
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

// 並び替えと決定に使うキーの判定。項目カードとグループの縦リストの双方がこれを通ることで、
// 「両者でキーが同一」（spec 008 FR-005）がコード上で保証される。
// event は key と altKey の2プロパティだけを読む。

// 並び替えの移動操作なら移動量（-1 / 1）、それ以外は null を返す。
export function reorderOffsetFromKey(event) {
  if (!event.altKey) {
    return null;
  }
  if (event.key === "ArrowUp") {
    return -1;
  }
  if (event.key === "ArrowDown") {
    return 1;
  }
  return null;
}

// 決定操作か。ネイティブのボタンは Enter と Space の双方で発火するため、
// tabindex を付けた要素をボタン相当に見せるうえで両方受ける。
// Space のページスクロールの抑止は呼び出し側の責務。
export function isActivationKey(event) {
  return event.key === "Enter" || event.key === " ";
}
