# Node.js Skill（おすすめ設定）

このドキュメントは、Node.js プロジェクトを「迷いなく・安全に・再現性高く」運用するための推奨設定をまとめたものです。
（本リポジトリは Nuxt を含む Node.js プロジェクトを想定）

## 1) まず決めること（推奨の前提）

- **Node.js**: LTS を使用（例: **Node 20 LTS**）
- **パッケージマネージャ**: **npm**（`package-lock.json` をコミット、CI は `npm ci`）
- **実行環境の固定**: ローカル/CI/本番で Node バージョンを揃える

### 推奨ファイル

- `.nvmrc` で Node を固定（例: `20` または `20.11.1`）
- `package.json` に `engines` を追加

例（`package.json`）:

```json
{
  "engines": {
    "node": ">=20"
  }
}
```

## 2) 依存管理（再現性と速度）

- `package-lock.json` は常に最新に保つ
- CI/自動化では **`npm ci`** を使う（`npm install` は使わない）
- Node の `npm` は同一メジャーで揃える（環境差分の原因になりやすい）

推奨コマンド:

```bash
# ローカル（通常）
npm install

# CI（再現性重視）
npm ci

# 依存の健全性
npm audit
npm audit fix
```

## 3) スクリプト設計（npm scripts）

「誰がどこで実行しても同じ結果」を目標に、最低限以下を揃えるのが推奨です。

- `dev`: 開発サーバ
- `build`: 本番ビルド
- `start` or `preview`: ビルド成果物の起動/確認
- `lint`: 静的解析
- `format`: フォーマット
- `test`: テスト

例:

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest"
  }
}
```

## 4) TypeScript（推奨）

- 新規/中規模以上は TypeScript を推奨
- `noImplicitAny` などの厳しさは、チームの熟度に合わせて段階的に
- まずは **型チェックを CI に入れる** のが効果的

推奨:

- `typecheck` スクリプトを用意
- Nuxt なら `nuxi typecheck` を使うケースが多い

```json
{
  "scripts": {
    "typecheck": "nuxi typecheck"
  }
}
```

## 5) Lint / Format（ESLint + Prettier）

目的を分けます。

- **ESLint**: バグ予防（未使用変数、誤用、危険なパターン）
- **Prettier**: 体裁統一（レビューを「内容」に集中）

推奨運用:

- `lint` は CI で必須
- `format` は任意（ただし PR 前に実行推奨）
- VS Code では「保存時フォーマット」を有効化

## 6) テスト（最小セットの考え方）

- まずは「壊れやすい箇所」からユニットテスト
- 重要なユースケースは E2E（必要になってからで OK）

推奨:

- Unit: Vitest / Jest
- UI/E2E: Playwright（必要なら）

CI では最低 `test` を回す。

## 7) 環境変数（`.env`）

- `.env` はローカル用、機密はコミットしない
- `.env.example` を用意して **必要キーを明文化**
- CI/本番は環境変数（Secrets）で注入

推奨チェック:

- 起動時に必須 env がなければエラーで落とす（黙って動かさない）

## 8) ログとエラーハンドリング

- 例外は握りつぶさない
- サーバ側は「原因が追えるログ」を残す
- 機密（トークン等）をログに出さない

## 9) セキュリティ（最低限）

- `npm audit` を定期的に実行
- 依存追加前にメンテ状態（最終更新、スター/採用例、脆弱性）を確認
- 任意で GitHub の Dependabot を有効化

## 10) CI（GitHub Actions の推奨イメージ）

推奨の順番（失敗しやすい順で早く落とす）:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`（あるなら）
4. `npm test`
5. `npm run build`

ポイント:

- Node バージョンを固定（matrix で複数バージョン検証も可）
- キャッシュ（`~/.npm`）で高速化

## 11) リリース/運用の小技

- `npm version` / `git tag` でバージョンを管理（必要なら）
- 破壊的変更は `CHANGELOG` かリリースノートへ
- 依存更新は「小さく・頻繁に」

---

## チェックリスト（導入時）

- [ ] Node を LTS に固定（`.nvmrc` / `engines`）
- [ ] `package-lock.json` をコミットし、CI は `npm ci`
- [ ] `lint` / `test` / `build` を scripts に用意
- [ ] `.env.example` を用意し、必須 env を明記
- [ ] CI で `lint` と `build` を必須化
