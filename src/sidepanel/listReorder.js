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
