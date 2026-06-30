<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project LIFE Development Rules

Project LIFEの開発では、以下のルールを必ず守ること。

## 変更方針

- 既存機能を壊さない。
- 変更範囲を必要最小限にする。
- 要件にない不要な機能を追加しない。
- UIを変更する場合は、既存デザインと操作感に合わせる。
- 既存コードを再利用し、重複コードを増やさない。
- 変更範囲外のファイルや機能には手を加えない。

## 必須検証

作業完了前に、以下をすべて確認すること。

- TypeScriptエラーがないこと。
- ESLintエラーがないこと。
- Buildが成功すること。

## Git運用

検証完了後、必ず以下を実施すること。

1. `git add .`
2. `git commit`
3. `git push`

作業完了条件は「GitHubへのpush完了」とする。コード変更だけで作業完了にしないこと。

## Roadmap

1. PC・スマホ同期：完了
2. スマホUI完成
3. 生活ルーティン
4. テンプレート強化
5. 実績・習慣管理
