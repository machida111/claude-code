"""データ作成スクリプトの共通処理。

app.html に埋め込んでいる市町村境界（OSAKA_GEOJSON）を読み出し、メッシュ人口を市町村に割り当てる。
出力は tools/out/ に JSON で保存し、app.html にそのまま貼れる JavaScript の形でも表示する。
"""
import json
import os
import re

import numpy as np
from shapely import contains_xy
from shapely.geometry import shape

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'app.html')
DATA = os.path.join(HERE, 'data')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

# app.html の RAW と同じ並び（id, 名称, 全国地方公共団体コード5桁）
MUNIS = [
    ('osaka', '大阪市', '27100'), ('sakai', '堺市', '27140'), ('ikeda', '池田市', '27204'),
    ('toyonaka', '豊中市', '27203'), ('suita', '吹田市', '27205'), ('takatsuki', '高槻市', '27207'),
    ('ibaraki', '茨木市', '27211'), ('minoh', '箕面市', '27220'), ('settsu', '摂津市', '27224'),
    ('shimamoto', '島本町', '27301'), ('toyono', '豊能町', '27321'), ('nose', '能勢町', '27322'),
    ('moriguchi', '守口市', '27209'), ('hirakata', '枚方市', '27210'), ('neyagawa', '寝屋川市', '27215'),
    ('daito', '大東市', '27218'), ('kadoma', '門真市', '27223'), ('shijonawate', '四條畷市', '27229'),
    ('katano', '交野市', '27230'), ('yao', '八尾市', '27212'), ('kashiwara', '柏原市', '27221'),
    ('higashiosaka', '東大阪市', '27227'), ('tondabayashi', '富田林市', '27214'),
    ('kawachinagano', '河内長野市', '27216'), ('matsubara', '松原市', '27217'),
    ('habikino', '羽曳野市', '27222'), ('fujiidera', '藤井寺市', '27226'),
    ('osakasayama', '大阪狭山市', '27231'), ('taishi', '太子町', '27381'), ('kanan', '河南町', '27382'),
    ('chihayaakasaka', '千早赤阪村', '27383'), ('izumiotsu', '泉大津市', '27206'),
    ('izumi', '和泉市', '27219'), ('takaishi', '高石市', '27225'), ('tadaoka', '忠岡町', '27341'),
    ('kishiwada', '岸和田市', '27202'), ('kaizuka', '貝塚市', '27208'), ('izumisano', '泉佐野市', '27213'),
    ('sennan', '泉南市', '27228'), ('hannan', '阪南市', '27232'), ('kumatori', '熊取町', '27361'),
    ('tajiri', '田尻町', '27362'), ('misaki', '岬町', '27366'),
]
IDS = [m[0] for m in MUNIS]
NAME_TO_ID = {m[1]: m[0] for m in MUNIS}
JIS_TO_ID = {m[2]: m[0] for m in MUNIS}

# 大阪府をカバーする1次メッシュ
FIRST_MESHES = ['5135', '5136', '5235', '5236']


def load_osaka_geojson():
    """app.html から市町村境界（国土数値情報N03を簡略化したもの）を取り出す。"""
    src = open(APP, encoding='utf-8').read()
    i = src.index('var OSAKA_GEOJSON')
    k = src.index('{', i)
    depth = 0
    for n in range(k, len(src)):
        if src[n] == '{':
            depth += 1
        elif src[n] == '}':
            depth -= 1
            if depth == 0:
                return json.loads(src[k:n + 1])
    raise ValueError('OSAKA_GEOJSON not found')


def muni_shapes():
    gj = load_osaka_geojson()
    return [(f['properties']['id'], shape(f['geometry'])) for f in gj['features']]


def mesh250_sw(code):
    """4分の1地域メッシュ（250m、10桁）の南西端の緯度・経度。"""
    p, u = int(code[0:2]), int(code[2:4])
    q, v = int(code[4]), int(code[5])
    r, w = int(code[6]), int(code[7])
    a, b = int(code[8]), int(code[9])
    lat = p / 1.5 + q / 12 + r / 120 + ((a - 1) // 2) / 240 + ((b - 1) // 2) / 480
    lon = u + 100 + v / 8 + w / 80 + ((a - 1) % 2) / 160 + ((b - 1) % 2) / 320
    return lat, lon


def assign_to_munis(lat, lon):
    """点（緯度・経度の配列）がどの市町村に入るか。大阪府外は -1。"""
    shapes = muni_shapes()
    mi = np.full(len(lat), -1, dtype=int)
    for gi, (_, g) in enumerate(shapes):
        x0, y0, x1, y1 = g.bounds
        c = np.where((mi < 0) & (lon >= x0) & (lon <= x1) & (lat >= y0) & (lat <= y1))[0]
        if len(c):
            mi[c[contains_xy(g, lon[c], lat[c])]] = gi
    return mi, [s[0] for s in shapes]


def save(name, obj):
    path = os.path.join(OUT, name + '.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    return path


def js_block(var, values, per_line=4):
    """{id: 値 or [値,...]} を app.html の書式（RAW と同じ並び）の JavaScript に整形する。"""
    def fmt(v):
        if isinstance(v, (list, tuple)):
            return '[' + ','.join(fmt(x) for x in v) + ']'
        if v is None:
            return 'null'
        return repr(v)
    items = ['%s:%s' % (i, fmt(values[i])) for i in IDS]
    lines = [', '.join(items[k:k + per_line]) for k in range(0, len(items), per_line)]
    return 'var %s = {\n  %s\n};' % (var, ',\n  '.join(lines))
