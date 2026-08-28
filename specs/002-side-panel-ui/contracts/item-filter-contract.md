# Contract: itemFilter（タブ絞り込み＋検索）

**モジュール**: `src/sidepanel/itemFilter.js`

## 関数シグネチャ

```text
filterItemsByTabAndSearch(items: Item[], selectedGroupId: string | "__unassigned__", searchTerm: string): Item[]
```

## 入力

- `items`: `itemRepository.list()` が返す項目配列（既存スキーマ、変更なし）。
- `selectedGroupId`: 現在選択中のタブに対応するグループID。未分類タブの場合は文字列
  `"__unassigned__"` を渡す（`groupId: null` の項目と対応させるため）。
- `searchTerm`: 検索欄の入力値（前後空白は呼び出し側でtrim済みを渡す）。空文字は「絞り込みなし」。

## 出力

- 条件に一致する `Item` の配列。順序は入力 `items` の順序を保持する。

## 振る舞い

1. `selectedGroupId === "__unassigned__"` の場合、`item.groupId === null` の項目のみを対象とする。
2. それ以外の場合、`item.groupId === selectedGroupId` の項目のみを対象とする。
3. `searchTerm` が空文字でない場合、上記1の結果からさらに `item.name` に大文字小文字を区別せず
   `searchTerm` を部分一致で含む項目のみに絞り込む。
4. 入力 `items` が空配列、または一致する項目が0件の場合は空配列を返す（例外を投げない）。

## 非対象

- `item.value` に対する検索（マスク時の表示意図と矛盾するため対象外。spec.md Assumptions参照）。
- ソート順の変更（本関数は絞り込みのみを責務とする）。

## テスト観点（tests/unit/itemFilter.test.js）

- 未分類タブ選択時、`groupId: null` の項目のみ返る。
- 通常グループタブ選択時、該当`groupId`の項目のみ返る。
- 検索語ありの場合、グループ絞り込み結果からさらに名前部分一致で絞り込まれる。
- 検索語が大文字小文字混在でも一致する（例: "ｻﾝﾌﾟﾙ" と "サンプル" は別物として扱い、
  半角/全角・大文字小文字の正規化は行わない。単純な `toLowerCase()` 比較のみ）。
- 該当0件の場合、空配列が返る。
