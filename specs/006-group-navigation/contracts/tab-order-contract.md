# Contract: tabOrder 正規化モジュール（新規）

対象: `src/storage/tabOrder.js`（新規ファイル）

DOM にも `chrome` API にも依存しない純関数モジュール。`groupRepository`（storage層）と
`sidepanel` / `groupPanel`（UI層）の双方から使う。

## エクスポート

```text
UNASSIGNED_TAB_ID: "__unassigned__"
normalizeTabOrder(storedOrder: unknown, groups: {id: string}[]): string[]
isValidTabOrder(candidate: unknown, normalizedOrder: string[]): boolean
```

---

## UNASSIGNED_TAB_ID

未分類タブを表すセンチネル。値は `"__unassigned__"`。

既存 `src/sidepanel/itemFilter.js` の同名定数と**同じ値**であり、`itemFilter.js` は本モジュールからの
再エクスポートに置き換える。

```js
// src/sidepanel/itemFilter.js
export { UNASSIGNED_TAB_ID } from "../storage/tabOrder.js";
```

既存の import 経路（`sidepanel.js:6`、`tests/unit/itemFilter.test.js:2`）は変更しない。

---

## normalizeTabOrder(storedOrder, groups)

保存されている並び順と実在するグループを突き合わせ、正規化した並び順を返す。

### 振る舞い

以下を順に適用する。

1. `storedOrder` が配列でない場合（`undefined` / `null` / 壊れた値）は空配列として扱う。
2. `storedOrder` の要素のうち、`UNASSIGNED_TAB_ID` でもなく `groups` に存在する `id` でもないものを除去する。
3. 重複する要素は最初の出現のみ残す。
4. 結果に `UNASSIGNED_TAB_ID` が含まれていなければ、**先頭**に追加する。
5. `groups` の各 `id` のうち結果に含まれていないものを、`groups` の配列順で**末尾**に追加する。

### 戻り値の性質（事後条件）

- `UNASSIGNED_TAB_ID` をちょうど1つ含む
- 重複を含まない
- `groups` の全 `id` を含む
- `UNASSIGNED_TAB_ID` と `groups` の `id` 以外を含まない
- 要素数は `groups.length + 1`
- 入力の `storedOrder` / `groups` を変更しない（非破壊）

### エラー

投げない。壊れた入力はすべて上記のルールで吸収する。

### テスト観点

- `storedOrder` が空配列のとき、`["__unassigned__", ...groups の配列順]` を返す。
- `storedOrder` が `undefined` / `null` / 配列でない値のとき、空配列と同じ結果を返す。
- `groups` が空配列のとき、`["__unassigned__"]` を返す。
- `storedOrder` に削除済みグループのIDが含まれるとき、そのIDが除去される。
- `storedOrder` に同じIDが複数含まれるとき、最初の出現のみ残る。
- `storedOrder` に `"__unassigned__"` が含まれないとき、先頭に追加される。
- `storedOrder` の途中に `"__unassigned__"` があるとき、その位置が保持される（先頭へ移動しない）。
- `groups` に `storedOrder` 未収録のグループがあるとき、`groups` の配列順で末尾に追加される。
- 未収録グループが複数あるとき、`groups` の配列順が末尾でも保たれる。
- 除去・重複排除・センチネル補完・末尾追加が同時に必要な入力で、4ルールすべてが適用される。
- 引数として渡した配列・オブジェクトが変更されない。
- `groups` 50件・`storedOrder` 51要素の入力で要素数51を返す。

---

## isValidTabOrder(candidate, normalizedOrder)

並び替えの確定値が、現在の正規化済み並び順と**同じ集合**かを判定する。
`reorderTabs` の入力検証に使う（既存 `itemRepository.reorderGroup` の検証と同じ考え方）。

### 振る舞い

以下すべてを満たす場合に `true`、いずれかを満たさない場合に `false` を返す。

1. `candidate` が配列である
2. `candidate.length === normalizedOrder.length`
3. `candidate` に重複がない
4. `candidate` の全要素が `normalizedOrder` に含まれる

順序は問わない（並び替えなので順序が変わるのが正常）。

### エラー

投げない。判定結果を `boolean` で返す。

### テスト観点

- `normalizedOrder` を並び替えただけの配列に対して `true` を返す。
- `normalizedOrder` と完全に同一の配列に対して `true` を返す。
- 要素数が異なる配列に対して `false` を返す。
- 重複を含む配列に対して `false` を返す。
- `normalizedOrder` に無いIDを含む配列に対して `false` を返す。
- `normalizedOrder` の要素が欠けている配列に対して `false` を返す（要素数が同じでも別のIDで埋められて
  いれば4の条件で `false`）。
- 配列でない値（`undefined` / `null` / 文字列 / オブジェクト）に対して `false` を返す。
