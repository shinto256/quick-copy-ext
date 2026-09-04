# Contract: dragReorder 並び替え機構（新規）

対象: `src/sidepanel/dragReorder.js`（新規ファイル）

Pointer Events による縦リストの並び替え機構。DOM操作とコールバックのみに依存し、グループの概念も
永続化も持たない。項目一覧への流用（本specではスコープ外）と、キーボード操作の後付け（同スコープ外）を
可能にするための境界。

## エクスポート

```text
attachDragReorder(container: HTMLElement, options: Options): () => void
```

戻り値は解除関数。呼ぶと登録したイベントリスナーをすべて外す。

## Options

```text
{
  rowSelector: string,             // 並び替え対象の行を特定するセレクタ（例: ".group-row"）
  ignoreSelector?: string,         // 行内でドラッグ・タップ判定から除外する要素のセレクタ
  threshold?: number,              // ドラッグ開始と判定する移動距離(px)。既定 5
  canDrag?: () => boolean,         // false のとき並び替えを開始しない。既定は常に true
  onActivate?: (row: HTMLElement) => void,
  onReorder: (orderedRows: HTMLElement[]) => void | Promise<void>,
  scrollContainer?: HTMLElement,   // 実際にスクロールする要素。既定は container 自身
  handleSelector?: string,         // ドラッグを開始できる要素のセレクタ。既定は行全体
}
```

`handleSelector` を指定すると、そのセレクタに一致する要素を押した操作だけがドラッグの候補になり、
行本体を押した操作はタップの候補としてのみ扱われる（ハンドルのタップでは `onActivate` を呼ばない）。
省略すれば従来どおり行全体からドラッグできる。詳細は
[009-item-reorder-handle/contracts/drag-handle-contract.md](../../009-item-reorder-handle/contracts/drag-handle-contract.md)
を参照。項目カードは `".item-card-handle"` を指定し、グループの縦リストは指定しない。

`container` 自身がスクロールしない場合は `scrollContainer` を渡す。項目一覧のようにドキュメントが
スクロールする場合は `document.scrollingElement` を指定する。自動スクロールの発動判定は、
ドキュメントがスクロールする場合はビューポート、それ以外は `scrollContainer` の矩形で行う。

### canDrag の適用範囲

`canDrag()` が `false` を返す間は**並び替えのみ**を無効化する。`onActivate`（タップ）は引き続き通知する。

グループ名で絞り込んでいる最中でもグループの切り替えは行える必要があるため（FR-005 と FR-016 の
両立）、この区別が必要。

## 振る舞い

### ドラッグ開始の判定

1. `container` 上の `pointerdown` を受け、`event.target.closest(rowSelector)` で行を特定する。
   行が見つからない場合、または `ignoreSelector` に一致する要素の上で発生した場合は何もしない。
2. `event.button` が0以外（右クリック・中クリック）の場合は何もしない。
3. 押した座標・そのときの `container.scrollTop`・対象行を記録し、`row.setPointerCapture(event.pointerId)`
   で以降のポインタイベントを掴む。`event.preventDefault()` でテキスト選択を抑止する。
4. この時点では**まだドラッグ開始とみなさない**。行の見た目も変えない。

### 閾値の判定（FR-009a）

- `pointermove` で押した座標からの距離が `threshold` 以上になった時点で、`canDrag()` を評価する。
  - `true` ならドラッグ開始とする（行を浮かせ、以降の移動で挿入位置を更新する）。
  - `false` ならドラッグを開始せず、そのポインタ操作を無効化する（`pointerup` でも `onActivate` を
    呼ばない。押したまま動かした操作を切替として扱わないため）。
- `threshold` に達しないまま `pointerup` した場合は `onActivate(row)` を呼ぶ。`onReorder` は呼ばない。
- 1回のポインタ操作で `onActivate` と `onReorder` の両方が呼ばれることはない。

### ドラッグ中

1. ドラッグ開始時に**1回だけ**、各行の位置（`container` 内の相対オフセット）と高さ、および
   行間の余白（リストの `gap`）を計測する。以降は再計測しない。相対オフセットはスクロールしても
   変わらないため、自動スクロール中も再計測が不要。
2. 掴んだ行に `transform: translateY(移動量)` を当てる。移動量は
   `現在のポインタY - 押したポインタY + (scrollContainer.scrollTop - 押したときのscrollTop)`。
3. 挿入位置は「掴んだ行の中心が、他の行の中心をいくつ越えたか」で求める。
   `pointermove` ごとの矩形計測は行わない。**行の高さが揃っていなくても正しく動く**。
4. 挿入位置が変わったときのみ、掴んだ行以外の各行に退避の `transform` を当てる。
   退避量は `掴んだ行の高さ + 行間の余白`（＝掴んだ行が抜けたときに下の行が繰り上がる量）。
   - 下方向へ移動中: 開始indexより後ろで挿入位置以下の行を `translateY(-退避量)`
   - 上方向へ移動中: 挿入位置以上で開始indexより前の行を `translateY(+退避量)`
   - それ以外の行は `transform` を解除
   退避には `transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)` を適用する（FR-014）。
5. ポインタが `scrollContainer` の可視領域の上端・下端から30px以内にある間、
   `requestAnimationFrame` ループで `scrollContainer.scrollTop` を1フレームあたり11px動かし、
   そのたびに手順2〜4を再適用する（FR-015）。ポインタが静止していてもスクロールは継続する。

### ドロップ（確定）

1. `pointerup` で自動スクロールのループを停止する。
2. 掴んだ行を最終位置へ `transform` で180msかけて遷移させる。最終位置は、下へ移した場合は
   移動先の行の末尾（`移動先.top + 移動先.height - 掴んだ行.height`）、上へ移した場合は
   移動先の行の先頭（`移動先.top`）。
3. 遷移完了後、DOMの並びを挿入位置どおりに入れ替え、全行の `transform` と `transition` を解除する。
   アニメーション中はDOMを触らない（確定時のレイアウト変化によるカクつきを避けるため）。
4. `onReorder(orderedRows)` を呼ぶ。`orderedRows` は並び替え後のDOM順の行要素の配列。
5. 挿入位置が開始indexと同じ場合も `onReorder` を呼ぶ（呼び出し側で同一判定するより単純）。

### 中断（FR-017）

`pointercancel` を受けた場合、および解除関数が呼ばれた場合:

1. 自動スクロールのループを停止する。
2. 全行の `transform` / `transition` / ドラッグ中のクラスを解除し、DOMは入れ替えない。
3. `onReorder` も `onActivate` も呼ばない。

## CSS 側の前提

`dragReorder` は以下を前提とする。満たすのは呼び出し側（`groupPanel.css` 相当のスタイル）の責務。

| 前提 | 内容 |
|------|------|
| 行の高さ | 揃っていなくてよい（可変高に対応済み）。ただしドラッグ中に高さが変わる行は想定しない |
| `touch-action` | タッチでもドラッグさせたい場合は行に `touch-action: none` を指定する。指定しない場合、タッチ操作ではブラウザのスクロールが優先され `pointercancel` でドラッグが中断される |
| スクロール | `container` 自身がスクロールしない場合は `scrollContainer` を渡す |
| 重なり順 | ドラッグ中の行に付与するクラスで `z-index` を上げ、影を付けられるようにする |

`dragReorder` が行に付与するクラスは `dragging` / `shifting` / `settling` の3つ。
行の種類（`.group-row` / `.item-card`）を問わないため、スタイルは共通で定義できる。

## エラー

`attachDragReorder` 自身は例外を投げない。`onReorder` が返した Promise が reject した場合は
**呼び出し側の責務**として扱い、`dragReorder` は DOM の並びを戻さない
（`groupPanel` が `listTabOrder()` から再描画して整合を取る。FR-018）。

## 契約検証方法

DOM操作が中心のため、既存specと同方針でユニットテスト対象外とする。
[quickstart.md](../quickstart.md) の手動検証シナリオで以下を確認する。

- 行を掴んで動かすと兄弟行が退避し、離すと挿入位置に吸着する
- 5px未満の移動で離すとグループが切り替わる（`onActivate`）
- 5px以上動かして離すとグループが切り替わらず並び替えが確定する（`onReorder`）
- リストの端でポインタを止めると自動スクロールが継続する
- 三点リーダーの上で押してもドラッグもタップ通知も発生しない
- 絞り込み中（`canDrag()` が `false`）は掴んでも並び替えが始まらないが、タップでの切替は行える
- ドラッグ中に他ウィンドウへ切り替えるなどで中断すると、並びが元に戻る
