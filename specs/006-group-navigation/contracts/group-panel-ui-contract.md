# Contract: 全グループパネルとタブバーのUI契約

対象: `src/sidepanel/groupPanel.js`（新規）、`src/sidepanel/sidepanel.html`、
`src/sidepanel/sidepanel.css`、`src/sidepanel/sidepanel.js`

`002-side-panel-ui` / `003-sidepanel-list-enhancements` / `005-bulk-group-change` の既存UI契約に対する
変更・追加分。

---

## 1. タブバーの変更（`sidepanel.js` / `sidepanel.css`）

### 撤去するもの

| 対象 | 箇所 |
|------|------|
| タブ内の三点リーダーボタン | `sidepanel.js` の `tab-menu-button` 生成（FR-029） |
| タブのメニュー（名称変更・削除） | `sidepanel.js` の `tab-menu` 生成 |
| タブのインライン入力（名称変更・新規作成） | `sidepanel.js` の `tab-rename-input` 生成、`createGroupInlineInput` |
| 関連する状態変数 | `openTabMenuGroupId` / `renamingGroupId` / `creatingGroup` |
| タブ末尾の `＋` ボタン | `tab-add`（グループ追加はパネル内へ移動。FR-028） |
| 対応するCSS | `.tab-menu` / `.tab-menu-button` / `.tab-rename-input` / `.tab-add` |
| `document` クリックでのタブメニュー閉じ処理 | `sidepanel.js` のクリックハンドラ内の `.tab-wrapper` 判定 |

`submitCreateGroup` / `submitRenameGroup` / `deleteGroup` の処理内容は `groupPanel.js` へ移す。

### 追加・変更するもの

- `renderTabs` は `GroupRepository.listTabOrder()` の順序でタブを描画する（FR-012）。未分類を先頭に
  固定する処理は削除し、`tabOrder` 内の位置に従って描画する（FR-010）。
- タブのラベルは、`UNASSIGNED_TAB_ID` なら「未分類」、それ以外は `groups` から引いた `name`。
- 各タブに `title` 属性としてグループ名の全文を設定する（FR-024）。
- タブバー末尾に**パネルを開くボタン**を固定表示する（FR-001）。
  - ラベルにタブ総数（`listTabOrder().length`。未分類を含む）を併記する。
  - `position: sticky; right: 0` 相当でタブバーの横スクロールに追従せず常に見える位置に置く。
  - 選択モード中（`selectionMode === true`）は `disabled` にする（FR-007）。既存の選択ツールバーの
    ボタンと同じ扱い。
- `init()` の初期選択タブを `groups[0].id` から `listTabOrder()[0]` に変更する（FR-013）。
- CSS: `.tab-button` に `max-width` と `text-overflow: ellipsis` を追加する（FR-024）。
  既存の `white-space: nowrap` は維持する。

---

## 2. 全グループパネル（`sidepanel.html` / `groupPanel.js`）

### DOM 構造

既存の項目登録フォームと同じオーバーレイのパターンを使う。

```text
#group-panel-overlay   .form-overlay 相当（position: fixed; inset: 0）、hidden 属性で開閉
└─ #group-panel        パネル本体。オーバーレイいっぱいに広げる（既存 .item-form の max-width: 360px は適用しない）
   ├─ ヘッダー
   │  ├─ #group-panel-filter    絞り込み入力（type="search"）
   │  └─ #group-panel-close     閉じるボタン
   ├─ #group-panel-list         縦リスト（overflow-y: auto）
   │  └─ .group-row × N         各行
   ├─ #group-panel-empty        絞り込み結果0件の表示（hidden 属性で切替）
   ├─ #group-panel-add          「グループを追加」
   └─ #group-panel-error        エラー表示（role="alert"、hidden 属性で切替）
```

### 開閉

| 操作 | 挙動 |
|------|------|
| タブバー末尾のボタン | パネルを開く。絞り込み入力へフォーカス（FR-008a）。選択中タブの行が表示範囲に入る位置までスクロールし、その行に選択中のスタイルを当てる（FR-008b） |
| `#group-panel-close` | パネルを閉じる。グループは切り替えない（FR-008） |
| `Escape` キー | パネルを閉じる。グループは切り替えない（FR-008） |
| 行のタップ（`onActivate`） | そのグループへ切り替えてパネルを閉じる（FR-005） |

パネルを閉じるときは、経路にかかわらず絞り込み文字列・行メニューの開閉・インライン編集の状態を
すべてクリアする（[research.md](../research.md) の R-011）。

`Escape` はパネルが開いている間のみ処理する。インライン編集中の `Escape` は編集の取消が優先され、
パネルは閉じない。

フォーカストラップ（`Tab` のパネル内循環）は実装しない（spec Assumptions でスコープ外）。

### 行（`.group-row`）の構造

すべての行は**同じ高さ**にする（`dragReorder` の前提。行内で折り返す要素を置かない）。

```text
.group-row[data-tab-id]
├─ .group-row-handle    掴み手のアイコン（装飾。ドラッグは行全体で受け付ける）
├─ .group-row-name      グループ名。overflow: hidden + text-overflow: ellipsis + title 属性で全文
├─ .group-row-count     所属項目件数（FR-003）
└─ .group-row-menu-button   三点リーダー。未分類の行では描画しない（FR-026）
```

- `data-tab-id` には `UNASSIGNED_TAB_ID` またはグループの `id` を入れる。
- 未分類の行はグループ名を「未分類」とし、三点リーダーを持たない。並び替えの対象には含める（FR-010）。
- 選択中のタブに対応する行には選択中のスタイルを当てる（FR-008b）。
- 絞り込み中は掴み手のアイコンを非表示にし、並び替えができないことを示す。

### 所属項目件数

パネルを開くとき、および行の内容を更新するときに `ItemRepository.list()` を1回呼び、`groupId` ごとに
件数を数える。未分類は `groupId === null` の件数。`itemRepository` への関数追加は行わない。

### 絞り込み（FR-004）

- 入力のたびに縦リストを再描画する。判定は `name.toLowerCase().includes(term.toLowerCase())`
  （既存 `filterItemsByTabAndSearch` と同じ方針）。
- 未分類の行も「未分類」という名前で絞り込みの対象にする。
- 結果が0件のとき `#group-panel-list` を空にし、`#group-panel-empty` を表示する。
- 絞り込み文字列が空でない間は `canDrag()` が `false` を返し、並び替えを開始できない（FR-016）。
  行のタップによる切替は引き続き行える。

---

## 3. 並び替え（`groupPanel.js` × `dragReorder.js`）

`groupPanel` は初期化時に1度だけ `attachDragReorder` を呼ぶ。

```text
attachDragReorder(listEl, {
  rowSelector: ".group-row",
  ignoreSelector: ".group-row-menu-button",
  threshold: 5,
  canDrag: () => 絞り込みが空 かつ インライン編集中でない,
  onActivate: (row) => selectTab(row.dataset.tabId) してパネルを閉じる,
  onReorder: (rows) => reorderTabs(rows.map(r => r.dataset.tabId)),
})
```

### `onReorder` の処理

1. `rows` から `data-tab-id` を取り出して `GroupRepository.reorderTabs()` に渡す。
2. 成功したらタブバーを再描画する（`renderTabs`。FR-012）。
3. `ValidationError` を含む例外が発生したら `#group-panel-error` にメッセージを表示し、
   `listTabOrder()` から縦リストを再描画して保存済みの順序に戻す（FR-018 / SC-009）。

### 並び替えを無効化する条件

| 条件 | 根拠 |
|------|------|
| 絞り込み文字列が空でない | FR-016 |
| 行がインライン編集中、または新規追加の入力行が表示中 | FR-025a |

いずれも `canDrag()` で判定する。無効化されるのは並び替えのみで、タップによる切替は行える。

---

## 4. 行内インライン編集（`groupPanel.js`）

撤去するタブ内インライン入力（`sidepanel.js` の `tab-rename-input`、`Enter` 確定 / `Escape` 取消 /
自動フォーカス）の挙動を行の中へ移す。

### 名称変更（FR-025）

1. 行の三点リーダー → 「名称を変更」で、その行を入力欄に差し替える。
2. 入力欄は `maxlength="20"`（FR-021）、現在の名前を初期値とし、自動フォーカスして全選択する。
3. 入力欄と同じ行に文字数表示（`n / 20`）を置く（FR-022）。
4. `Enter` で `GroupRepository.rename(id, value)` を呼び、成功したら行の表示に戻してタブバーを
   再描画する。`Escape` で変更せずに行の表示へ戻す。
5. `ValidationError` は `#group-panel-error` に表示し、入力欄は開いたままにする。

### グループ追加（FR-028）

1. `#group-panel-add` を押すと、縦リストの**末尾に入力用の行**を挿入して自動フォーカスする。
2. 入力欄の仕様は名称変更と同じ（`maxlength="20"`、文字数表示）。
3. `Enter` で `GroupRepository.create(value)` を呼ぶ。成功したら入力行を取り除き、縦リストと
   タブバーを再描画する。新規グループは `listTabOrder()` の正規化により末尾に現れる（FR-019）。
4. `Escape` で入力行を取り除く（グループは作成しない）。
5. グループ上限50件の `ValidationError` は `#group-panel-error` に表示する。

### 削除（FR-027）

1. 行の三点リーダー → 「削除」で確認ダイアログを出す。文面に**あわせて削除される所属項目の件数**を
   含める（既存の `deleteGroup` の文面に件数を追加する形）。
2. 確認されたら `GroupRepository.remove(id)` を呼ぶ。
3. 削除したグループが選択中だった場合、削除後の `listTabOrder()[0]` を選択タブにする（FR-030）。
4. 縦リストとタブバー、項目一覧を再描画する。
5. 未分類の行には削除の操作を出さない（FR-026）。

---

## 5. グループ名の文字数（`sidepanel.html`）

- 項目編集フォームのグループ選択（`#item-group`）は `<select>` のままで変更なし。
- グループ名の入力欄はパネル内のインライン編集のみになるため、`maxlength="20"` はそこで付与する。
- `groupRepository.NAME_MAX_LENGTH` と `maxlength` の値が乖離しないよう、`maxlength` は
  `NAME_MAX_LENGTH` を import して設定する（HTML属性に直書きしない）。

---

## 6. `sidepanel.js` と `groupPanel.js` の連携

`groupPanel` は `sidepanel.js` の内部状態を直接触らない。初期化時にコールバックを受け取る。

```text
initGroupPanel({
  getSelectedTabId: () => string,        // 現在選択中のタブID
  isSelectionMode: () => boolean,        // 選択モード中かどうか（パネルを開く操作の無効化判定に使う）
  onSelectTab: (tabId) => Promise<void>, // グループ切替（sidepanel.js の selectTab を渡す）
  onTabsChanged: () => Promise<void>,    // タブバーの再描画（renderTabs を渡す）
  onItemsChanged: () => Promise<void>,   // 項目一覧の再描画（renderList を渡す。グループ削除時に使う）
}) => { open(), close(), isOpen() }
```

`sidepanel.js` はタブバー末尾のボタンから `open()` を呼ぶだけで、パネル内部の描画には関与しない。

---

## 契約検証方法

- **自動検証**: `src/storage/tabOrder.js` と `groupRepository` の追加関数はユニットテスト対象
  （[tab-order-contract.md](./tab-order-contract.md) /
  [group-repository-additions.md](./group-repository-additions.md)）。
- **手動検証**: パネルの描画・絞り込み・ドラッグ・インライン編集は、既存specと同方針で
  ユニットテスト対象外とし、[quickstart.md](../quickstart.md) の手順で確認する。
