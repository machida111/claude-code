-- 地域課題マップ・市町村カルテシステム: 初期スキーマ
-- 対象範囲（このフェーズ）: 地域課題マップ / 市町村カルテ のみ。
-- 相談・訪問履歴管理・ダッシュボード・アンケート分析・AI分析は対象外（後続フェーズで追加）。

create table if not exists municipalities (
  id text primary key,                 -- 短縮ID（例: 'osaka', 'sakai'）
  name text not null,                  -- 市町村名
  region text not null,                -- 地域ブロック（osaka-city/kita/kita-kawachi/naka-kawachi/minami-kawachi/sen-hoku/sen-nan）
  lat double precision not null,
  lng double precision not null,
  population integer not null,             -- 人口（2020年国勢調査）
  pop_change_rate numeric(5,2) not null,   -- 人口増減率%（2015→2020年の年率換算）
  aging_rate numeric(5,2) not null,        -- 高齢化率%（65歳以上人口／総人口, 2020年国勢調査）
  area_km2 numeric(8,2) not null,          -- 面積km2
  households integer not null,             -- 世帯数（2020年国勢調査）
  fiscal_index numeric(4,2) not null,       -- 財政力指数（総務省, 直近公表年度）
  data_source text not null default 'e-stat:社会・人口統計体系(市区町村データ)',
  updated_at timestamptz not null default now()
);

comment on table municipalities is '大阪府43市町村の基礎統計マスタ。値はe-Statの実データを基にシード投入する。';

-- 課題スコア（8指標）は基礎統計から決定的に算出できるため、テーブルは持たずビューで提供する。
-- 本番でスコアの手動上書き・時系列保存が必要になった時点で issue_scores テーブルを追加する。

create table if not exists municipality_notes (
  municipality_id text primary key references municipalities(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

comment on table municipality_notes is '市町村カルテの担当者メモ。市町村1件につき1レコード（この段階では職員共有の単一メモ）。';

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_municipality_notes_updated_at on municipality_notes;
create trigger trg_municipality_notes_updated_at
  before update on municipality_notes
  for each row execute function set_updated_at();

-- RLS: このフェーズでは職員認証を実装していないため、匿名キーによる読み書きを許可する。
-- 職員ログイン（Supabase Auth）を追加する段階で、書き込みは認証済みユーザーに限定するポリシーへ差し替えること。
alter table municipalities enable row level security;
alter table municipality_notes enable row level security;

drop policy if exists "municipalities are publicly readable" on municipalities;
create policy "municipalities are publicly readable"
  on municipalities for select
  using (true);

drop policy if exists "municipality_notes are publicly readable" on municipality_notes;
create policy "municipality_notes are publicly readable"
  on municipality_notes for select
  using (true);

drop policy if exists "municipality_notes are publicly writable (dev only)" on municipality_notes;
create policy "municipality_notes are publicly writable (dev only)"
  on municipality_notes for insert
  with check (true);

drop policy if exists "municipality_notes are publicly updatable (dev only)" on municipality_notes;
create policy "municipality_notes are publicly updatable (dev only)"
  on municipality_notes for update
  using (true);
