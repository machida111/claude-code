/**
 * e-Stat API（社会・人口統計体系「市区町村データ」）から大阪府43市町村の実データを取得し、
 * Supabaseの municipalities テーブルへ upsert するシードスクリプト。
 *
 * 使い方:
 *   1. .env.local に ESTAT_APP_ID / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定
 *      （NEXT_PUBLIC_SUPABASE_URL を SUPABASE_URL としても使用可）
 *   2. npm run seed
 *
 * ESTAT_APP_ID が無い場合は supabase/seed.sql をSupabaseのSQL Editorで直接実行すればよい
 * （このスクリプトが取得する値と同じ実データが埋め込まれている）。
 */
import { createClient } from "@supabase/supabase-js";

const ESTAT_APP_ID = process.env.ESTAT_APP_ID;
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 大阪府43市町村の e-Stat 地域コードと、システム内で使う短縮ID・地域ブロック・代表座標。
// (地域コードは e-Stat getStatsList/getMetaInfo で確認した「市区町村データ」時点のもの)
const MUNICIPALITIES: {
  code: string;
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}[] = [
  { code: "27100", id: "osaka", name: "大阪市", region: "osaka-city", lat: 34.6937, lng: 135.5023 },
  { code: "27140", id: "sakai", name: "堺市", region: "sen-hoku", lat: 34.5732, lng: 135.483 },
  { code: "27202", id: "kishiwada", name: "岸和田市", region: "sen-nan", lat: 34.4614, lng: 135.3719 },
  { code: "27203", id: "toyonaka", name: "豊中市", region: "kita", lat: 34.7815, lng: 135.4695 },
  { code: "27204", id: "ikeda", name: "池田市", region: "kita", lat: 34.8167, lng: 135.4308 },
  { code: "27205", id: "suita", name: "吹田市", region: "kita", lat: 34.7617, lng: 135.5158 },
  { code: "27206", id: "izumiotsu", name: "泉大津市", region: "sen-hoku", lat: 34.5033, lng: 135.4106 },
  { code: "27207", id: "takatsuki", name: "高槻市", region: "kita", lat: 34.8467, lng: 135.6178 },
  { code: "27208", id: "kaizuka", name: "貝塚市", region: "sen-nan", lat: 34.4339, lng: 135.3486 },
  { code: "27209", id: "moriguchi", name: "守口市", region: "kita-kawachi", lat: 34.7377, lng: 135.5697 },
  { code: "27210", id: "hirakata", name: "枚方市", region: "kita-kawachi", lat: 34.8153, lng: 135.6567 },
  { code: "27211", id: "ibaraki", name: "茨木市", region: "kita", lat: 34.8156, lng: 135.5686 },
  { code: "27212", id: "yao", name: "八尾市", region: "naka-kawachi", lat: 34.6247, lng: 135.6003 },
  { code: "27213", id: "izumisano", name: "泉佐野市", region: "sen-nan", lat: 34.4067, lng: 135.3097 },
  { code: "27214", id: "tondabayashi", name: "富田林市", region: "minami-kawachi", lat: 34.5, lng: 135.5983 },
  { code: "27215", id: "neyagawa", name: "寝屋川市", region: "kita-kawachi", lat: 34.7642, lng: 135.6283 },
  {
    code: "27216",
    id: "kawachinagano",
    name: "河内長野市",
    region: "minami-kawachi",
    lat: 34.4581,
    lng: 135.5686,
  },
  { code: "27217", id: "matsubara", name: "松原市", region: "minami-kawachi", lat: 34.5772, lng: 135.5442 },
  { code: "27218", id: "daito", name: "大東市", region: "kita-kawachi", lat: 34.7136, lng: 135.6197 },
  { code: "27219", id: "izumi", name: "和泉市", region: "sen-hoku", lat: 34.4839, lng: 135.4181 },
  { code: "27220", id: "minoh", name: "箕面市", region: "kita", lat: 34.8256, lng: 135.47 },
  { code: "27221", id: "kashiwara", name: "柏原市", region: "naka-kawachi", lat: 34.5789, lng: 135.6444 },
  { code: "27222", id: "habikino", name: "羽曳野市", region: "minami-kawachi", lat: 34.5561, lng: 135.61 },
  { code: "27223", id: "kadoma", name: "門真市", region: "kita-kawachi", lat: 34.7369, lng: 135.5789 },
  { code: "27224", id: "settsu", name: "摂津市", region: "kita", lat: 34.7736, lng: 135.5661 },
  { code: "27225", id: "takaishi", name: "高石市", region: "sen-hoku", lat: 34.5225, lng: 135.4344 },
  { code: "27226", id: "fujiidera", name: "藤井寺市", region: "minami-kawachi", lat: 34.5697, lng: 135.5983 },
  { code: "27227", id: "higashiosaka", name: "東大阪市", region: "naka-kawachi", lat: 34.6797, lng: 135.6008 },
  { code: "27228", id: "sennan", name: "泉南市", region: "sen-nan", lat: 34.3833, lng: 135.2822 },
  {
    code: "27229",
    id: "shijonawate",
    name: "四條畷市",
    region: "kita-kawachi",
    lat: 34.7378,
    lng: 135.6478,
  },
  { code: "27230", id: "katano", name: "交野市", region: "kita-kawachi", lat: 34.7692, lng: 135.6667 },
  {
    code: "27231",
    id: "osakasayama",
    name: "大阪狭山市",
    region: "minami-kawachi",
    lat: 34.5133,
    lng: 135.5683,
  },
  { code: "27232", id: "hannan", name: "阪南市", region: "sen-nan", lat: 34.3489, lng: 135.2244 },
  { code: "27301", id: "shimamoto", name: "島本町", region: "kita", lat: 34.8867, lng: 135.6767 },
  { code: "27321", id: "toyono", name: "豊能町", region: "kita", lat: 34.9264, lng: 135.4581 },
  { code: "27322", id: "nose", name: "能勢町", region: "kita", lat: 34.9694, lng: 135.4231 },
  { code: "27341", id: "tadaoka", name: "忠岡町", region: "sen-hoku", lat: 34.4989, lng: 135.4319 },
  { code: "27361", id: "kumatori", name: "熊取町", region: "sen-nan", lat: 34.4083, lng: 135.3489 },
  { code: "27362", id: "tajiri", name: "田尻町", region: "sen-nan", lat: 34.4142, lng: 135.3125 },
  { code: "27366", id: "misaki", name: "岬町", region: "sen-nan", lat: 34.3181, lng: 135.1461 },
  { code: "27381", id: "taishi", name: "太子町", region: "minami-kawachi", lat: 34.5061, lng: 135.6394 },
  { code: "27382", id: "kanan", name: "河南町", region: "minami-kawachi", lat: 34.4881, lng: 135.6486 },
  {
    code: "27383",
    id: "chihayaakasaka",
    name: "千早赤阪村",
    region: "minami-kawachi",
    lat: 34.4494,
    lng: 135.6394,
  },
];

interface EstatValue {
  "@area": string;
  "@cat01": string;
  "@time": string;
  $: string;
}

async function fetchEstat(statsDataId: string, cdCat01: string): Promise<EstatValue[]> {
  const codes = MUNICIPALITIES.map((m) => m.code).join(",");
  const url = new URL("https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData");
  url.searchParams.set("appId", ESTAT_APP_ID!);
  url.searchParams.set("statsDataId", statsDataId);
  url.searchParams.set("cdCat01", cdCat01);
  url.searchParams.set("cdArea", codes);
  url.searchParams.set("limit", "100000");

  const res = await fetch(url.toString());
  const json = await res.json();
  const value = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function latestByAreaCat(values: EstatValue[]): Map<string, { time: string; value: number }> {
  const map = new Map<string, { time: string; value: number }>();
  for (const v of values) {
    if (v.$ === "***" || v.$ === "-" || v.$ === "X") continue;
    const key = `${v["@area"]}:${v["@cat01"]}`;
    const existing = map.get(key);
    if (!existing || v["@time"] > existing.time) {
      map.set(key, { time: v["@time"], value: Number(v.$) });
    }
  }
  return map;
}

async function main() {
  if (!ESTAT_APP_ID) {
    console.error(
      "ESTAT_APP_ID が未設定です。.env.local に設定するか、代わりに supabase/seed.sql をSupabaseのSQL Editorで実行してください。"
    );
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。.env.local を確認してください。");
    process.exit(1);
  }

  console.log("e-Statから人口・世帯数（2020年国勢調査）を取得中...");
  const pop = latestByAreaCat(await fetchEstat("0000020101", "A1101,A1303,A7101"));

  console.log("e-Statから2015年国勢調査の人口（人口増減率算出用）を取得中...");
  const pop2015raw = await fetchEstat("0000020101", "A1101");
  const pop2015 = new Map<string, number>();
  for (const v of pop2015raw) {
    if (v["@time"] === "2015100000" && v.$ !== "***" && v.$ !== "-") {
      pop2015.set(v["@area"], Number(v.$));
    }
  }

  console.log("e-Statから面積を取得中...");
  const area = latestByAreaCat(await fetchEstat("0000020102", "B1101"));

  console.log("e-Statから財政力指数を取得中...");
  const fiscal = latestByAreaCat(await fetchEstat("0000020104", "D2201"));

  const rows = MUNICIPALITIES.map((m) => {
    const p2020 = pop.get(`${m.code}:A1101`)?.value;
    const a65 = pop.get(`${m.code}:A1303`)?.value;
    const hh = pop.get(`${m.code}:A7101`)?.value;
    const areaHa = area.get(`${m.code}:B1101`)?.value;
    const fi = fiscal.get(`${m.code}:D2201`)?.value;
    const p2015 = pop2015.get(m.code);

    if (p2020 == null || a65 == null || hh == null || areaHa == null || fi == null) {
      throw new Error(`${m.name} (${m.code}) のデータが取得できませんでした。`);
    }

    const popChangeRate = p2015 ? (Math.pow(p2020 / p2015, 1 / 5) - 1) * 100 : 0;

    return {
      id: m.id,
      name: m.name,
      region: m.region,
      lat: m.lat,
      lng: m.lng,
      population: p2020,
      pop_change_rate: Math.round(popChangeRate * 100) / 100,
      aging_rate: Math.round((a65 / p2020) * 100 * 10) / 10,
      area_km2: Math.round((areaHa / 100) * 100) / 100,
      households: hh,
      fiscal_index: fi,
    };
  });

  console.log(`${rows.length}件の市町村データをSupabaseへ書き込みます...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from("municipalities").upsert(rows, { onConflict: "id" });
  if (error) {
    throw new Error(`Supabaseへの書き込みに失敗しました: ${error.message}`);
  }
  console.log("完了しました。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
