-- 地域課題分析カルテ（ベータ版）引き継ぎ用DB（2026-09-25時点）
-- Supabase の SQL Editor か MCP の apply_migration で実行する。何度実行しても同じ状態になる（既存行は置き換え）
-- RLS を有効にし、ポリシーは作らない：公開キー（anon）からは読めず、ダッシュボード・サービスキー・MCPからだけ読める
-- e-Stat のアプリケーションIDは入れないこと

create table if not exists public.handoff_status (
  id int primary key default 1 check (id = 1),
  project text not null,
  repository text not null,
  branch text not null,
  latest_commit text not null,
  artifact_url text,
  artifact_version int,
  summary text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.handoff_changes (
  commit_sha text primary key,
  committed_on date not null,
  title text not null
);
create table if not exists public.handoff_deliverables (
  name text primary key,
  kind text not null,
  location text not null,
  commit_sha text,
  note text
);
create table if not exists public.handoff_rules (
  key text primary key,
  rule text not null
);
create table if not exists public.handoff_life_scenes (
  sort int primary key,
  key text not null unique,
  label text not null,
  indicator_keys text not null,
  reference_values text
);
create table if not exists public.handoff_open_items (
  id bigint generated always as identity primary key,
  category text not null,
  item text not null unique,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.handoff_status enable row level security;
alter table public.handoff_changes enable row level security;
alter table public.handoff_deliverables enable row level security;
alter table public.handoff_rules enable row level security;
alter table public.handoff_life_scenes enable row level security;
alter table public.handoff_open_items enable row level security;

insert into public.handoff_status (id, project, repository, branch, latest_commit, artifact_url, artifact_version, summary, updated_at)
values (1, '地域課題分析カルテ（ベータ版）', 'machida111/claude-code', 'claude/pensive-mayer-gacgyv', '77924a8',
  'https://claude.ai/artifact/Xi3tvZ8pzCfiqBkT4RAEij', 35,
  '大阪府43市町村の地域課題を8画面（地域課題・住民目線・防災・生活場面別課題の4マップ、一覧表、市町村カルテ、分析レポート、指標の計算方法）で示す単一HTMLのツール。ベータ版として機能は一通りそろっている。PRは未作成。直近は指標名「公共交通」を「自家用車への依存度」に統一。',
  now())
on conflict (id) do update set project=excluded.project, repository=excluded.repository, branch=excluded.branch,
  latest_commit=excluded.latest_commit, artifact_url=excluded.artifact_url, artifact_version=excluded.artifact_version,
  summary=excluded.summary, updated_at=excluded.updated_at;

insert into public.handoff_changes (commit_sha, committed_on, title) values
  ('77924a8', '2026-09-24', '指標名「公共交通」を「自家用車への依存度」に統一し、説明文をそろえる'),
  ('c5d4499', '2026-09-24', '生活場面を4場面に組み替え、判定根拠に基準値との差を表示、名称を地域課題分析カルテに統一'),
  ('1cf905f', '2026-09-24', '生活場面別課題（生活場面マップ・カルテ・分析レポート）を追加'),
  ('552e098', '2026-09-24', '説明文の食い違いを修正し、カルテの基本指標に年次を表示'),
  ('dcc417a', '2026-09-24', '地域ブロックの「北大阪地域」を大阪府の区分どおり豊能地域・三島地域に分割'),
  ('073bea8', '2026-09-24', '欠損値の扱いを統一し、判定根拠ポップアップ・並び順・カルテ内ナビを追加'),
  ('bdb5b55', '2026-09-24', '一覧表・CSV保存・印刷レイアウトを追加し、データ作成スクリプトを収録'),
  ('3eb05ae', '2026-09-24', '防災を独立した「防災マップ」に分離（4災害を別指標・別スコア化）'),
  ('21b4573', '2026-09-24', '防災指標に地震の揺れ・液状化を追加し、人口配分を250mメッシュに精緻化'),
  ('812ca2e', '2026-09-24', 'Fix three mislabelled indicators and add overlap and trend analysis'),
  ('e3e5e80', '2026-09-24', 'Sharpen the analysis report: raw scores, peer groups, named neighbours'),
  ('ccf38cc', '2026-09-24', 'Mark the app as a beta, and fix the phone navigation row'),
  ('fc591a0', '2026-09-24', 'Measure DX by what the municipality itself has done'),
  ('782477b', '2026-09-19', 'Replace the transit estimate with measured car dependence'),
  ('6aeeba3', '2026-09-19', 'Fix the report repeating one municipality, and give it the resident view'),
  ('9562288', '2026-09-19', 'Remove the per-municipality memo field'),
  ('de2cd0a', '2026-09-19', 'Rebuild the resident-view indicators around access difficulty, not supply'),
  ('ce0ef9f', '2026-09-18', 'Exclude 空き家 from scoring for the 5 municipalities without published data'),
  ('f6f13af', '2026-09-18', 'Fix 子育て・教育環境 to use schools per child population, not per land area'),
  ('c67148c', '2026-09-18', 'Pull real data from the RESAS website (not the API) into the app'),
  ('cc1c7ba', '2026-09-18', 'Add small-municipality shrinkage correction to the 4 population-based resident indicators'),
  ('293e580', '2026-09-18', 'Show the resident-perspective (5-indicator) score on the karte screen'),
  ('da043ac', '2026-09-18', 'Add a resident-perspective issue map (5 real indicators) as a new screen'),
  ('72d36cb', '2026-09-18', 'Merge the indicator-guide page into app.html as a 4th nav screen'),
  ('c40d072', '2026-09-18', 'Replace 6 estimated issue scores with real official data where available'),
  ('0b5b7be', '2026-09-18', 'Add an explanation page for the 8 issue-score indicators and data sources'),
  ('6d1c6aa', '2026-09-18', 'Rename "AI分析" screen to "分析レポート" to match its rule-based implementation'),
  ('ead93bc', '2026-09-17', 'Drop the Next.js/Supabase implementation, remove the fake login badge'),
  ('d14da37', '2026-09-17', 'Switch the issue map from circle markers to a real choropleth'),
  ('3c69846', '2026-09-17', 'Add a real Next.js + Supabase implementation (map + karte only)'),
  ('2d13b40', '2026-09-17', 'Replace estimated municipality data with real e-Stat figures'),
  ('ebc02e3', '2026-09-17', 'Switch issue map basemap to GSI''s pale (data-overlay) tiles'),
  ('6e72c2d', '2026-09-17', 'Constrain the issue map to Osaka Prefecture, drop survey analysis'),
  ('8a7ae20', '2026-09-17', 'Use real GSI map tiles for the issue map, drop history/dashboard'),
  ('84b8f79', '2026-09-17', 'Add regional issue map & municipality karte system (Osaka)')
on conflict (commit_sha) do update set committed_on=excluded.committed_on, title=excluded.title;

insert into public.handoff_deliverables (name, kind, location, commit_sha, note) values
  ('app.html', 'html', 'docs/chiiki-karte-system/app.html', '77924a8', '本体（単一HTML、383,059バイト）。SHA-256 049458eb43651252ee80d7d8e82ad34266d3353c98a00d32accff9b311f4abaa'),
  ('公開版（Artifact）', 'url', 'https://claude.ai/artifact/Xi3tvZ8pzCfiqBkT4RAEij', '77924a8', 'Version 35。非公開（本人のみ）'),
  ('地域課題分析カルテ_自家用車への依存度版.html', 'html', '（チャットで送付）', '77924a8', 'app.html と同一内容の配布用ファイル'),
  ('README.md', 'doc', 'docs/chiiki-karte-system/README.md', '77924a8', '画面・データ構造・欠損値・生活場面の説明'),
  ('tools/', 'scripts', 'docs/chiiki-karte-system/tools/', 'bdb5b55', '統計値の作り直しスクリプト（estat.py・geo.py・dx.py）と更新手順'),
  ('HANDOFF.md', 'doc', 'docs/chiiki-karte-system/handoff/HANDOFF.md', null, 'この引き継ぎメモ')
on conflict (name) do update set kind=excluded.kind, location=excluded.location, commit_sha=excluded.commit_sha, note=excluded.note;

insert into public.handoff_rules (key, rule) values
  ('missing_values', '非公表値はデータなしとして扱い、推定値や中間値による補完は行わない。総合スコアは利用可能な指標だけで算出する（空き家：未公表の5町村、地元で買えない度：河内長野市・東大阪市）'),
  ('high_line', '「課題が高い」の判定ラインは丸め前スコア3.5（HIGH_LINE）。課題の重なり・広域連携・生活場面別課題で共通'),
  ('life_scene_basis', '生活場面別課題では新しい基準値や総合スコアを作らない。判定根拠の基準値はスコア3点に相当する元の値で、既存の式から逆算したもの'),
  ('cooperation_wording', '広域連携は「共同検討の候補」と書き、共同運営できると断定しない'),
  ('no_assertion', '生活場面別課題は、施策の必要性・住民の実態・個人の困難度を断定しない'),
  ('naming', 'ツール名「地域課題分析カルテ（ベータ版）」、画面名「生活場面別課題マップ」「市町村カルテ」、指標名「自家用車への依存度」'),
  ('transit_description', '通勤・通学に自家用車を利用する人の割合から、日常移動における自家用車への依存度を把握する代理指標です。公共交通の路線数、便数、所要時間を直接評価したものではありません。'),
  ('regions', '地域ブロックは大阪府の区分どおり8つ（大阪市域・豊能・三島・北河内・中河内・南河内・泉北・泉南）'),
  ('secret', 'e-Stat のアプリケーションIDは、ファイル・コミット・DB・チャットに書かない（ESTAT_APPID 環境変数でだけ渡す）'),
  ('no_external_api', '外部API呼び出し・ログイン・サーバーなしの単一HTMLとして動かす')
on conflict (key) do update set rule=excluded.rule;

insert into public.handoff_life_scenes (sort, key, label, indicator_keys, reference_values) values
  (1, 'elderly', '高齢者の日常生活・移動', 'aging,community,transit,food,clinic', null),
  (2, 'child', '子育て・通学', 'school,transit,clinic,population,landslide,flood,quake,liquefy', null),
  (3, 'nocar', '車を利用しにくい住民の日常生活', 'transit,food,clinic', 'railCover1km（鉄道駅1km圏人口。スコア化されていないため重なり数に含めない）'),
  (4, 'disaster', '災害時に支援が必要となりやすい生活環境', 'aging,community,transit,landslide,flood,quake,liquefy', null)
on conflict (sort) do update set key=excluded.key, label=excluded.label, indicator_keys=excluded.indicator_keys, reference_values=excluded.reference_values;

insert into public.handoff_open_items (category, item) values
  ('判断待ち', '分析レポートの「主な課題」は3.3以上、「課題の重なり」「広域連携」は3.5以上と判定ラインが違う。そろえるか'),
  ('検討', '空き家・担い手不足・DX・地元で買えない度は、どの生活場面にも入っていない'),
  ('データ更新', '国勢調査は2020年時点。2023年12月の金剛自動車の路線バス廃止などは未反映。2025年国勢調査の公表後に tools/README.md の手順で更新'),
  ('データ', 'バス路線データ（国土数値情報）は事業者の収録漏れと便数なしのため不採用。代わりのデータがあれば再検討'),
  ('データ', '民生委員の数など見守る側の体制の統計は市町村単位でないため未採用')
on conflict (item) do nothing;
