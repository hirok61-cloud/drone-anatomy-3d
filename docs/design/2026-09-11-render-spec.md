# 描画技術メモ（2026-09-11 レンダリング技術者エージェントの助言）
推定: 310コール/パス・235k tri(巻線127k=54%)。1フレームでシーン走査5回(メイン+影+GTAO法線+Outline×2)。

A1 compileAsync: RTをcomposer.readBufferに合わせて呼ぶ(nullだとACES/sRGB版になり無駄)。xray/paper/影depth(Back/Double/alphaTest/instancing)/GTAO・Outline内部材質をwarmグループで同居させる。checkShaderErrors=false。断面クリップは常に1枚割当て、非表示時は無限遠へ(再コンパイル回避)。検証: info.programs.length。
A2 MSAAはsceneRT(samples4, depthTexture)に限定、composerは非MSAA・depthなし。ScenePassで1回resolve→readBufferへコピー。DPR≥1.75かモバイルはMSAA無し。HalfFloatは拡張チェック、無ければUnsignedByte。
A3 影: shadowMap.autoUpdate=false + needsUpdate(分解/飛行/モード/可視/テーマ/断面/品質変更時のみ。カメラ操作では不要)。near1.2 far2.8。1024(品質2は2048)。normalBias≈texel幅×1.3。ベル内部(巻線・歯・磁石)はcastShadow=false。radiusはPCFSoftで無効。VSM/CSM不採用。
A4 GTAO: 半解像度(setSizeをラップ)、samples8/rings1、隔フレーム更新(動きがある時はaoDirty)、copy省略しreadBufferに乗算blend(GtaoLite)。モバイルはoff+接地疑似AO。
A5 OutlinePass1本(半解像度、edgeThickness1.0)。ホバーはsetTint(材質clone・プログラム共有)。品質≤1は選択もティント。
A6 巻線LOD/削減(220/6→110/4 or ボビン形状)、RoundedBox seg 3→2(10mm未満は1)、同一部品・同一材質メッシュの統合、バランスリードは頂点色1材質。
A7 DPR=min(dpr,2,sqrt(BUDGET[level]/(W*H)))、0.25刻み。BUDGET=[1.1e6,2.0e6,3.7e6]。
A8 品質0はcomposerを通さず直描き(antialias:trueでコンテキスト作成)。
A9 テクスチャは`base.clone()`でSource共有。異方性 mobile4/desktop8。(repeat70は正しい: ExtrudeGeometryのUVはm単位)
A10 ホバーpickは内部部品を除外。オンデマンド描画(静止時rAF停止)。
B1 粒子: InstancedBufferGeometry(1×1クワッド)×4×N、seed属性のみ、頂点シェーダで時間関数。uRotor[4]=mo.group.matrixWorld、uRpm、uWind=−body.v。ストリーク(速度方向に伸ばす)。ソフト粒子はsceneRT.depthTextureをParticlePassで読む(#define SOFT)。N=3000/1500/500。
B2 ブラー: 指標はdpf=rpm/60·360·dt·timeScale(度)。wReal=1−smoothstep(12,40), wGhost=smoothstep(8,20)·(1−smoothstep(40,90)), wDisc=smoothstep(35,90)。残像2枚(±dpf/3, 0.35)。円盤テクスチャは翼シルエットの角度スミア、disc.rotation.y += dir·4·dt。alphaHashも可。
B3 部品が飛ぶ: p.animスロットをapplyExplodeで合成(pos/quat/v/w、簡易重力・バウンド)。脚のしなり: CylinderGeometry heightSegments12 + onBeforeCompileでuBend曲げ(customProgramCacheKey)。赤点灯: メッシュごとに材質を遅延cloneしてキャッシュ(setTint)、applyModeの復元は tint||origMat。
B4 入力: pointerdown captureで機体命中時のみ保留(controls.enabled=false)、180ms超or遅い24px移動→合成PointerEventでOrbitControlsを今の位置から開始、<250ms & >600px/s→flick。スティックはcanvas外DOM。
B5 塗り分け: setTint(color半分寄せ+emissive .6〜.9)。OutlinePass×3やオーバーレイ材質は不可。X線時はxrayMat.clone×3色。
C 段階: 3(PC高: DPR2/3.7MP, MSAA, GTAO半解像度毎F, 影2048, 粒子3000, 残像+スミア) 2(2.5MP, DPR≥1.75でMSAA無, GTAO隔F, 影1024, 1500) 1(1.5/1.6MP, AO無, ティント, 800, スミアのみ) 0(1.25/1.0MP, 影無, 300)。落とす順: 粒子→AO更新率→AO→影解像度→DPR→MSAA→残像→影→直描き。判定はp90(120フレーム)、コンパイルフレーム除外、下げ2s継続/上げ6s継続+20s間隔。初期: mobile&&hf?1:mobile?0:2。
D 計測: renderTimedでパス別コール/時間、programs.length監視、EXT_disjoint_timer_query(Chromium PCのみ)、rAF間隔 vs composer CPU時間でGPU/CPU律速を切り分け。
