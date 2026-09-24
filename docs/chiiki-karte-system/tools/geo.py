"""地理データの集計：浸水想定区域・地震・液状化・鉄道駅1km圏の人口割合と、隣接市町村。

入力は download.sh で取得した tools/data/。人口は2020年国勢調査の250mメッシュ人口を、
各メッシュ5×5（50m四方）の点に等分して配り、点ごとに市町村・災害区域・駅からの距離を判定する。

出力（app.html の変数）：FLOOD_EXPOSURE, QUAKE_HAZARD, RAIL_COVER_1KM, ADJACENT
"""
import json
import os
import zipfile

import numpy as np
import shapefile
from shapely import STRtree, make_valid, points
from shapely.geometry import box, shape

from common import DATA, FIRST_MESHES, assign_to_munis, js_block, mesh250_sw, muni_shapes, save

N_SUB = 5  # 250mメッシュを5×5に等分

# 国土交通省「地形区分に基づく液状化の発生傾向」で発生傾向が「強い」「やや強い」とされる J-SHIS 微地形区分コード
# 強い：14 旧河道・旧池沼、18 砂丘・砂州間低地、20 埋立地／やや強い：12 自然堤防、15 三角州・海岸低地、19 干拓地
LIQUEFY_JCODES = {14, 18, 20, 12, 15, 19}


def read_pop250():
    pop = {}
    for c in FIRST_MESHES:
        z = zipfile.ZipFile(os.path.join(DATA, 'pop250_%s.zip' % c))
        for ln in z.read(z.namelist()[0]).decode('cp932').splitlines()[2:]:
            f = ln.split(',')
            # 人口総数は秘匿処理の対象外（内訳のみ秘匿）。合計は1kmメッシュ人口と一致する
            if f[4] not in ('', '*', '-') and int(f[4]) > 0:
                pop[f[0]] = int(f[4])
    return pop


def read_jshis(prefix):
    d = {}
    for c in FIRST_MESHES:
        z = zipfile.ZipFile(os.path.join(DATA, '%s_%s.zip' % (prefix, c)))
        name = [x for x in z.namelist() if x.endswith('.csv')][0]
        for ln in z.read(name).decode('cp932').splitlines():
            if ln.startswith('#'):
                continue
            f = [x.strip() for x in ln.split(',')]
            d[f[0]] = f
    return d


def hazard_polygons():
    """床上浸水以上（洪水・高潮0.5m以上、津波0.3m以上）の区域。"""
    osaka_box = box(134.95, 34.2, 135.8, 35.1)
    polys = []
    for k in ['27_10', '27_20', '86_10']:
        z = zipfile.ZipFile(os.path.join(DATA, 'A31a-24_%s_GEOJSON.zip' % k))
        for i in z.infolist():
            n = i.filename
            try:
                n = n.encode('cp437').decode('cp932')
            except UnicodeError:
                pass
            # 想定最大規模、浸水深ランク2（0.5m以上）以上
            if '/20_想定最大規模/' in n and n.endswith('.geojson'):
                for f in json.loads(z.read(i))['features']:
                    if f['properties'].get('A31a_205', 0) >= 2:
                        g = shape(f['geometry'])
                        if g.intersects(osaka_box):
                            polys.append(('flood', g))
    r = shapefile.Reader(os.path.join(DATA, 'A49-21_27_GML', 'A49-21_27.shp'), encoding='cp932')
    for sr in r.iterShapeRecords():
        if sr.record['A49_003'] != '0.5m未満':
            polys.append(('surge', shape(sr.shape.__geo_interface__)))
    r = shapefile.Reader(os.path.join(DATA, 'A40-16_27_GML', 'A40-16_27.shp'), encoding='cp932')
    for sr in r.iterShapeRecords():
        if not sr.record['A40_003'].startswith('0.01m'):  # 0.3m未満のランクを除く
            polys.append(('tsunami', shape(sr.shape.__geo_interface__)))
    kinds = np.array([k for k, _ in polys])
    geoms = [make_valid(g) if not g.is_valid else g for _, g in polys]
    return kinds, geoms


def stations():
    """駅（N02 の駅区間ラインの頂点平均を駅位置とする）。"""
    gj = json.load(open(os.path.join(DATA, 'N02-23_GML', 'UTF-8', 'N02-23_Station.geojson'), encoding='utf-8'))
    out = []
    for f in gj['features']:
        if f['geometry']['type'] != 'LineString':
            continue
        c = f['geometry']['coordinates']
        lo = sum(p[0] for p in c) / len(c)
        la = sum(p[1] for p in c) / len(c)
        if 134.8 < lo < 135.9 and 34.1 < la < 35.2:
            out.append((la, lo))
    return np.array(out)


def main():
    pop = read_pop250()
    P = read_jshis('jshis_p')  # CODE, T30_I45_PS, T30_I50_PS, T30_I55_PS(6弱), T30_I60_PS(6強), ...
    Z = read_jshis('jshis_z')  # CODE, JCODE(微地形区分), AVS, ARV, ...
    LA, LO, PP, I55, I60, LQ = [], [], [], [], [], []
    for k, pp in pop.items():
        la0, lo0 = mesh250_sw(k)
        if not (34.15 < la0 < 35.15 and 134.9 < lo0 < 135.85):
            continue
        pr, zr = P[k], Z[k]
        for a in range(N_SUB):
            for b in range(N_SUB):
                LA.append(la0 + (a + .5) / N_SUB / 480)
                LO.append(lo0 + (b + .5) / N_SUB / 320)
                PP.append(pp / N_SUB ** 2)
                I55.append(float(pr[3]))
                I60.append(float(pr[4]))
                LQ.append(int(zr[1]) in LIQUEFY_JCODES)
    LA, LO, PP = np.array(LA), np.array(LO), np.array(PP)
    I55, I60, LQ = np.array(I55), np.array(I60), np.array(LQ)

    mi, ids = assign_to_munis(LA, LO)
    idx = np.where(mi >= 0)[0]
    la, lo, pp, mm = LA[idx], LO[idx], PP[idx], mi[idx]
    i55, i60, lq = I55[idx], I60[idx], LQ[idx]

    kinds, geoms = hazard_polygons()
    hit = STRtree(geoms).query(points(lo, la), predicate='within')
    inside = np.zeros(len(idx), bool)
    inside[np.unique(hit[0])] = True
    by_kind = {}
    for k in ['flood', 'surge', 'tsunami']:
        a = np.zeros(len(idx), bool)
        a[np.unique(hit[0][kinds[hit[1]] == k])] = True
        by_kind[k] = a

    sta = stations()
    rail = np.zeros(len(idx), bool)
    for ch in range(0, len(sta), 400):
        S = sta[ch:ch + 400]
        dy = (la[:, None] - S[None, :, 0]) * 111.132
        dx = (lo[:, None] - S[None, :, 1]) * (111.320 * np.cos(np.radians(la)))[:, None]
        rail |= (dy * dy + dx * dx <= 1.0).any(axis=1)

    pct = lambda w, m: round(100 * float(w[m].sum()) / float(w.sum()), 1)
    flood, quake, railc = {}, {}, {}
    for gi, mid in enumerate(ids):
        s = mm == gi
        w = pp[s]
        flood[mid] = [pct(w, inside[s]), pct(w, by_kind['flood'][s]), pct(w, by_kind['surge'][s]), pct(w, by_kind['tsunami'][s])]
        quake[mid] = [round(100 * float((w * i55[s]).sum() / w.sum()), 1),
                      round(100 * float((w * i60[s]).sum() / w.sum()), 1), pct(w, lq[s])]
        railc[mid] = pct(w, rail[s])

    # 隣接：境界を少し広げて重なりの面積がある組（点で接するだけの組は除く）
    shp = muni_shapes()
    adj = {i: [] for i, _ in shp}
    for a in range(len(shp)):
        for b in range(a + 1, len(shp)):
            (ia, ga), (ib, gb) = shp[a], shp[b]
            inter = ga.buffer(0.0003).intersection(gb.buffer(0.0003))
            if not inter.is_empty and inter.area > 1e-7:
                adj[ia].append(ib)
                adj[ib].append(ia)
    adj = {k: sorted(v) for k, v in adj.items()}

    save('flood_exposure', flood)
    save('quake_hazard', quake)
    save('rail_cover_1km', railc)
    save('adjacent', adj)
    print(js_block('FLOOD_EXPOSURE', flood))
    print(js_block('QUAKE_HAZARD', quake))
    print(js_block('RAIL_COVER_1KM', railc, per_line=5))
    print('total population assigned:', int(round(pp.sum())))


if __name__ == '__main__':
    main()
