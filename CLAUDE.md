# CLAUDE.md

## 開発フロー（Reqord × Spec Kit）

1. 新機能に着手する前に `reqord req list --status approved` で
   対象要件が承認済みか確認する。未承認なら着手せず、要件化を提案する。
2. `reqord req show <id>` の内容を要約し、それを踏まえて
   `/speckit.specify` を実行する（要件をゼロから聞き直さない）。
3. `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze`
   の順で進め、`/speckit.implement` の前に必ずユーザーに最終確認を取る。
4. 実装完了後、`reqord impact analyze` を実行し、影響範囲があれば
   Reqordの該当要件/仕様の更新PRを提案する。
5. ブランチ名・Issue番号・Reqord要件IDは一致させる（例: feature/req-000012）。
