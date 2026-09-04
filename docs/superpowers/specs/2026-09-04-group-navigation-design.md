# グループナビゲーション改善 設計

作成日: 2026-09-04

## 背景と課題

グループを20個以上作成した運用で、以下の3つの課題が発生している。

1. **探しにくい** — グループは横スクロールのタブバー（`src/sidepanel/sidepanel.js` の `renderTabs`）で表示されるため、数が増えるとスクロールしないと目的のグループが見えない。一覧する手段が存在しない。
2. **並び順を変えられない** — タブは `groups` 配列の作成順で固定されており、よく使うグループを先頭に移動できない。
3. **名前が長くタブ幅を占有する** — 上限は `src/storage/groupRepository.js` の `NAME_MAX_LENGTH = 30` だが、グループ名の入力欄に `maxlength` 属性がないため、30文字を超えて入力でき保存時に初めてエラーになる。ユーザーからは「制限がない」ように見え、結果として長い名前が付けられてタブ1個あたりの幅が広がり、課題1を悪化させる。

本拡張はChrome Web Storeへの公開を予定しているため、グループが数個のユーザーと数十個のユーザーの双方が使える設計にする必要がある。

## 採用する方針

タブバーによる1クリック切替を維持したうえで、タブバー末尾に固定した「▾」ボタンから**全グループパネル**を開く。パネルは縦リストで、グループ名の絞り込み、ドラッグ&ドロップによる並び替え、名称変更、削除、追加をすべて担う。

- 課題1は、絞り込み付きの縦リストで解決する。
- 課題2は、パネル内のドラッグ&ドロップで並び替え、その順序をタブ順に反映することで解決する。
- 課題3は、入力欄への `maxlength` 付与、上限の20文字への変更、タブ表示の末尾省略で解決する。

### 検討した代替案と却下理由

- **タブバーを廃止してグループセレクタ（ドロップダウン）に一本化する案** — グループ数に対して完全にスケールするが、グループ切替が常に2クリックになる。グループが数個のユーザーには現状より不便になるため、ストア公開の観点で却下。
- **ピン留め方式（ピン留めしたグループのみタブに表示）案** — タブバーが溢れない利点はあるが、ユーザーが「ピン留め」と「並び順」の2概念を覚える必要がある。並び替えだけでほぼ同じ結果が得られるため却下。
- **並び替えを `▲▼` ボタンと「先頭へ移動」で実装する案** — 既存の項目並び替え（`moveItem`）と同じパターンで実装リスクは低いが、ドラッグ&ドロップの操作性を優先して却下。ただし将来の追加余地としてキーボード並び替えを残す（「スコープ外」参照）。

## 決定事項

| 項目 | 決定 |
| --- | --- |
| 管理操作の置き場所 | パネルに集約する。タブ内の `⋮` メニュー（`tab-menu-button`）は撤去する |
| 並び替えの操作 | ドラッグ&ドロップのみ。`▲▼` や「先頭へ移動」ボタンは設けない |
| 未分類タブ | 並び替え可能にする。名称変更・削除は不可（`⋮` を表示しない） |
| グループ名の上限 | 30文字から20文字へ変更 |
| 既存の長い名前 | 保存済みの名前は切り詰めない。表示は末尾省略、編集時のみ新上限を適用する |
| 各行の項目件数 | 表示する（0件グループの整理に有効） |
| 絞り込み中の並び替え | 無効。部分表示中に並び替えると全体順序が壊れる。既存の項目並び替えが検索中に無効なのと同じルール |
| 選択モード中の「▾」 | 無効化する。タブ切替が選択モードを解除する既存挙動（`selectTab`）と整合させる |
| 「▾」の表示 | グループ総数を併記する（例: `▾ 24`） |

## データモデル

### `groups`（既存キー、変更あり）

`[{ id, name }]` の形は変えない。ただし**配列順は意味を持たなくなる**。順序の情報源は `tabOrder` に移り、`groups` は集合として扱う。上限50件は維持する。

### `tabOrder`（新規キー）

タブの並び順を保持する唯一の情報源。

```js
["__unassigned__", "<groupId>", "<groupId>", ...]
```

`"__unassigned__"` は未分類タブを表すセンチネル。既に `src/sidepanel/itemFilter.js` に `UNASSIGNED_TAB_ID` として同じ値が定義されているため、この定数を共有する。

### 正規化

`tabOrder` は読み出しのたびに正規化する。これにより、グループの追加・削除時に `tabOrder` を更新し忘れても壊れない（自己修復）。

1. `groups` に存在しないIDを除去する（削除されたグループ）
2. `tabOrder` に含まれていないグループのIDを末尾に追加する（新規作成されたグループ）
3. `"__unassigned__"` が含まれていなければ先頭に追加する
4. 重複IDは最初の出現のみ残す

正規化結果の要素数は最大51（グループ50 + 未分類1）。

### `NAME_MAX_LENGTH`

`src/storage/groupRepository.js` の値を30から20に変更する。20文字はパネル縦リスト1行に全角で収まる限界であり、「パネルを開けば必ず全文が読める」ことを保証する値として選んだ。

既存データに20文字を超える名前があっても検証しない。`create` と `rename` の入力時のみ新上限を適用する。

## コンポーネント構成

`src/sidepanel/sidepanel.js` は現在778行あり、ここにパネルとドラッグ処理を追加すると1ファイルの責務が過大になる。以下の3ファイルを新規に切り出す。

### `src/storage/tabOrder.js`（新規）

`tabOrder` の正規化を担う純関数モジュール。`chrome` API にもDOMにも依存しない。

- `export const UNASSIGNED_TAB_ID = "__unassigned__"`
- `export function normalizeTabOrder(storedOrder, groups)` — 正規化済み配列を返す
- `export function isValidTabOrder(candidate, normalizedOrder)` — 候補配列が正規化結果と同じ集合かを判定する

`src/sidepanel/itemFilter.js` の `UNASSIGNED_TAB_ID` 定義はこのモジュールからの再エクスポートに置き換える。既存の import 経路（`sidepanel.js`、`tests/unit/itemFilter.test.js`）は変更不要。

storage層に置く理由は、`groupRepository` と `sidepanel` の双方が依存するため。逆方向（storage層がsidepanel層をimportする）を避ける。

### `src/sidepanel/dragReorder.js`（新規）

ドラッグ&ドロップのエンジン。DOM操作とコールバックのみに依存し、グループの概念を持たない。

**インターフェース**

```js
export function attachDragReorder(container, { rowSelector, rowHeight, onReorder })
```

`onReorder(orderedElements)` は並び替え確定時に1度だけ呼ばれる。戻り値として解除関数を返す。

**依存**: なし（DOM標準APIのみ）

**実装方針**

- Pointer Events（`pointerdown` / `pointermove` / `pointerup` / `pointercancel`）と `setPointerCapture` を使う。HTML5 drag and drop API は使わない。ドラッグ画像が静止スナップショットになり演出できない、タッチ操作に対応しない、という制約を避けるため。
- **行の高さを固定する**ことで、挿入位置を `Math.round(dy / rowHeight)` の単純計算で求める。`pointermove` ごとに `getBoundingClientRect` を呼ばないため軽い。
- ドラッグ中の行以外は `transform: translateY(±rowHeight)` と `transition: transform 160ms` で退避させる。これが「入れ替わっている感」を作る。
- ドロップ時は最終位置へ `transform` を180msで遷移させ、完了後にDOMを確定して `transform` を解除する。確定とアニメーションを分けることで、DOM入れ替え時のカクつきを避ける。
- コンテナ端30px以内にポインタがある間は `requestAnimationFrame` ループで自動スクロールする。スクロール量はドラッグ開始時の `scrollTop` との差分として距離計算に加算する。
- 掴む範囲は行全体。行内のボタン（`⋮`）は `pointerdown` を `stopPropagation` して除外する。
- 行には `touch-action: none` を指定し、ドラッグ中にコンテナのスクロールへ取られないようにする。

### `src/sidepanel/groupPanel.js`（新規）

全グループパネルの描画と操作。`dragReorder` を使い、`groupRepository` を呼ぶ。

**責務**

- パネルの開閉
- グループ名による絞り込み（前方一致ではなく部分一致、大文字小文字を区別しない。既存 `filterItemsByTabAndSearch` と同じ方針）
- 各行の描画（掴み手アイコン、名前、項目件数、`⋮`）
- 行の `⋮` メニュー（名称変更、削除）
- 「＋ グループを追加」
- 並び替え確定時に `groupRepository.reorderTabs` を呼ぶ

**依存**: `groupRepository`、`itemRepository`（件数集計）、`dragReorder`

**公開インターフェース**: `open()` / `close()` / `isOpen()`、および描画後に呼ぶコールバック（`onTabOrderChanged`、`onGroupsChanged`）を受け取る初期化関数。`sidepanel.js` はこのコールバックで `renderTabs` / `renderList` を呼ぶ。

### `src/storage/groupRepository.js`（変更）

- `NAME_MAX_LENGTH` を20に変更
- `export async function listTabOrder()` — `groups` と保存済み `tabOrder` を読み、`normalizeTabOrder` の結果を返す
- `export async function reorderTabs(orderedTabIds)` — `isValidTabOrder` で検証し、不一致なら `ValidationError` を投げる。妥当なら `tabOrder` キーに保存する
- `remove(id)` — `tabOrder` から該当IDを除去する処理を追加する（正規化で吸収されるが、保存データを不要に膨らませないため）

### `src/sidepanel/sidepanel.js`（変更）

- `renderTabs` を `listTabOrder()` ベースに書き換える。`groups` 配列順ではなく `tabOrder` 順に並べる
- タブの `⋮`（`tab-menu-button`）と `tab-menu`、および `renamingGroupId` / `openTabMenuGroupId` / `creatingGroup` を使ったインライン編集を撤去する。これらの責務は `groupPanel` へ移る
- タブバー末尾に「▾ N」ボタンを追加し、`groupPanel.open()` を呼ぶ。選択モード中は `disabled`
- `init()` の初期選択タブを `groups[0].id` から `listTabOrder()` の先頭要素に変更する。これにより、先頭に並べ替えたタブが起動時に開く

### `src/sidepanel/sidepanel.html`（変更）

- パネルのコンテナ要素を追加する
- グループ名の入力欄に `maxlength="20"` を付与し、文字数カウンタ（`n / 20`）を添える

### `src/sidepanel/sidepanel.css`（変更）

- タブに `max-width` と `text-overflow: ellipsis` を指定する。フルネームは `title` 属性とパネルの縦リストで確認できる
- パネル、行、ドラッグ中の状態（影、`z-index`）、退避アニメーションのスタイルを追加する
- 撤去する `tab-menu` / `tab-menu-button` / `tab-rename-input` のスタイルを削除する

## データフロー

### 並び替え

```
ユーザーが行をドラッグして離す
  → dragReorder が並び替え後の要素配列を onReorder で渡す
  → groupPanel が要素からタブID配列を組み立てる
  → groupRepository.reorderTabs(ids) で tabOrder を保存
  → onTabOrderChanged コールバック
  → sidepanel.js が renderTabs() を実行（タブ順が追従する）
```

### グループ削除

```
行の ⋮ → 削除
  → 項目件数を含む確認ダイアログ（「項目N件も削除されます」）
  → groupRepository.remove(id)（既存の removeByGroup で所属項目も削除）
  → tabOrder から除去
  → 選択中タブが削除対象なら tabOrder の先頭へ移動
  → renderTabs() / renderList()
```

## エラーハンドリング

- `reorderTabs` の検証に失敗した場合は `ValidationError` を投げる。`groupPanel` はこれを捕捉して既存の `showGroupError` にメッセージを出し、`listTabOrder()` から再描画して表示を実際の保存状態に戻す。ドラッグ結果が保存されていないのに画面上は並び替わったままになる状態を作らない。
- 名前の検証エラー（1〜20文字、上限50グループ）は既存の `ValidationError` の流れをそのまま使い、`showGroupError` に表示する。
- ドラッグ中に `pointercancel` が発生した場合は、確定せずに元の順序へ戻す。
- 絞り込み中はドラッグを無効化する。無効であることは掴み手アイコンの非表示で示す。

## テスト

既存のテスト基盤は Vitest（`npm test`）。`tests/unit/` に純関数とリポジトリのユニットテストが置かれている。`chrome.storage` は `tests/unit/chromeMock.js` でモックしている。

追加するテスト:

- `tests/unit/tabOrder.test.js` — `normalizeTabOrder` の正規化4ケース（存在しないID除去、未収録グループの末尾追加、センチネル補完、重複除去）と、それらの組み合わせ。`isValidTabOrder` の判定
- `tests/unit/groupRepository.test.js`（既存に追加） — `listTabOrder` が正規化結果を返すこと、`reorderTabs` の保存と検証エラー、`NAME_MAX_LENGTH` が20であること、`remove` が `tabOrder` からIDを除去すること

`dragReorder.js` と `groupPanel.js` はDOM操作が中心であり、既存のテストにDOM環境の構築がないため、ユニットテストの対象外とする。動作確認は `specs/*/quickstart.md` と同じ形式の手動手順書で担保する。

## 併せて修正する既存の不整合

`README.md` に「項目のドラッグ&ドロップ・上下移動による並び替え」と記載されているが、`src` 全体に `drag` の実装はなく、項目の並び替えは `▲▼` ボタン（`sidepanel.js` の `moveItem`）のみである。README の記述を実態に合わせて修正する。

## スコープ外

- **キーボードによる並び替え** — 今回はドラッグ&ドロップのみを実装する。`dragReorder` のインターフェースが「並び替え後の順序配列を返す」形になっているため、後からキーボード操作の経路を足しても永続化側の変更は不要。ストア公開後の要望に応じて追加する。
- **項目リストのドラッグ&ドロップ化** — `dragReorder` は汎用のインターフェースにしておくが、項目リストへの適用は本設計に含めない。
- **グループの入れ子・階層化** — 20〜50個規模では並び替えと絞り込みで足りると判断した。
- **使用頻度による自動並び替え** — 手動の並び替えと競合し、順序が勝手に変わる挙動はコピー作業の妨げになる。
