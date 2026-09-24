"""e-Stat API から取得する統計：通勤・通学の自家用車利用率、生産年齢人口の増減、高齢化率の上昇幅、民営事業所数。

使い方：  ESTAT_APPID=<あなたのアプリケーションID> python3 estat.py
アプリケーションIDは e-Stat のマイページで発行する。ファイルやリポジトリには書かず、環境変数で渡すこと。

出力（app.html の変数）：CAR_COMMUTE_RATE, WORK_AGE_CHANGE, AGING_RISE, ESTABLISHMENTS, ELDERLY_HOUSEHOLDS
"""
import json
import os
import sys
import urllib.parse
import urllib.request

from common import JIS_TO_ID, MUNIS, js_block, save

API = 'https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData'
AREAS = ','.join(m[2] for m in MUNIS)


def get(params):
    appid = os.environ.get('ESTAT_APPID')
    if not appid:
        sys.exit('環境変数 ESTAT_APPID を設定してください')
    q = urllib.parse.urlencode(dict(params, appId=appid, limit=100000))
    with urllib.request.urlopen(API + '?' + q, timeout=300) as r:
        d = json.load(r)['GET_STATS_DATA']
    if d['RESULT']['STATUS'] not in (0, 1):
        sys.exit('e-Stat error: %s' % d['RESULT']['ERROR_MSG'])
    v = d['STATISTICAL_DATA']['DATA_INF']['VALUE']
    return v if isinstance(v, list) else [v]


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def commute():
    """2020年国勢調査「利用交通手段」（統計表0003454514）。常住地による15歳以上の自宅外就業者・通学者。
    cat01: 00 総数 / 05 自家用車（複数手段の併用があるため手段別の合計は総数を超える）"""
    rows = get({'statsDataId': '0003454514', 'cdCat02': '0', 'cdCat01': '00,05', 'cdArea': AREAS})
    d = {}
    for r in rows:
        if r['@area'] in JIS_TO_ID:
            d.setdefault(JIS_TO_ID[r['@area']], {})[r['@cat01']] = num(r['$'])
    return {i: round(100 * v['05'] / v['00'], 1) for i, v in d.items()}


def population():
    """社会・人口統計体系 市区町村データ A（0000020201）。A1101 総人口、A1302 15〜64歳人口、A1303 65歳以上人口。"""
    rows = get({'statsDataId': '0000020201', 'cdCat01': 'A1101,A1302,A1303', 'cdArea': AREAS,
                'cdTime': '2015100000,2020100000'})
    d = {}
    for r in rows:
        if r['@area'] in JIS_TO_ID:
            d.setdefault(JIS_TO_ID[r['@area']], {})[(r['@cat01'], r['@time'][:4])] = num(r['$'])
    work, aging = {}, {}
    for i, v in d.items():
        work[i] = round(100 * (v[('A1302', '2020')] / v[('A1302', '2015')] - 1), 2)
        aging[i] = round(100 * (v[('A1303', '2020')] / v[('A1101', '2020')] - v[('A1303', '2015')] / v[('A1101', '2015')]), 2)
    return work, aging


def elderly_households():
    """高齢者の世帯の形（2020年、0000020201）。カルテの参考値。
    A8301 65歳以上世帯員の単独世帯数、A8201 夫65歳以上・妻60歳以上の夫婦のみの世帯数、A1303 65歳以上人口、A710101 一般世帯数。
    [65歳以上のうち一人暮らしの割合, 高齢者のみの世帯（単身＋夫婦のみ）の割合] を返す。"""
    rows = get({'statsDataId': '0000020201', 'cdCat01': 'A8301,A8201,A1303,A710101', 'cdArea': AREAS,
                'cdTime': '2020100000'})
    d = {}
    for r in rows:
        if r['@area'] in JIS_TO_ID:
            d.setdefault(JIS_TO_ID[r['@area']], {})[r['@cat01']] = num(r['$'])
    return {i: [round(100 * v['A8301'] / v['A1303'], 1), round(100 * (v['A8301'] + v['A8201']) / v['A710101'], 1)]
            for i, v in d.items()}


def establishments():
    """社会・人口統計体系 市区町村データ C（0000020203）。C2108 民営事業所数（経済センサス‐活動調査 2016・2021年）。"""
    rows = get({'statsDataId': '0000020203', 'cdCat01': 'C2108', 'cdArea': AREAS})
    d = {}
    for r in rows:
        if r['@area'] in JIS_TO_ID:
            d.setdefault(JIS_TO_ID[r['@area']], {})[r['@time'][:4]] = num(r['$'])
    return {i: [int(v['2016']), int(v['2021'])] for i, v in d.items()}


def main():
    car = commute()
    work, aging = population()
    est = establishments()
    eld = elderly_households()
    save('car_commute_rate', car)
    save('work_age_change', work)
    save('aging_rise', aging)
    save('establishments', est)
    save('elderly_households', eld)
    print(js_block('CAR_COMMUTE_RATE', car, per_line=5))
    print(js_block('WORK_AGE_CHANGE', work, per_line=6))
    print(js_block('AGING_RISE', aging, per_line=6))
    print(js_block('ESTABLISHMENTS', est, per_line=5))
    print(js_block('ELDERLY_HOUSEHOLDS', eld, per_line=5))


if __name__ == '__main__':
    main()
