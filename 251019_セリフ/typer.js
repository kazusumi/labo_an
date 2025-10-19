/*!
 * initTyper(scope, options)
 * Animate HTML5 Canvas / CreateJS 用：舞台上の Text(nameが "ty_*") をタイプ表示
 * 使い方（1フレ目のアクション）:
 *   initTyper(this, { soundId: "type2", volume: 0.4, autoNext: false, nextButtonName: "btnNext" });
 */
(function (global) {
  function initTyper(scope, options) {
    if (scope._ty && scope._ty._booted) return; // 二重初期化防止

    const conf = Object.assign({
      soundId: null,        // 効果音ID（Sound.registerSound or ライブラリ配置でmanifest登録）
      volume: 0.5,
      autoNext: false,      // trueなら打ち終わり後に次フレームへ
      nextButtonName: "btnNext", // 次へボタン（各フレーム任意配置）
      stepBase: 1           // 速度の最小ステップ
    }, options || {});

    scope._ty = { items: [], ticking: false, lastFrame: -1, _booted: true };

    // --- 名前から速度/待機を拾う: ty_xxx__s2w400
    const parseConfig = (name)=>{
      const cfg = { speed: 2, wait: 0 };
      const m = name && name.match(/__([sw]\d+([sw]\d+)*)$/);
      if (m) (m[1].match(/[sw]\d+/g) || []).forEach(t=>{
        if (t[0]==="s") cfg.speed = Math.max(1, Math.min(5, parseInt(t.slice(1),10)||2)); // 小さいほど速い
        if (t[0]==="w") cfg.wait  = Math.max(0, parseInt(t.slice(1),10)||0);
      });
      return cfg;
    };

    // --- 現スコープから ty_ の Text を収集
    const collectTyperTexts = (d)=>{
      const out=[]; const walk=(x)=>{ if(!x)return;
        if (x.children && x.children.length) x.children.forEach(walk);
        if (x instanceof createjs.Text && typeof x.name==="string" && x.name.indexOf("ty_")===0) out.push(x);
      };
      walk(d); return out;
    };

    // --- フレーム初期化（先に空にしてチラ見え防止）
    const prepareFrameTexts = ()=>{
      scope._ty.items = [];
      const texts = collectTyperTexts(scope);
      texts.forEach(txt=>{
        txt._full = txt.text || "";
        txt._idx = 0;
        txt._counter = 0;
        txt._cfg = parseConfig(txt.name);
        txt.text = "";                  // 先に消す
        scope._ty.items.push(txt);
      });
      scope._ty.ticking = false;
      setTimeout(()=>{ scope._ty.ticking = scope._ty.items.length > 0; }, 50);
    };

    // --- 1文字ずつ進める
    const tyTick = ()=>{
      if (!scope._ty.ticking) return;
      let allDone = true;

      scope._ty.items.forEach(txt=>{
        if (!txt) return;
        const cfg = txt._cfg || { speed: 2 };
        const step = Math.max(conf.stepBase, cfg.speed); // 1=速い
        if (txt._idx < (txt._full || "").length) {
          allDone = false;
          txt._counter++;
          if (txt._counter % step === 0) {
            txt.text += txt._full.charAt(txt._idx++);
            // 効果音（2文字に1回）
            if (conf.soundId && txt._idx % 2 === 0) {
              try { createjs.Sound.play(conf.soundId, { volume: conf.volume }); } catch(e){}
            }
          }
        }
      });

      if (allDone && scope._ty.items.length > 0) {
        scope._ty.ticking = false;
        const maxWait = Math.max.apply(null, scope._ty.items.map(t => (t._cfg && t._cfg.wait) || 0));
        setTimeout(()=>{ if (conf.autoNext) scope.gotoAndStop(scope.currentFrame+1); }, maxWait);
      }
    };

    // --- スキップ or 次へ
    const skipOrNext = ()=>{
      let hadTyping = false;
      scope._ty.items.forEach(txt=>{
        if (txt && txt._idx < (txt._full || "").length) {
          hadTyping = true;
          txt.text = txt._full;
          txt._idx = txt._full.length;
        }
      });
      if (!hadTyping) scope.gotoAndStop(scope.currentFrame + 1);
    };

    // --- 次へボタン（各フレームで再検出）
    const setNextButton = ()=>{
      if (scope._btnNext) scope._btnNext.removeAllEventListeners();
      scope._btnNext = scope[conf.nextButtonName];
      if (scope._btnNext) {
        scope._btnNext.cursor = "pointer";
        scope._btnNext.on("click", skipOrNext);
      }
    };

    // --- オーディオ解禁（Chrome等）
    let _audioUnlocked = false;
    const unlock = ()=>{ if (_audioUnlocked) return; try { createjs.Sound.play(null); } catch(e){} _audioUnlocked = true; };
    scope.on("click", unlock);

    // --- 入力系（クリック/スペースでスキップ→次）
    scope.on("click", skipOrNext);
    window.addEventListener("keydown", e=>{ if (e.code==="Space") skipOrNext(); });

    // --- 唯一のtick：フレーム変化検出→初期化→進行
    scope.on("tick", ()=>{
      if (scope.currentFrame !== scope._ty.lastFrame) {
        scope._ty.lastFrame = scope.currentFrame;
        prepareFrameTexts();
        setTimeout(setNextButton, 0);
      }
      tyTick();
    });
  }

  // グローバル公開
  global.initTyper = initTyper;

})(this);
