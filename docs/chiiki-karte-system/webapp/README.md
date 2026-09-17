# 地域課題カルテシステム（Next.js + Supabase 実装）

`docs/chiiki-karte-system/app.html` の単体HTMLプロトタイプから、実際にSupabaseへ接続する
Next.jsアプリへ移行したものです。

**このフェーズの対象範囲**：地域課題マップ／市町村カルテ（担当者メモ含む）のみ。
相談・訪問履歴管理・ダッシュボード・アンケート分析・AI分析は未実装（後続フェーズ）。

## 1. セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` に以下を設定してください。

| 変数 | 取得元 | 必須 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseプロジェクトの Settings > API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上（`npm run seed` でe-Statから再取得する場合のみ） | シード時のみ |
| `ESTAT_APP_ID` | [e-Stat API](https://www.e-stat.go.jp/api/) で発行したAppId（同上） | シード時のみ |

## 2. Supabaseにスキーマ・データを投入

Supabase CLIを使う場合：

```bash
supabase link --project-ref <あなたのproject-ref>
supabase db push          # supabase/migrations を適用
```

CLIを使わない場合は、SupabaseダッシュボードのSQL Editorで
`supabase/migrations/0001_init.sql` → `supabase/seed.sql` の順に実行してください。

`supabase/seed.sql` には、e-Stat（政府統計の総合窓口）「社会・人口統計体系　市区町村データ」から
取得した大阪府43市町村の実データ（2020年国勢調査の人口・高齢人口・世帯数、面積、財政力指数）が
埋め込まれています。データを最新化したい場合は、e-Stat APIのAppIdを取得して

```bash
npm run seed
```

を実行すると、`scripts/seed.ts` が同じ統計表からその時点の最新値を取得し直してSupabaseへ書き込みます。

## 3. 起動

```bash
npm run dev
```

`http://localhost:3000` で地域課題マップが開きます（`/map`, `/karte`, `/karte/[id]`）。

## 4. 実装済み・未実装の状態

- ✅ 地域課題マップ：Leafletで国土地理院タイル（淡色地図）を表示し、`public/osaka-municipalities.geojson`
  （国土数値情報「行政区域データ N03」をシンプル化・大阪市/堺市は区を結合したもの）でコロプレス表示。
  表示・パン可能範囲はポリゴンの外形にフィットさせて大阪府内に固定する。スコアはSupabaseの
  `municipalities`テーブルからサーバーコンポーネントで取得した実データから算出。
- ✅ 市町村カルテ：基礎指標・課題スコア（8指標レーダーチャート）・担当者メモ。メモはServer Action
  経由でSupabaseの`municipality_notes`テーブルに保存（`localStorage`は使用していない）。
- ✅ 課題スコアはSupabaseから取得した実データ（人口・高齢化率・財政力指数等）から`lib/scoring.ts`で
  決定的に算出（HTML版の`computeScores`と同じロジック）。
- ⏳ 職員認証（Supabase Auth）：未実装。現在はRLSで匿名キーの読み書きを許可している（開発用設定。
  `supabase/migrations/0001_init.sql`のコメント参照）。
- ⏳ AI分析・相談訪問履歴・ダッシュボード・アンケート分析：このフェーズでは対象外。

`public/osaka-municipalities.geojson` は国土数値情報「行政区域データ（N03）」由来のポリゴン（[niiyz/JapanCityGeoJSON](https://github.com/niiyz/JapanCityGeoJSON)のミラー経由）を、大阪市・堺市は行政区を結合し、Leafletでの表示に十分な精度まで簡略化（Douglas-Peucker、shapelyの`simplify`）して生成したものです。境界データを更新する場合は、同じ手順（結合→`make_valid`→`simplify`→座標精度を丸めてGeoJSON出力）を再実行してください。
