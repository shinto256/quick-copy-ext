# Contract: tabOverflow 表示するタブの判定（新規）

対象: `src/sidepanel/tabOverflow.js`（新規ファイル）

タブの幅の配列と使える幅から、表示するタブのインデックスを決める純関数。DOMにも `chrome` API にも
依存しない。境界の条件が多いため切り出してユニットテスト対象にする。

## エクスポート

```text
visibleTabIndexes(
  tabWidths: number[],
  availableWidth: number,
  gap: number,
  selectedIndex: number,
): Set<number>
```

---

## 引数

| 引数 | 内容 |
|------|------|
| `tabWidths` | 各タブの幅（px）。並び順と同じ順序 |
| `availableWidth` | タブを置ける幅（px）。**末尾のボタンの幅とその前の `gap` を差し引いた値**を呼び出し側が計算して渡す |
| `gap` | タブ間の余白（px）。CSS の `gap` の実測値 |
| `selectedIndex` | 選択中のタブの位置。該当なしの場合は `-1` |

## 振る舞い

以下を順に適用する。

1. 並び順の先頭から `幅 + gap`（2個目以降は前の要素との `gap` を含む）を積み上げ、
   `availableWidth` に収まる範囲を表示候補にする。
2. 手順1の候補に `selectedIndex` が含まれていれば、その候補をそのまま返す
   （**他のタブを余分に隠さない**）。
3. 含まれていなければ、`selectedIndex` の幅を先に確保し、残りの幅に先頭から入るところまでを
   追加した集合を返す。
4. 手順3でも `selectedIndex` の幅が `availableWidth` を超える場合、`selectedIndex` のみを
   含む集合を返す。
5. `selectedIndex` が `-1` または範囲外の場合は、手順1の候補をそのまま返す。

### 幅の積み上げ方

`n` 個のタブを並べたときの合計幅は `幅の合計 + gap * (n - 1)`。1個目には `gap` を足さない。

### 戻り値の性質（事後条件）

- 返す集合の要素は `tabWidths` の有効なインデックスのみ。
- `selectedIndex` が有効な場合、返す集合に必ず含まれる。
- `tabWidths` の合計幅（`gap` を含む）が `availableWidth` 以下なら、すべてのインデックスを含む。
- `availableWidth` が0以下の場合、`selectedIndex` が有効ならそれのみ、無効なら空集合。
- 引数を変更しない（非破壊）。

### エラー

投げない。負の値や空配列は上記のルールで吸収する。

---

## テスト観点

### 全部収まる / 収まらない

- `tabWidths` の合計（`gap` 込み）が `availableWidth` 以下のとき、すべてのインデックスを返す。
- 合計が `availableWidth` を1px超えるとき、末尾の1個が除かれる。
- `tabWidths` が空配列のとき、空集合を返す（`selectedIndex` が `-1` の場合）。
- `availableWidth` が0のとき、`selectedIndex` が有効ならそれのみを返す。
- `availableWidth` が負のときも同様。

### `gap` の扱い

- 1個だけ入る幅のとき、`gap` は足されず先頭の1個が入る。
- 2個の幅の合計が `availableWidth` に等しく、`gap` を足すと超える場合、1個だけ返す。

### 選択中のタブ

- 選択中のタブが先頭から収まる範囲に含まれるとき、**他のタブが余分に除かれない**
  （手順1の候補と一致する）。
- 選択中のタブが収まらない位置にあるとき、選択中のタブが返す集合に含まれる。
- そのとき、選択中のタブの幅を確保した残りに先頭から入る個数だけが追加される。
- 選択中のタブだけで `availableWidth` を超えるとき、選択中のタブのみを返す。
- `selectedIndex` が `-1` のとき、先頭から収まる範囲をそのまま返す。
- `selectedIndex` が範囲外（負、または `tabWidths.length` 以上）のとき、先頭から収まる範囲を
  そのまま返す。
- 選択中のタブが末尾にあり、他のタブがすべて隠れる幅のとき、選択中のタブのみを返す。

### 非破壊

- 引数の `tabWidths` が変更されない。

### 上限規模

- タブ51個（未分類1 + グループ上限50）の入力で正しく動く。

---

## 呼び出し側の責務（`sidepanel.js`）

1. `renderTabs()` で全タブを描画した直後に、各タブの `getBoundingClientRect().width` を測る。
2. タブバーの内容領域の幅から、末尾のボタンの幅とその前の `gap` を差し引いて `availableWidth` を
   求める。
3. `visibleTabIndexes(...)` を呼び、返った集合に含まれないタブに `hidden` 属性を付ける。
   末尾のボタンには付けない。
4. 測った幅の配列とタブ要素の配列をモジュールスコープに保持し、`ResizeObserver` の通知では
   手順2〜3のみを繰り返す（DOMを作り直さない）。
5. タブバーの幅が0のときは何もしない。

## 契約検証方法

**自動検証**: `tests/unit/tabOverflow.test.js` に上記のテスト観点を実装する。DOMに依存しないため
数値の配列を渡すだけでよい。

**手動検証**: 実測と `hidden` の付け外し、`ResizeObserver` の追従は
[quickstart.md](../quickstart.md) で確認する。
