#!/usr/bin/env bash
# 地理データ・公開ファイルを tools/data/ にダウンロードする（APIキー不要）。
# 年度の新しい版が出たら、下の版番号（A31a-24 など）を書き換える。
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data && cd data

get() {  # get <保存名> <URL>
  if [ -s "$1" ]; then echo "skip $1"; return; fi
  echo "get  $1"
  curl -sSfL --retry 3 -A "Mozilla/5.0" -o "$1" "$2"
}

KSJ=https://nlftp.mlit.go.jp/ksj/gml/data
# 洪水浸水想定区域（想定最大規模）：府管理河川（27_10, 27_20）＋国管理河川（86_10 近畿地方整備局）
for k in 27_10 27_20 86_10; do get A31a-24_${k}_GEOJSON.zip $KSJ/A31a/A31a-24/A31a-24_${k}_GEOJSON.zip; done
get A49-21_27_GML.zip $KSJ/A49/A49-21/A49-21_27_GML.zip      # 高潮浸水想定区域
get A40-16_27_GML.zip $KSJ/A40/A40-16/A40-16_27_GML.zip      # 津波浸水想定
get N02-23_GML.zip    $KSJ/N02/N02-23/N02-23_GML.zip         # 鉄道（駅）

JSHIS=https://www.j-shis.bosai.go.jp/map/JSHIS2/data
for c in 5135 5136 5235 5236; do
  # 2020年国勢調査 4分の1地域メッシュ（250m）人口
  get pop250_$c.zip "https://www.e-stat.go.jp/gis/statmap-search/data?dlserveyId=S002005112020&code=$c&coordSys=1&format=csv&downloadType=2&statsId=T001102"
  # J-SHIS 確率論的地震動予測地図 2024年版（平均ケース・全地震）250mメッシュ
  get jshis_p_$c.zip "$JSHIS/P/Y2024/MAP/AVR/TTL_MTTL/P-Y2024-MAP-AVR-TTL_MTTL-$c.zip"
  # J-SHIS 表層地盤（微地形区分）250mメッシュ
  get jshis_z_$c.zip "$JSHIS/Z/V4/JAPAN/AMP/VS400_M250/Z-V4-JAPAN-AMP-VS400_M250-$c.zip"
done

SOUMU=https://www.soumu.go.jp/main_content
# 地方自治体におけるAI・RPA・生成AIの導入状況（令和7年度）：AI・RPA・生成AIの導入団体一覧
get soumu_ai.xlsx    $SOUMU/001070421.xlsx
get soumu_rpa.xlsx   $SOUMU/001070423.xlsx
get soumu_genai.xlsx $SOUMU/001070424.xlsx
# 自治体DX・情報化推進概要 個別資料（令和7年4月1日現在）
get soumu_dx_kobetsu.zip $SOUMU/001092314.zip

for z in A49-21_27_GML.zip A40-16_27_GML.zip N02-23_GML.zip; do unzip -oq "$z" -d "${z%.zip}"; done
echo done
