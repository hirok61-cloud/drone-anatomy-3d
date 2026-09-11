# -*- coding: utf-8 -*-
import html
css = open('skel.css', encoding='utf-8').read()
A = "var(--accent)"   # 意味を持つ1色
def esc(s): return html.escape(s, quote=False)

# ---------- SVG部品 ----------
DEFS = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="dtop" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
<line x1="60" y1="60" x2="22" y2="22"/><line x1="60" y1="60" x2="98" y2="22"/><line x1="60" y1="60" x2="22" y2="98"/><line x1="60" y1="60" x2="98" y2="98"/>
<rect x="42" y="42" width="36" height="36" rx="6" fill="var(--bg2)"/>
<circle cx="22" cy="22" r="15"/><circle cx="98" cy="22" r="15"/><circle cx="22" cy="98" r="15"/><circle cx="98" cy="98" r="15"/>
<circle cx="22" cy="22" r="3" fill="currentColor"/><circle cx="98" cy="22" r="3" fill="currentColor"/><circle cx="22" cy="98" r="3" fill="currentColor"/><circle cx="98" cy="98" r="3" fill="currentColor"/>
<path d="M60 48 l5 8 h-10 z" fill="currentColor" stroke="none"/></g></symbol>
<symbol id="dside" viewBox="0 0 160 64"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
<rect x="56" y="28" width="48" height="12" rx="4" fill="var(--bg2)"/><line x1="18" y1="34" x2="56" y2="34"/><line x1="104" y1="34" x2="142" y2="34"/>
<rect x="12" y="25" width="12" height="9" rx="2" fill="var(--bg2)"/><rect x="136" y="25" width="12" height="9" rx="2" fill="var(--bg2)"/>
<line x1="2" y1="23" x2="34" y2="23"/><line x1="126" y1="23" x2="158" y2="23"/>
<line x1="66" y1="40" x2="60" y2="58"/><line x1="94" y1="40" x2="100" y2="58"/><line x1="52" y1="58" x2="108" y2="58"/>
<rect x="70" y="40" width="20" height="8" rx="2"/></g></symbol>
<marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>
<marker id="arwA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
<pattern id="stripe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="2"/></pattern>
</defs></svg>'''

def svg(label, inner):
    return (f'<svg viewBox="0 0 400 250" role="img" aria-label="{esc(label)}" font-family="var(--font)" font-size="11" fill="currentColor">'
            f'<rect x="0.5" y="0.5" width="399" height="249" rx="10" fill="none" stroke="currentColor" stroke-opacity=".18"/>'
            f'{inner}</svg>')
def t(x,y,s,size=11,anchor="start",w=None,fill=None,op=None):
    a=f' font-weight="{w}"' if w else ''; f=f' fill="{fill}"' if fill else ''; o=f' opacity="{op}"' if op else ''
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}"{a}{f}{o}>{esc(s)}</text>'
def chip(x,y,s,w=None,on=False):
    w = w or (len(s)*11+16)
    if on: return f'<rect x="{x}" y="{y}" width="{w}" height="20" rx="10" fill="{A}"/>{t(x+w/2,y+14,s,11,"middle",700,"#fff")}'
    return f'<rect x="{x}" y="{y}" width="{w}" height="20" rx="10" fill="none" stroke="currentColor" stroke-opacity=".35"/>{t(x+w/2,y+14,s,11,"middle")}'
def badge(x,y,s,acc=False):
    f = A if acc else "currentColor"
    return f'<rect x="{x-17}" y="{y-9}" width="34" height="18" rx="9" fill="{f}" opacity="{1 if acc else .75}"/>{t(x,y+4,s,10,"middle",700,"#fff")}'
def arrow(x1,y1,x2,y2,acc=False,dash=False,wid=2):
    m = "arwA" if acc else "arw"; st = A if acc else "currentColor"; d = ' stroke-dasharray="4 3"' if dash else ''
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{st}" stroke-width="{wid}" marker-end="url(#{m})"{d}/>'
def panel(x,y,w,h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="var(--card)" stroke="currentColor" stroke-opacity=".18"/>'
def use(sym,x,y,w,h,extra=""): return f'<use href="#{sym}" x="{x}" y="{y}" width="{w}" height="{h}"{extra}/>'
def curl(cx,cy,r,ccw,acc=False):
    # 回転矢印(上面図用)
    st = A if acc else "currentColor"; m="arwA" if acc else "arw"
    if ccw: d=f'M{cx+r} {cy} A{r} {r} 0 1 0 {cx} {cy-r}'
    else:   d=f'M{cx-r} {cy} A{r} {r} 0 1 1 {cx} {cy-r}'
    return f'<path d="{d}" fill="none" stroke="{st}" stroke-width="2.2" marker-end="url(#{m})"/>'

# ---------- 13枚のイメージ ----------
S = {}
# 1 触ると答える機体
S[1] = svg("フリックで傾いた機体が、押された側のモーターを増速して自分で戻る図", ''.join([
  f'<g transform="translate(120 70) rotate(-12)">{use("dside",0,0,200,80)}</g>',
  t(60,50,"指でフリック",11,"start",700), arrow(60,58,110,82,acc=True,wid=2.5),
  badge(122,50,"115%",True), badge(318,42,"85%"),
  f'<path d="M300 130 Q330 175 260 178" fill="none" stroke="{A}" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#arwA)"/>',
  t(300,196,"自分で元の位置に戻る",11,"middle",700,A),
  panel(20,170,110,64), t(75,186,"仮想スティック",10,"middle"),
  f'<circle cx="48" cy="212" r="14" fill="none" stroke="currentColor"/><circle cx="52" cy="208" r="5" fill="currentColor"/>',
  f'<circle cx="102" cy="212" r="14" fill="none" stroke="currentColor"/><circle cx="102" cy="212" r="5" fill="currentColor"/>',
  panel(250,206,130,30), t(315,225,"📱 傾けても同じ",10,"middle"),
]))
# 2 スロー観察
S[2] = svg("プロペラをゆっくり回し、回転方向を矢印と縞模様で示す図", ''.join([
  use("dtop",110,30,180,180),
  curl(143,63,26,True,True), curl(257,63,26,False), curl(143,177,26,True,True), curl(257,177,26,False),
  f'<circle cx="257" cy="63" r="13" fill="url(#stripe)" opacity=".5"/><circle cx="257" cy="177" r="13" fill="url(#stripe)" opacity=".5"/>',
  f'<circle cx="128" cy="52" r="4" fill="{A}"/>',
  chip(20,20,"1/50 速度",90,True), chip(20,48,"ストップ",80),
  t(20,110,"CCW = 無地",11), t(20,126,"CW  = 縞",11), t(20,150,"色が分からなくても",10,op=.7), t(20,164,"形と矢印で読める",10,op=.7),
  t(330,236,"S キー",10,"end",op=.6),
]))
# 3 気流
S[3] = svg("ホバリング中の機体の各ローターから空気の柱が下へ流れる図。増速した側の柱が太い", ''.join([
  use("dside",100,40,200,80),
  ''.join(f'<line x1="{x}" y1="76" x2="{x+dx}" y2="{y2}" stroke="{A}" stroke-width="{wd}" stroke-linecap="round" opacity="{op}"/>'
          for x,dx,y2,wd,op in [(118,-6,200,2,.8),(128,-2,215,2,.6),(138,3,205,2,.7),(148,8,195,1.5,.5),
                                  (256,-10,210,3,.9),(266,-4,225,3,.8),(276,2,222,3,.9),(286,8,212,3,.8),(296,14,200,2.5,.6)]),
  t(133,230,"通常",11,"middle"), t(276,242,"増速 → 柱が太い",11,"middle",700,A),
  t(20,30,"空気を下に押した反作用で浮く",11,"start",700), t(20,46,"— 読まなくても見える",10,op=.7),
]))
# 4 扉
S[4] = svg("目的の6ボタンと素朴な質問の一覧から入る入口の図", ''.join([
  t(20,28,"なにに使う？",12,"start",700),
  chip(20,38,"防災",52), chip(78,38,"農業",52,True), chip(136,38,"点検",52), chip(194,38,"空撮",52), chip(252,38,"教育",52), chip(310,38,"配送",52),
  use("dtop",20,80,150,150),
  f'<circle cx="42" cy="102" r="20" fill="none" stroke="{A}" stroke-width="3"/><circle cx="137" cy="197" r="20" fill="none" stroke="{A}" stroke-width="3"/>',
  t(95,240,"用途で変わる部品が光る",10,"middle",op=.8),
  panel(200,80,180,150), t(212,100,"聞いてみる",11,"start",700),
  t(212,122,"なぜ浮くの？",11), t(212,142,"雨の日は飛べる？",11),
  f'<rect x="206" y="152" width="168" height="22" rx="6" fill="{A}" opacity=".15"/>', t(212,167,"電波が切れたら？",11,"start",700,A),
  t(212,192,"何分飛べる？",11), t(212,212,"なぜ4枚なの？",11),
]))
# 5 やらかしシアター
S[5] = svg("組み間違いや落下を選ぶと、機体がその場で回るなどの結果が再生され、点検項目へつながる図", ''.join([
  panel(20,20,150,110), t(32,40,"やってみる",11,"start",700),
  f'<rect x="26" y="50" width="138" height="22" rx="6" fill="{A}" opacity=".15"/>', t(32,65,"プロペラを1枚逆に",11,"start",700,A),
  t(32,90,"ESCの配線を入れ替え",11), t(32,112,"1.5mから落とす",11),
  use("dtop",200,40,150,150),
  f'<line x1="212" y1="52" x2="240" y2="80" stroke="{A}" stroke-width="3"/><line x1="240" y1="52" x2="212" y2="80" stroke="{A}" stroke-width="3"/>',
  f'<path d="M355 115 A85 85 0 1 1 220 40" fill="none" stroke="{A}" stroke-width="2.5" stroke-dasharray="5 4" marker-end="url(#arwA)"/>',
  t(275,220,"→ その場でクルクル回る",11,"middle",700,A),
  arrow(95,150,95,190,dash=True), chip(28,196,"どの点検で防げた？",150),
]))
# 6 重さ・お金・重心
S[6] = svg("重心マーカー、ドラッグできるバッテリー、重さの内訳バーと値段タグの図", ''.join([
  use("dside",30,60,200,80),
  f'<circle cx="130" cy="100" r="9" fill="none" stroke="{A}" stroke-width="2.5"/><line x1="121" y1="100" x2="139" y2="100" stroke="{A}" stroke-width="2.5"/><line x1="130" y1="91" x2="130" y2="109" stroke="{A}" stroke-width="2.5"/>',
  t(130,128,"重心",10,"middle",700,A),
  f'<rect x="102" y="112" width="40" height="12" rx="3" fill="{A}" opacity=".35"/>', arrow(146,118,175,118,acc=True), arrow(98,118,69,118,acc=True),
  t(122,150,"バッテリーをずらすと",10,"middle",op=.8), t(122,163,"前後のモーター%が変わる",10,"middle",op=.8),
  badge(40,50,"110%",True), badge(220,50,"90%"),
  t(270,34,"重さの内訳",11,"start",700),
  f'<rect x="270" y="42" width="40" height="76" fill="{A}"/><rect x="270" y="118" width="40" height="34" fill="currentColor" opacity=".55"/><rect x="270" y="152" width="40" height="26" fill="currentColor" opacity=".35"/><rect x="270" y="178" width="40" height="20" fill="currentColor" opacity=".2"/>',
  t(318,66,"電池 640g",10), t(318,138,"モーター",10), t(318,168,"機体",10), t(318,192,"その他",10),
  t(318,80,"＝ペットボトル1.3本",9,op=.7),
  chip(272,216,"¥ 参考価格",100),
]))
# 7 図鑑とカード
S[7] = svg("35マスの図鑑で12個が発見済み、今日の一部品カードと記念写真ボタンの図", ''.join([
  t(20,28,"図鑑  12 / 35",12,"start",700),
  ''.join(f'<rect x="{20+(i%7)*22}" y="{40+(i//7)*22}" width="18" height="18" rx="4" fill="{A if i<12 else "none"}" stroke="currentColor" stroke-opacity=".3" opacity="{1 if i<12 else .6}"/>' for i in range(35)),
  f'<rect x="{20+(13%7)*22}" y="{40+(13//7)*22}" width="18" height="18" rx="4" fill="none" stroke="{A}" stroke-width="2"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></rect>',
  t(20,175,"うっすら光る＝今日の一部品",10,op=.8),
  panel(200,30,180,170), use("dside",215,50,150,60), f'<line x1="210" y1="120" x2="370" y2="120" stroke="currentColor" stroke-opacity=".2"/>',
  t(212,140,"モーターベース",12,"start",700), t(212,158,"ネジが長すぎると巻線に届いて",10), t(212,172,"短絡する。だから長さを選ぶ。",10),
  t(368,190,"13/35 · 9/11",9,"end",op=.6),
  chip(200,212,"📷 記念写真",100,True), chip(310,212,"共有",60),
]))
# 8 生きている機体・みんなの土台
S[8] = svg("カーソルの方へ少し傾く機体、画面下の大きな部品名、言語切替と読み上げボタンの図", ''.join([
  f'<g transform="translate(90 45) rotate(6)">{use("dside",0,0,220,88)}</g>',
  f'<circle cx="330" cy="70" r="6" fill="{A}"/><path d="M336 76 l14 14" stroke="{A}" stroke-width="2"/>', t(345,62,"カーソル",10,op=.7),
  f'<path d="M250 60 Q290 55 320 68" fill="none" stroke="{A}" stroke-width="1.5" stroke-dasharray="3 3"/>',
  t(120,150,"開いた瞬間から浮いている。近づくと少し向く。",10,"middle",op=.8),
  f'<rect x="20" y="172" width="360" height="40" rx="8" fill="{A}"/>', t(200,199,"バッテリー",20,"middle",700,"#fff"),
  chip(20,222,"日本語",56,True), chip(82,222,"やさしい",70), chip(158,222,"English",68), chip(300,222,"🔊 読み上げ",80),
]))
# 9 授業・説明会モード
S[9] = svg("左に機体、右に台本の5段階と経過時間、ふたりで指さしクイズの図", ''.join([
  use("dtop",20,40,150,150), f'<circle cx="137" cy="62" r="20" fill="none" stroke="{A}" stroke-width="3"/>',
  panel(200,20,180,210), t(212,40,"45分コース",11,"start",700), t(368,40,"12:30",10,"end",op=.6),
  ''.join(f'<circle cx="220" cy="{64+i*30}" r="8" fill="{A if i==1 else "none"}" stroke="{A if i<=1 else "currentColor"}" stroke-opacity="{1 if i<=1 else .4}" stroke-width="2"/>{t(236,68+i*30,s,11,"start",700 if i==1 else None)}' for i,s in enumerate(["眺める 10分","プロペラは触らせない","なぜ落ちにくい？","問いかけ：4枚の理由","ふりかえりカード"])),
  f'<line x1="220" y1="72" x2="220" y2="176" stroke="currentColor" stroke-opacity=".2" stroke-dasharray="3 3"/>',
  chip(212,200,"🖨 印刷",60), chip(280,200,"ふたりクイズ",92),
  t(95,222,"「ここ、なんだと思う？」",11,"middle",700,A),
]))
# 10 もしもの5場面
S[10] = svg("電波が切れた場面を選ぶと機体が帰還経路をたどり、機体ができることと人がやることの2欄が出る図", ''.join([
  chip(20,20,"電波が切れた",100,True), chip(126,20,"電池が少ない",100), chip(232,20,"GPS喪失",76), chip(314,20,"強風",50),
  use("dside",180,60,160,64),
  f'<line x1="300" y1="70" x2="322" y2="48" stroke="{A}" stroke-width="3"/><line x1="322" y1="70" x2="300" y2="48" stroke="{A}" stroke-width="3"/>',
  f'<path d="M180 100 Q100 100 70 140" fill="none" stroke="{A}" stroke-width="2.5" stroke-dasharray="5 4" marker-end="url(#arwA)"/>',
  f'<circle cx="60" cy="150" r="14" fill="none" stroke="currentColor" stroke-width="2"/>', t(60,155,"H",12,"middle",700),
  t(120,120,"自動で帰る",11,"middle",700,A),
  panel(20,175,170,60), t(30,193,"機体ができること",10,"start",700), t(30,210,"帰還・着陸を試みる",10), t(30,224,"（設定と点検が前提）",9,op=.7),
  panel(210,175,170,60), t(220,193,"人がやること",10,"start",700,A), t(220,210,"目視で追う・周囲へ声かけ",10), t(220,224,"補助者が止める",10),
]))
# 11 機体が見ている世界
S[11] = svg("機体の横にジャイロ・気圧・コンパスの波形、アンテナの指向性ドーナツ、ESCの熱の色の図", ''.join([
  f'<ellipse cx="200" cy="120" rx="120" ry="34" fill="none" stroke="{A}" stroke-width="1.5" stroke-dasharray="4 3" opacity=".7"/>',
  t(200,80,"電波の形（アンテナの指向性）",10,"middle",op=.8),
  use("dside",120,90,160,64),
  f'<rect x="130" y="112" width="14" height="8" rx="2" fill="{A}"/>', t(112,136,"ESC 熱 ▲",9,"start",A),
  panel(20,170,110,64), t(30,186,"ジャイロ",10,"start",700), f'<polyline points="30,210 40,200 50,214 60,196 70,212 80,204 90,210 100,198 118,208" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  panel(145,170,110,64), t(155,186,"気圧高度",10,"start",700), f'<polyline points="155,215 175,213 195,210 215,205 245,200" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  panel(270,170,110,64), t(280,186,"コンパス",10,"start",700), f'<polyline points="280,210 300,210 315,212 322,196 330,222 345,208 370,209" fill="none" stroke="{A}" stroke-width="1.5"/>', t(350,230,"電流で乱れる",8,"end",A),
  t(60,40,"機体を手で回すと波形が動く",11,"start",700),
]))
# 12 1000フライト早送り
S[12] = svg("フライト回数スライダーを進めると、部品が消耗度で色づき、交換目安のバーが伸びる図", ''.join([
  t(20,30,"フライト回数",11,"start",700), f'<line x1="120" y1="26" x2="370" y2="26" stroke="currentColor" stroke-opacity=".3" stroke-width="3"/>',
  f'<line x1="120" y1="26" x2="290" y2="26" stroke="{A}" stroke-width="3"/><circle cx="290" cy="26" r="8" fill="{A}"/>', t(290,48,"620回",10,"middle",700,A), t(370,48,"1000",9,"middle",op=.6),
  use("dtop",30,70,150,150),
  f'<circle cx="52" cy="92" r="16" fill="{A}" opacity=".85"/><circle cx="147" cy="92" r="16" fill="{A}" opacity=".85"/>',
  f'<rect x="88" y="128" width="32" height="32" rx="5" fill="{A}" opacity=".35"/>',
  t(105,240,"赤＝先に減る　薄い＝ほぼ壊れない",9,"middle",op=.8),
  panel(200,70,180,160),
  ''.join(f'{t(212,92+i*30,n,10)}<rect x="212" y="{98+i*30}" width="150" height="8" rx="4" fill="currentColor" opacity=".12"/><rect x="212" y="{98+i*30}" width="{w}" height="8" rx="4" fill="{A}" opacity="{op}"/>'
          for i,(n,w,op) in enumerate([("プロペラ 縁の欠け",140,.9),("バッテリー 容量",120,.8),("コネクタ はんだ",95,.7),("ベアリング",60,.5),("フレーム",15,.3)])),
]))
# 13 設計者の工具
S[13] = svg("KV値やセル数を入れると推力重量比と飛行時間が出て、波形とA/B比較が並ぶ図", ''.join([
  panel(20,20,150,120), t(30,40,"パラメータ",11,"start",700),
  ''.join(f'{t(30,62+i*22,k,10)}<rect x="90" y="{50+i*22}" width="70" height="16" rx="4" fill="none" stroke="currentColor" stroke-opacity=".35"/>{t(155,62+i*22,v,10,"end")}' for i,(k,v) in enumerate([("KV","450"),("セル数","6S"),("プロペラ","12×4.5"),("重量","2.4kg")])),
  arrow(175,80,198,80,acc=True),
  panel(205,20,175,120), t(215,40,"計算結果",11,"start",700,A),
  t(215,64,"推力重量比",10), t(370,64,"2.1",12,"end",700), t(215,86,"ホバー余裕",10), t(370,86,"48%",12,"end",700), t(215,108,"飛行時間 目安",10), t(370,108,"18分",12,"end",700), t(215,128,"重心 x/z",10), t(370,128,"+3 / −1 mm",11,"end",700),
  panel(20,155,175,80), t(30,172,"ステップ応答 30→70%",9,"start",700), f'<polyline points="30,220 70,220 72,200 80,196 95,204 110,200 130,202 185,202" fill="none" stroke="{A}" stroke-width="2"/>', t(185,230,"300ms",8,"end",op=.6),
  panel(205,155,175,80), t(215,172,"A / B 比較",9,"start",700), use("dtop",215,180,50,50), use("dtop",315,180,50,50), f'<line x1="292" y1="180" x2="292" y2="230" stroke="currentColor" stroke-opacity=".3"/>', t(292,225,"差分だけ光る",8,"middle",op=.7),
]))

# ---------- 提案データ ----------
AUD = {"zero":"全く知らない人","beg":"初心者","pro":"専門家","around":"周辺の人","all":"全員"}
ITEMS = [
 dict(n=1,tier=1,name="触ると答える機体",eff="S〜M",wow="勝手に戻った！",aud=["all"],hit="6視点中4",
  what="ホバリング中の機体を指でフリックすると傾いて流され、押された側のモーターの％が跳ね上がって自力で元の位置へ戻る。画面下の仮想スティックを倒すと4基が連続的に応答し、斜めに倒せば前進と横移動の合成で4つがばらばらの数字になる。スマホなら端末を傾けても同じ。",
  why="今の「飛行の原理」はボタンを押して眺める受け身の教材。原因を自分の手にすると、傾き＝回転数の差が身体感覚で入る。素人・初心者・体験設計・アクセシビリティの4視点が独立に同じ方向を挙げた。既存の矢印と％表示をそのまま流用できる。",
  src="全くの素人「スマホを傾けて操縦」／初心者「仮想プロポ」／体験設計「押してごらん」／アクセシビリティ「傾け回転」",
  care="物理を凝らない。戻り方は毎回同じでよい。傾けは±30°でクランプし、iOSの許可ダイアログとPC用の代替（スティック）を必ず用意する。"),
 dict(n=2,tier=1,name="スロー観察と、色に頼らない回転記号",eff="S",wow="隣と逆向きに回ってる！",aud=["all"],hit="6視点中3",
  what="「ゆっくり」で回転が実速度の1/50になり、ブレード1枚の赤い印で周回が追える。ハブに曲がり矢印とCW/CCWを刻印し、CCWのブレードには縞模様を入れる。航法灯も色に加えて形を変える（前左三角・前右丸・後四角）。",
  why="実速度のプロペラはストロボ効果で誰にも回転方向が見えない。教材の核心「隣同士は逆回転」を、色覚に関係なく全員に初めて見せる機能。reduced-motion対応と古い端末の負荷軽減も同時に手に入る。",
  src="全くの素人「スロー／ストップ」／アクセシビリティ「スロー観察」「形と動きで言う」",
  care="スロー中も浮いて見えるよう物理と切り離す。矢印はカメラ次第で裏返るのでブレード面に刻印する。実機の航法灯は形が違わないと注記。"),
 dict(n=3,tier=1,name="気流を見せる",eff="M",wow="空気を押してるのが見える",aud=["all"],hit="前回提案・体験設計が再指名",
  what="各ローターの下に、回転数に連動して流れ落ちる空気の柱を描く。前進で機体が傾くと柱も後ろへ傾き、1基だけ増速すればその柱だけ太くなる。#1のフリックと組み合わせると「押されると空気の押し方が変わる」まで見える。",
  why="このモデルに欠けている一番大きなもの。「空気を下に押した反作用で浮く」という一文が、説明を読まなくても目で分かる絵になる。初心者向け・専門家向けどちらの提案でも最上位だった。",
  src="前回の初心者向け提案の第1位。体験設計エージェントが#1の土台として再指名",
  care="粒子はスマホで重い。自動画質調整の段階に必ず組み込み、粒子数を落とす。"),
 dict(n=4,tier=1,name="質問と目的から入る扉",eff="S〜M",hit="6視点中4",wow="自分の疑問がボタンになってる",aud=["zero","around","beg"],
  what="トップに「防災／農業／点検／空撮／教育／配送」の6ボタン。押すと機体の部品が「共通・強化・追加」の3色に分かれ、増える重さと減る飛行時間が帯で出る。隣に部品名を知らなくても押せる質問「なぜ浮くの？」「雨の日は？」「電波が切れたら？」が並び、答えの主役の部品だけが光る。初回だけ「隣のプロペラはなぜ逆向き？」の一問が浮かぶ。",
  why="35部品の一覧は素人には壁。目的か疑問なら選べる。周辺の6人（先生・防災・農家・経営者・家族・来場者）全員に「自分の入口」ができ、前回の「はじめてモード」と合体して一つの扉になる。",
  src="周辺の関係者「なにに使う？」「聞いてみる」／体験設計「10秒の問い」／初心者「学科問題モード」／前回「はじめてモード」",
  care="用途の輪郭は概念図であり実機の設計図ではないと明記。「何分飛べる？」の答えは幅で示す。"),
 dict(n=5,tier=1,name="やってしまったシアター",eff="M",hit="6視点中4",wow="1枚逆に付けただけでクルクル回る",aud=["beg","pro","zero"],
  what="「プロペラを1枚逆に」「ESCの配線を入れ替え」「FCを90°回して取付」「1.5mから落とす」「モーター1基停止」を選ぶと、機体に赤い違和感が出て、離陸ボタンでその結果（その場で回る・片側に倒れる・脚がしなりプロペラが飛ぶ）が再生される。壊れた部品だけ赤く点灯し、最後に「どの点検で防げたか」に飛ぶ。修理ボタンで一瞬で元に戻る。",
  why="講師が毎週「向きを確認しましょう」と言っても伝わらないのは、間違えた結果を見たことがないから。結果→原因→点検項目の順で見せると、すでに書いてある点検ポイントに初めて意味が生まれる。壊す・直すのループは子どもにも効く。",
  src="専門家「組み間違い再現」（4人全員に効く案に選出）／体験設計「落としてみよう」／初心者「落としたあとどこを見る」／前回「1基停止デモ」",
  care="爆発・煙・派手な音は足さない。挙動は物理の符号（反トルク・推力配分）だけで描く。「この程度なら飛ばしていい」を教材が判断しない。"),
 dict(n=6,tier=2,name="重さ・お金・重心",eff="S〜M",hit="6視点中4",wow="重さの半分が電池なのか",aud=["around","zero","beg"],
  what="機体の横に重さの積み上げバーが立ち、部品をクリックするとその分が色づく。ペットボトル換算を添える。¥ボタンで各部品に参考価格タグ。重心マーカーが浮かび、バッテリーや荷物をドラッグでずらすと前後のモーターの％が変わり、偏りすぎると片側100%の赤が出る。人型のスケールも同時に置く。",
  why="大人は性能ではなく金と重さで構造を理解する。「電池が一番重くて一番高い」だけで、なぜ飛行時間が短いか・なぜ積載に限界があるかが3分で腑に落ちる。既存の仕様例を生活の単位に翻訳する形。",
  src="全くの素人「値段タグと天秤」／周辺「重さの内訳バー」／初心者「重心をずらす」／体験設計「荷物を載せろ」／前回「人型スケール」",
  care="価格は「参考・◯年時点」と出典を必ず付ける。「落ちたら痛い」は恐怖でなく安全行動につなげる書き方に。"),
 dict(n=7,tier=2,name="図鑑とカード",eff="S",hit="6視点中4",wow="あと3つ、どこだ？",aud=["zero","beg","around"],
  what="部品を見ると図鑑に「発見済み」が付き、右上に12/35が静かに増える。開くたびに1部品がうっすら光り（今日の一部品）、そこを見ると一言の豆知識。全部集まると隠し表示が解放される。カメラボタンで好きな角度・モードがポスター画像になり、LINEにそのまま送れる。",
  why="説明を読まない子は未達成の表示があれば勝手に全部触る。触った回数がそのまま学習量。シニアの「孫に見せたい」は画像が最短。派手なバッジではなく「見る力が増える機能」を報酬にすると教材の品位が保てる。",
  src="全くの素人「記念写真」「コンプリート率」／体験設計「今日の一枚」「部品図鑑」／初心者「今日の1部品」「部品かるた」／周辺「へえカード」",
  care="バッジ・称号・ランキングは作らない。数字1つと控えめな光だけ。連続が途切れた演出は優しく。"),
 dict(n=8,tier=2,name="生きている機体と、みんなの土台",eff="S〜M",hit="6視点中3",wow="あ、こっち向いた",aud=["all"],
  what="開いた瞬間から機体はホバリングしていて、ポインタを近づけると数度だけそちらへ向く。10秒放置で勝手に回りはじめ、触れば止まる。「大きく」ボタンで小さなラベルが消え、画面下の帯に今見ている部品名が大きな字で1つだけ出る。言語は「日本語／やさしい日本語／English」、部品名と役割を1文だけ読み上げる。",
  why="展示の鉄則「動いていないものは見られない」。大きな字・やさしい日本語・読み上げは配慮ではなく、教室の後ろの席や投影、外国の受講者まで同じ体験に乗せる土台。",
  src="体験設計「生きている機体」／アクセシビリティ「大きく読む」「絵と3つの言葉」／全くの素人「拡大鏡＋読み上げ」「言葉ゼロモード」",
  care="傾きは数度で止める（大きいとおもちゃになる）。翻訳は人手が要るので英語は段階的に。"),
 dict(n=9,tier=2,name="授業・説明会モード",eff="M",hit="6視点中3",wow="印刷したらそのまま今日のワークシート",aud=["around","pro"],
  what="「45分授業」「10分住民説明会」の台本が右に固定表示され、段落ごとに視点と表示モードが自動で切り替わる。各段落に問いかけと想定回答、経過時間。Tabキーやスワイプで部品を外から内へ順送り。「ふたりクイズ」はラベルを消して部品を1つ光らせ、答えは画面が出さず隣の人が言う。線画から穴埋め図とふりかえりカードを印刷。",
  why="先生は開いて3秒で授業になるものしか使わない。博物館の観察では学びは画面ではなく隣の人との会話で起こる。答えを画面が出さない設計にすると対話が生まれる。前回のプレゼンモードとURL共有はここに吸収。",
  src="周辺「台本つきコース」「教えるモード」／体験設計「ふたりで指さしクイズ」／アクセシビリティ「部品めぐり」／前回「プレゼンモード」「URL共有」",
  care="台本は教材で示せる範囲に留め、法令の断定を入れない。正誤判定や点数を画面がやり始めると会話が死ぬ。"),
 dict(n=10,tier=2,name="もしもの5場面",eff="M",hit="6視点中2",wow="電波が切れたら勝手に帰るように作られてる",aud=["around","zero"],
  what="「電波が切れた」「電池が少ない」「GPSを見失った」「風が強い」「人が近づいた」を選ぶと、機体が小さく反応し（傾く・ゆっくり降りる・向きを変えて帰る）、働く部品が順に光る。最後に「機体ができること」と「人がやるべきこと」の2欄で締める。",
  why="住民や家族が本当に聞くのは「危なくないの？」。「落ちない」ではなく「落ちにくくする仕組み」と「備え」を対で語れる材料。#5が機体側の故障なのに対し、こちらは外の状況に絞る。",
  src="周辺「もしも安全装備マップ」／初心者「センサー目線」の環境ボタン",
  care="帰還機能は機種・設定に依存し働かない条件がある。「設定と点検が前提」「万能ではない」を必ず画面に置く。"),
 dict(n=11,tier=3,name="機体が見ている世界",eff="M〜L",hit="6視点中3",wow="回してないのに方位が動いた",aud=["pro","beg"],
  what="「センサー視点」でジャイロ・気圧・コンパスの生波形が出て、機体を手で回すとその通りに動く。モーター始動で加速度に細かい振動が乗り、防振マウントで減る。電源線の電流を上げるとコンパスがじわっと狂う。アンテナの指向性がドーナツ状の面で見え、向きで弱くなる。ホバー10分でESC・巻線・バッテリーが熱で色づく。前回の電流の流れと回転磁界もこの層に入る。",
  why="機体は震えながら雑音混じりで自分を見ている。コンパスキャリブレーション・防振・GNSSをマストに上げる理由が、全部「センサーが見ているもの」で説明できる。専門家が「見たことがない」と言う表現。",
  src="専門家「FCが見ている世界」「ホバー10分の熱」／初心者「センサー目線」「電波の通り道」／前回「電流」「回転磁界」",
  care="磁気干渉は定性モデルと明記し、単位（deg/s・g）を正しく付ける。熱は絶対温度でなく順番と相対量を主張にする。"),
 dict(n=12,tier=3,name="1000フライト早送り",eff="M",hit="6視点中2",wow="一番先に赤くなるのはコネクタなのか",aud=["pro","around"],
  what="フライト回数スライダーを0→1000に動かすと、ベアリングのガタ、プロペラ縁の欠け、はんだの微小クラック、バッテリーの容量低下、アーム根元の白化が部位ごとに進行する。機体は消耗区分の4色（必ず減る・摩耗する・事故で壊れやすい・ほぼ壊れない）に塗り分けられ、年間の維持費が幅つきで出る。",
  why="分解図は新品の姿しか見せない。整備士の頭にある「ここが先に死ぬ」順番が初めて時間軸として画面に出る。経営者と農家には「買った後に何にお金と手間がかかるか」で投資判断ができる。",
  src="専門家「1000フライト早送り」／周辺「消耗・交換の地図」",
  care="劣化速度は典型例。順番を見せることに主眼を置き、絶対値は幅で示す。バッテリーは時間だけで決まるように見せない。"),
 dict(n=13,tier=3,name="設計者の工具箱",eff="M〜L",hit="専門家視点",wow="1インチ小さくしただけで立ち上がりが速い",aud=["pro"],
  what="KV値・セル数・プロペラ・重量を入力すると推力重量比・ホバー余裕・飛行時間・重心を再計算。スロットル30→70%のステップ応答を4本の波形（指令・回転数・電流・電圧サグ）で描く。プロペラを翼素で10区間に色分けし周速と先端速度を出す。A/Bスロットで2案を並べ差分だけ光らせる。ヘキサ・VTOLへの機種切替、教則・法令との対応付け、出典ラベル、実ログのリプレイまで。",
  why="固定値の「例」である限り専門家は読んで終わり。触れた瞬間に自社の教習機を入れて説明する道具になる。専門家同士の議論の場にもなる。前回の専門家向け提案をすべてここに集約。",
  src="専門家「階段応答オシロ」「翼素」「A/B比較」「改造判定」「実ログ」／前回「パラメータ計算」「機種切替」「法令対応」「出典」",
  care="最も慎重さが要る。簡易モデルであることと単位を明記し、制度の判定は「考え方と確認先」に留める。ログはブラウザ内で処理しサーバーに送らない。"),
]
TIER = {1:("今すぐ","効果が最も大きく、実装も軽い。この5つで印象が別物になる"),2:("次の波","対象を広げ、再訪と共有の理由を作る"),3:("その先","専門家が唸る深さ。正確さの担保に時間をかける価値がある")}

def auds(a): return '<span class="who">'+''.join(f'<i class="{"on" if k=="all" else ""}">{AUD[k]}</i>' for k in a)+'</span>'

rows = ''.join(f'<tr><td class="n">{it["n"]}</td><td class="nm"><a href="#p{it["n"]}">{esc(it["name"])}</a></td><td>{auds(it["aud"])}</td><td class="eff">{it["eff"]}</td><td><span class="tier t{it["tier"]}">{TIER[it["tier"]][0]}</span></td><td>{esc(it["wow"])}</td></tr>' for it in ITEMS)

cards = ''
for tier in (1,2,3):
    name,lede = TIER[tier]
    cards += f'<h2>{name}<small>{"第1〜5位" if tier==1 else "第6〜10位" if tier==2 else "第11〜13位"}</small></h2><p class="tierlede">{esc(lede)}</p>'
    for it in [i for i in ITEMS if i["tier"]==tier]:
        cards += f'''<article class="card" id="p{it["n"]}">
<figure>{S[it["n"]]}<figcaption>{esc(it["what"].split("。")[0])}。</figcaption></figure>
<div>
<h3><span class="n">{it["n"]:02d}</span>{esc(it["name"])}</h3>
<div class="meta">{auds(it["aud"])}<span class="eff">実装 {it["eff"]}</span><span>指名 {esc(it["hit"])}</span></div>
<dl><dt>何が起きる</dt><dd>{esc(it["what"])}</dd><dt>なぜ効く</dt><dd>{esc(it["why"])}</dd><dt>注意</dt><dd>{esc(it["care"])}</dd></dl>
<div class="wow"><b>おっ</b>{esc(it["wow"])}</div>
<p class="src">元になった案: {esc(it["src"])}</p>
</div></article>'''

page = f'''<meta charset="utf-8">
<title>ドローンの構造 改修メニュー</title>
<style>{css}</style>
{DEFS}
<div class="wrap">
<header class="top">
<div class="eyebrow">ドローンの構造 3D · 改修案の選定資料 · 2026-09-11</div>
<h1>みんなが楽しめる13の改修パッケージ</h1>
<p class="lede">「全く知らない人」「初心者」「専門家」「周辺の関係者」「体験設計のプロ」「誰も取り残さない設計」の6つの視点で別々に検討した約50案を、重複を統合して13に束ね、対象の広さ・驚きの強さ・実装の軽さで順位をつけました。前回の提案もこの中に吸収しています。番号を選んでください。</p>
<div class="thesis">
<div><b>6視点が一致した結論</b>驚きは情報量ではなく「見えないものが見えた瞬間」と「自分の手が原因になった瞬間」に生まれる。</div>
<div><b>共通して最も効く2つ</b>触ると答える機体（#1）と、気流の可視化（#3）。どの立場の人が見ても価値がある。</div>
<div><b>最初のひと束の目安</b>#1・#2・#4は実装が軽く全員に効く。これに#3と#5を足すと「初心者にも専門家にも」が成立する。</div>
</div>
</header>
<h2>優先順位<small>クリックで詳細へ</small></h2>
<div style="overflow-x:auto"><table class="rank"><thead><tr><th>#</th><th>パッケージ</th><th>誰に効くか</th><th>実装</th><th>段階</th><th>「おっ」の瞬間</th></tr></thead><tbody>{rows}</tbody></table></div>
<div class="note"><b>実装の重さの読み方</b> S＝既存機能の流用で数時間〜1日、M＝新しい仕組みを足して数日、L＝データや検証に人手が要る。どれも既存の自動画質調整に組み込み、スマートフォンでの動作を落とさない前提です。</div>
{cards}
<h2 class="cut">今回あえて外したもの</h2>
<ul>
<li><b>スマホの振動やモーター音を主役にする案</b> — iPhoneでは振動APIが使えず、音は教室で出せない。#2の波紋（音の見える化）を先に。</li>
<li><b>世界共有のランキング・称号・レベル</b> — 荒れるうえ教材の品位を落とす。図鑑（#7）は端末内の数字ひとつに留める。</li>
<li><b>WebGLが使えない端末向けの静止画版</b> — 36方向の画像書き出しが重い。自動画質調整の段階を先に増やし、要望が出てから。</li>
<li><b>言葉ゼロ（ピクトグラムのみ）モード</b> — 主要部品の無言アニメを10本作る必要があり、#8の「やさしい日本語／English」で大半の目的が果たせる。</li>
</ul>
</div>'''
open('menu.html','w',encoding='utf-8').write(page)
print(len(page)//1024,'KB', page.count('<svg'),'svgs')
