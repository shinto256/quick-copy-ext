// タブバーに表示するタブを決める純関数。DOMにも chrome API にも依存しない。
// 全部収まる / 一部だけ収まる / 1つも収まらない、選択中のタブが収まる位置にある / ない、
// と条件が多いため切り出してユニットテストで網羅する。

// 先頭から詰めて availableWidth に収まるインデックスの集合を返す。
// n個並べたときの合計幅は 幅の合計 + gap * (n - 1)。1個目に gap は足さない。
function fitFromStart(tabWidths, availableWidth, gap, skipIndex = -1) {
  const result = new Set();
  let used = 0;
  for (let i = 0; i < tabWidths.length; i++) {
    if (i === skipIndex) {
      continue;
    }
    const next = used === 0 ? tabWidths[i] : used + gap + tabWidths[i];
    if (next > availableWidth) {
      break;
    }
    used = next;
    result.add(i);
  }
  return { indexes: result, used };
}

// availableWidth は「タブバーの内容領域 − 末尾のボタンの幅 − その前の gap」を
// 呼び出し側が計算して渡す（末尾のボタンは常に表示するため）。
export function visibleTabIndexes(tabWidths, availableWidth, gap, selectedIndex) {
  const hasSelection = selectedIndex >= 0 && selectedIndex < tabWidths.length;

  // 手順1: 先頭から詰める
  const plain = fitFromStart(tabWidths, availableWidth, gap);

  // 手順2: 選択中が既に含まれる（または選択なし）なら、他を余分に隠さない
  if (!hasSelection || plain.indexes.has(selectedIndex)) {
    return plain.indexes;
  }

  // 手順4: 選択中だけで幅を超えるなら、選択中のみを表示する
  const selectedWidth = tabWidths[selectedIndex];
  if (selectedWidth > availableWidth) {
    return new Set([selectedIndex]);
  }

  // 手順3: 選択中の幅を先に確保し、残りに先頭から詰め直す
  const remaining = availableWidth - selectedWidth - gap;
  const rest = fitFromStart(tabWidths, remaining, gap, selectedIndex);
  rest.indexes.add(selectedIndex);
  return rest.indexes;
}
