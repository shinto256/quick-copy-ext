---
description: Reqordの要件を読み込み、要約したうえで /speckit.specify に案内する
---

`reqord req show $ARGUMENTS` を実行し、対象要件の内容を取得する。

取得した内容を要約し、以下を含めてユーザーに提示する:

- 要件ID
- タイトル
- ステータス（承認済みかどうか）
- 主要な要件内容の要約

その上で、この要約を入力として `/speckit.specify` を実行するようユーザーに案内する。
要件が `approved` 状態でない場合は、着手前に承認を得るよう促し、
`/speckit.specify` の実行は推奨しない。
