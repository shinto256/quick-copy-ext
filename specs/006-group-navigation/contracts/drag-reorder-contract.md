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
  ignoreSelector?: string,         // 行内でドラッグ・タップ判定から除外する要素のセレクタ（例: ".group-row-menu-button"）
  threshold?: number,              // ドラッグ開始と判定する移動距離(px)。既定 5
  canDrag?: () => boolean,         // false のとき並び替えを開始しない。既定は常に true
  onActivate?: (row: HTMLElement) => void,
  onReorder: (orderedRows: HTMLElement[]) => void | Promise<void>,
}
```

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

1. ドラッグ開始時に、先頭行の高さを `getBoundingClientRect().height` で**1回だけ**計測して行高とする。
   以降は再計測しない。
2. 掴んだ行に `transform: translateY(移動量)` を当てる。移動量は
   `現在のポインタY - 押したポインタY + (container.scrollTop - 押したときのscrollTop)`。
3. 挿入位置は `開始index + Math.round(移動量 / 行高)` を `[0, 行数 - 1]` にクランプして求める。
   `pointermove` ごとの矩形計測は行わない。
4. 挿入位置が変わったときのみ、掴んだ行以外の各行に退避の `transform` を当てる。
   - 下方向へ移動中: 開始indexより後ろで挿入位置以下の行を `translateY(-行高)`
   - 上方向へ移動中: 挿入位置以上で開始indexより前の行を `translateY(+行高)`
   - それ以外の行は `transform` を解除
   退避には `transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)` を適用する（FR-014）。
5. ポインタが `container` の上端・下端から30px以内にある間、`requestAnimationFrame` ループで
   `container.scrollTop` を1フレームあたり11px動かし、そのたびに手順2〜4を再適用する（FR-015）。
   ポインタが静止していてもスクロールは継続する。

### ドロップ（確定）

1. `pointerup` で自動スクロールのループを停止する。
2. 掴んだ行を最終位置（`(挿入位置 - 開始index) * 行高`）へ `transform` で180msかけて遷移させる。
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
| 行の高さ | すべての行が同じ高さで、内容によって変わらない（1行固定・末尾省略） |
| `touch-action` | 行に `touch-action: none` を指定する（ドラッグ中にコンテナのスクロールへ取られないため） |
| `container` のスクロール | `container` 自身が `overflow-y: auto` でスクロールする |
| 重なり順 | ドラッグ中の行に付与するクラスで `z-index` を上げ、影を付けられるようにする |

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
