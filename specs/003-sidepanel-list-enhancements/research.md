# Phase 0 Research: サイドパネル一覧機能拡張

## 1. 並び順の保持方法

**Decision**: 項目(`Item`)に新規フィールドを追加せず、`chrome.storage.local`の`items`配列内での
要素の並び順そのものを「並び順」として扱う。並び替えは、対象グループに属する項目の相対位置を
配列内で入れ替える操作として実装する。

**Rationale**: 一覧描画（`itemFilter.filterItemsByTabAndSearch`）は`Array.prototype.filter`を
使っており、入力配列の順序をそのまま保持して返す。したがって`items`配列自体の順序を変更すれば、
タブ内の表示順もそのまま変わる。新規フィールド（例: `order: number`）を追加する案は、
作成・削除のたびに全項目のorder値を再採番する必要が生じ、実装・テストの複雑度が増す。配列の
相対位置を直接操作する方式は、既存のデータモデル（[[req-000001]]で定義済みの`Item`型）を
一切変更せずに実現できる。

**Alternatives considered**:
- `order: number`フィールドをItemに追加: 上記の理由で複雑度が増すため却下。
- グループごとに別配列で順序管理: `groups`と`items`の整合性を二重管理することになり、
  グループ削除時の「未分類化」処理（[[req-000004]]既存ロジック）との整合コストが高いため却下。

## 2. 並び替えの操作契約(ドラッグ&ドロップ／上下移動の統一)

**Decision**: `itemRepository`に`reorderGroup(groupId, orderedIds)`を1つ追加し、ドラッグ&ドロップ・
上下移動のどちらもこの1関数経由で永続化する。UI側（`sidepanel.js`）は、ドラッグ&ドロップ操作で
得られた新しい並び順、または上下移動で1つ入れ替えた並び順を`orderedIds`（対象グループの項目ID配列）
として組み立て、`reorderGroup`を呼び出す。

**Rationale**: 単一の永続化契約に統一することで、UI側の操作手段が増えても（将来的にキーボード操作
等を追加する場合も）データ層の変更が不要になる。`groupId`とその時点で対象グループに属する項目ID
集合が完全一致することをRepository側で検証し（[[req-000001]]のバリデーション方針を踏襲）、
不整合な呼び出しは`ValidationError`とする。

**Alternatives considered**:
- ドラッグ&ドロップ用・上下移動用に別関数を用意する: 永続化ロジックの重複が発生するため却下。

## 3. テーマ手動固定の実現手段

**Decision**: `settings`に`theme: "auto" | "light" | "dark"`（デフォルト`"auto"`）を追加する。
UI側は`document.documentElement.dataset.theme`に`"light"`または`"dark"`をセットし（`"auto"`の
場合は属性を外す）、CSS側は既存の`@media (prefers-color-scheme: dark)`によるトークン切替に加えて、
`:root[data-theme="dark"]`による強制ダーク、`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }`
のように「ライト固定時はシステム設定によるダーク化を無効化する」ガードを追加する。

**Rationale**: 002-side-panel-uiで導入済みの`prefers-color-scheme`によるトークン切替の仕組みを
壊さずに、手動固定を追加できる。CSSのみで完結し、JavaScript側はルート要素への属性付与のみで
済むため実装・テストコストが低い。

**Alternatives considered**:
- インラインスタイル(JS側で色を直接指定): CSSの一元管理が崩れ保守性が下がるため却下。

## 4. 選択モード・一括削除の実現手段

**Decision**: `sidepanel.js`にUI状態(`selectionMode: boolean`, `selectedItemIds: Set<string>`)を
追加する。永続化は`itemRepository`に`removeMany(ids)`を追加し、選択された全項目を1回の
`chrome.storage.local.set`呼び出しで削除する。

**Rationale**: 選択件数分`remove(id)`を逐次呼び出すと、書き込み回数が増えるだけでなく、
並行して他の操作（例: 別画面からの同時書き込み）が発生した場合に中間状態が生じうる。1回の
書き込みで完結させることで、[[req-000007]]の成功基準（選択項目の100%削除・未選択項目0件削除）
を単一トランザクション相当で保証できる。

**Alternatives considered**:
- 既存`remove(id)`をループ呼び出し: 実装は簡単だが上記の理由で却下。専用関数を追加するコストは低い。

## 5. 検索絞り込み中の並び替え無効化

**Decision**: `sidepanel.js`側で、検索キーワードが空でない場合はドラッグ&ドロップの`draggable`
属性を各カードに付与せず、上下移動メニュー項目も表示しない（UI層のみで無効化し、Repository層は
関知しない）。

**Rationale**: FR-004（検索中の並び替え無効化）はUI操作の可否の問題であり、データ層に制約を
持たせる必要はない。UI層のみで完結させることで、Repository層のテスト容易性を保つ。
