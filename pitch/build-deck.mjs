import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname);
const file = path.join(root, 'index.html');
const template = '/Users/wang/.agents/skills/guizang-ppt-skill/assets/template-swiss.html';
const motionSrc = '/Users/wang/.agents/skills/guizang-ppt-skill/assets/motion.min.js';
let html = fs.readFileSync(template, 'utf8');

const extraCss = String.raw`
  /* bilingual EN/CN toggle */
  body.lang-en .zh, body.lang-zh .en { display: none !important; }
  #lang-toggle{
    position:fixed; top:1.5vh; right:1.6vw; z-index:40;
    font-family:var(--mono); font-size:12px; font-weight:600;
    letter-spacing:.12em; text-transform:uppercase;
    color:var(--ink); background:rgba(250,250,248,.72);
    border:1px solid rgba(0,0,0,.16); border-radius:0;
    padding:4px 9px; cursor:pointer; opacity:.5;
    display:inline-flex; align-items:center; gap:.4ch;
    transition:opacity .2s, background .2s, color .2s, border-color .2s;
  }
  #lang-toggle:hover{ opacity:1; background:var(--ink); color:var(--paper); border-color:var(--ink); }
  body.dark-bg #lang-toggle{ color:var(--paper); background:rgba(10,10,10,.5); border-color:rgba(255,255,255,.26); }
  body.dark-bg #lang-toggle:hover{ opacity:1; background:var(--paper); color:var(--ink); border-color:var(--paper); }
  body.lang-en #lang-toggle .tg-zh { opacity:.45; }
  body.lang-zh #lang-toggle .tg-en { opacity:.45; }
  #nav, #hint { transition: opacity .45s ease; }
  body.ui-idle #hint { opacity: 0 !important; pointer-events: none; }
  body.ui-idle #nav .dot { opacity: .16; }
  body.ui-idle #nav .dot.active { opacity: 1; }
  #nav .dot { background: rgba(0,0,0,.22); }
  body.dark-bg #nav .dot { background: rgba(255,255,255,.26); }

  .deck-link{color:inherit;text-decoration:none;border-bottom:1px solid currentColor}
  .proof-url{
    display:block;
    font-family:var(--mono);
    font-size:max(14px,.78vw);
    line-height:1.45;
    letter-spacing:.02em;
    overflow-wrap:anywhere;
    color:var(--text-secondary);
  }
  .proof-card{
    background:var(--grey-1);
    padding:2.2vh 1.6vw;
    border-top:2px solid var(--accent);
    display:flex;
    flex-direction:column;
    gap:1vh;
    min-height:0;
  }
  .proof-card.dark-card{background:var(--ink);color:var(--paper)}
  .proof-card .value{
    font-family:var(--sans);
    font-size:min(3.4vw,6vh);
    font-weight:200;
    line-height:1;
    letter-spacing:-.03em;
    font-feature-settings:"tnum";
  }
  .system-row{
    display:grid;
    grid-template-columns:1fr auto 1fr auto 1fr;
    gap:1.2vw;
    align-items:center;
  }
  .system-box{
    background:var(--grey-1);
    min-height:18vh;
    padding:2.2vh 1.6vw;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    border-top:2px solid var(--border-subtle);
  }
  .system-box.accent-box{background:var(--accent);color:var(--accent-on);border-top-color:var(--accent)}
  .system-arrow{
    font-family:var(--sans);
    font-weight:200;
    font-size:min(4.6vw,8vh);
    color:var(--accent);
    line-height:1;
  }
`;

const langButton = `<button id="lang-toggle" type="button" aria-label="Toggle language / 切换语言">
  <span class="tg-en">EN</span> · <span class="tg-zh">中</span>
</button>`;

const langJs = String.raw`
<script>
(function(){
  var KEY='deepbook-risk-console-deck-lang';
  var body=document.body;
  var btn=document.getElementById('lang-toggle');
  function hintFor(lang){
    var lp=window.__lowPowerMode;
    var nav = lang==='zh' ? '← → 翻页' : '← → NAVIGATE';
    var stat= lang==='zh' ? (lp?'动态':'静态') : (lp?'MOTION':'STATIC');
    var idx = lang==='zh' ? '索引' : 'INDEX';
    var lng = lang==='zh' ? '语言' : 'LANG';
    return nav+' · B '+stat+' · ESC '+idx+' · L '+lng;
  }
  function setLang(lang){
    body.classList.remove('lang-en','lang-zh');
    body.classList.add('lang-'+lang);
    try{localStorage.setItem(KEY,lang);}catch(e){}
    document.documentElement.lang = lang==='zh'?'zh-CN':'en';
    var h=document.getElementById('hint'); if(h) h.textContent=hintFor(lang);
  }
  var saved=(function(){try{return localStorage.getItem(KEY);}catch(e){return null;}})();
  setLang(saved==='zh'?'zh':'en');
  if(btn) btn.addEventListener('click',function(){setLang(body.classList.contains('lang-zh')?'en':'zh');});
  window.addEventListener('keydown',function(e){
    if(e.key && e.key.toLowerCase()==='l' && !e.metaKey && !e.ctrlKey && !e.altKey){
      e.preventDefault();
      setLang(body.classList.contains('lang-zh')?'en':'zh');
    }
  });
  window.addEventListener('swiss-low-power-change',function(){
    var h=document.getElementById('hint');
    if(h) h.textContent=hintFor(body.classList.contains('lang-zh')?'zh':'en');
  });
  window.addEventListener('DOMContentLoaded',function(){
    setTimeout(function(){ setLang(body.classList.contains('lang-zh')?'zh':'en'); }, 0);
  });
})();
</script>
<script>
(function(){
  var timer;
  function wake(){
    document.body.classList.remove('ui-idle');
    clearTimeout(timer);
    timer=setTimeout(function(){ document.body.classList.add('ui-idle'); }, 3800);
  }
  wake();
  ['keydown','mousemove','touchstart','click','wheel'].forEach(function(ev){
    addEventListener(ev, wake, {passive:true});
  });
})();
</script>`;

const slides = String.raw`
<section class="slide accent" data-layout="S01" data-animate="hero">
  <div class="canvas-card">
    <canvas class="ascii-bg" aria-hidden="true"></canvas>
    <div class="chrome-min">
      <div class="l">DeepBook Risk Console</div>
      <div class="r">Pitch Deck · 01 / 12</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr auto;gap:2.6vh">
      <div data-anim="kicker" class="t-meta" style="color:rgba(255,255,255,.78);letter-spacing:.22em">
        <span class="en">Predict Risk Console + LP Guard</span><span class="zh">预测风险控制台 + LP 守卫</span>
      </div>
      <h1 data-anim="title" style="align-self:start;margin-top:5vh;font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(9.4vw,16.4vh);line-height:.94;letter-spacing:-.025em;color:#fff">
        <span class="en">Trade on DeepBook<br/>with a <span style="font-style:italic;font-weight:300">guard</span>.</span>
        <span class="zh">给 DeepBook<br/>加一层<span style="font-style:italic;font-weight:300">风控守卫</span></span>
      </h1>
      <div data-anim="bottom" style="display:grid;grid-template-rows:auto auto;gap:1.6vh;border-top:1px solid rgba(255,255,255,.22);padding-top:2vh">
        <div data-anim="lead" class="lead" style="max-width:58ch;color:rgba(255,255,255,.86)">
          <span class="en">A Sui execution console that scores maker risk, creates a guard policy, places a real DeepBook order, records an on-chain receipt, then cancels and recovers unused funds.</span>
          <span class="zh">一个 Sui 执行控制台：先评估 maker 风险，再创建守卫策略，真实下 DeepBook 订单，写链上凭证，最后取消并回收未使用资金。</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:end">
          <div class="t-meta" style="color:rgba(255,255,255,.6)">Overflow 2026 · Sui / DeepBookV3</div>
          <div class="t-meta" style="color:rgba(255,255,255,.6)">L = EN / 中文</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="slide dark" data-layout="S09" data-animate="statement">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Problem</div>
      <div class="r">02 / 12</div>
    </div>
    <div class="dot-mat xl" style="position:absolute;right:5vw;top:18vh;width:34vw;height:54vh;color:rgba(255,255,255,.18)"></div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr auto;gap:3vh">
      <div data-anim="head" class="t-meta" style="color:rgba(255,255,255,.62)">
        <span class="en">THE RISK GAP</span><span class="zh">风险缺口</span>
      </div>
      <h2 data-anim="statement" style="align-self:center;max-width:12ch;font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(8.4vw,14.8vh);line-height:.98;letter-spacing:-.035em;color:#fff">
        <span class="en">A live order is easy.<br/>A safe order is not.</span>
        <span class="zh">下单很容易。<br/>安全地下单很难。</span>
      </h2>
      <p data-anim="foot" class="t-body" style="max-width:64ch;color:rgba(255,255,255,.78)">
        <span class="en">Wallets can sign PTBs, DeepBook can match orders, but LPs still need explicit limits: notional, spread, price band, inventory exposure, and audit evidence.</span>
        <span class="zh">钱包可以签 PTB，DeepBook 可以撮合订单，但 LP 还需要明确边界：名义金额、价差、价格带、库存暴露，以及可审计的证据。</span>
      </p>
    </div>
  </div>
</section>

<section class="slide" data-layout="S08" data-animate="duo-mirror">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Before / After</div>
      <div class="r">03 / 12</div>
    </div>
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">Product shape</div>
      <h2 class="h-xl-zh" style="font-size:min(5.8vw,10.2vh)">
        <span class="en">From blind execution to guarded execution</span>
        <span class="zh">从盲目执行，到带守卫执行</span>
      </h2>
    </div>
    <div class="duo-compare" data-anim="duo">
      <div class="col">
        <div class="col-tag"><span class="num">01</span><span class="en">Plain order</span><span class="zh">普通订单</span></div>
        <div class="col-ttl"><span class="en">Sign first</span><span class="zh">先签名</span></div>
        <div class="col-desc"><span class="en">The UI can warn, but the chain only sees the DeepBook action.</span><span class="zh">前端可以提醒，但链上只看到 DeepBook 动作。</span></div>
        <ul class="col-list">
          <li><span class="en">No policy object</span><span class="zh">没有策略对象</span></li>
          <li><span class="en">No deterministic score</span><span class="zh">没有确定性评分</span></li>
          <li><span class="en">No guard receipt</span><span class="zh">没有守卫凭证</span></li>
        </ul>
      </div>
      <div class="vrule"></div>
      <div class="col accent">
        <div class="col-tag"><span class="num">02</span><span class="en">Guarded order</span><span class="zh">受控订单</span></div>
        <div class="col-ttl"><span class="en">Score first</span><span class="zh">先评分</span></div>
        <div class="col-desc"><span class="en">The same PTB records a guard receipt beside the DeepBook action.</span><span class="zh">同一笔 PTB 在 DeepBook 动作旁写入守卫凭证。</span></div>
        <ul class="col-list">
          <li><span class="en">PASS / WARN / BLOCK before signing</span><span class="zh">签名前 PASS / WARN / BLOCK</span></li>
          <li><span class="en">Shared policy with hard limits</span><span class="zh">共享策略对象保存硬边界</span></li>
          <li><span class="en">Order and receipt share one digest</span><span class="zh">订单和凭证共享同一个 digest</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="slide" data-layout="S21" data-animate="tech-spec">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Live proof</div>
      <div class="r">04 / 12</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr;gap:4vh">
      <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
        <div class="t-meta">External evidence</div>
        <h2 class="h-xl-zh" style="font-size:min(5.6vw,9.8vh)">
          <span class="en">The execution is real.</span><span class="zh">这是真实执行。</span>
        </h2>
      </div>
      <div data-anim="grid" class="grid-12" style="align-content:start">
        <div class="span-4 proof-card">
          <div class="t-meta">DeepBook order</div>
          <div class="value">Placed</div>
          <div class="t-body-sm"><span class="en">sell · 1 SUI · 3.76 DBUSDC</span><span class="zh">卖单 · 1 SUI · 3.76 DBUSDC</span></div>
        </div>
        <div class="span-4 proof-card">
          <div class="t-meta">Order id</div>
          <div class="t-body-sm" style="font-family:var(--mono);overflow-wrap:anywhere">170141183460538591489404451629960763919</div>
          <div class="t-body-sm"><span class="en">Returned by DeepBook indexer</span><span class="zh">由 DeepBook indexer 返回</span></div>
        </div>
        <div class="span-4 proof-card">
          <div class="t-meta">Transaction digest</div>
          <div class="t-body-sm" style="font-family:var(--mono);overflow-wrap:anywhere">7KKo4nS8syhJNCstEG8Dg4pC2ccr8GEa7x2bjPsUPNGf</div>
          <div class="t-body-sm"><span class="en">DeepBook action + guard receipt</span><span class="zh">DeepBook 动作 + 守卫凭证</span></div>
        </div>
        <div class="span-6 proof-card">
          <div class="t-meta">DeepBook indexer</div>
          <a class="proof-url deck-link" href="https://deepbook-indexer.testnet.mystenlabs.com/orders/SUI_DBUSDC/0x641710181a1c9e18f50675238754de69ca5926be03d8c61dd91f40ed2ca41bd6?limit=10">/orders/SUI_DBUSDC/{balance_manager}?limit=10</a>
          <a class="proof-url deck-link" href="https://deepbook-indexer.testnet.mystenlabs.com/order_updates/SUI_DBUSDC?limit=10&balance_manager_id=0x641710181a1c9e18f50675238754de69ca5926be03d8c61dd91f40ed2ca41bd6">/order_updates/SUI_DBUSDC?balance_manager_id=...</a>
        </div>
        <div class="span-6 proof-card dark-card">
          <div class="t-meta" style="color:rgba(255,255,255,.62)">SuiVision</div>
          <a class="proof-url deck-link" style="color:rgba(255,255,255,.82)" href="https://testnet.suivision.xyz/txblock/7KKo4nS8syhJNCstEG8Dg4pC2ccr8GEa7x2bjPsUPNGf">SuiVision transaction · 7KKo4n...</a>
          <a class="proof-url deck-link" style="color:rgba(255,255,255,.82)" href="https://testnet.suivision.xyz/object/0x0d05865545ea792e4bcd45e0966d30daa1f53b3009a9db2ed35cb8a558f7eebd">GuardReceipt object · 0x0d05...</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="slide" data-layout="S11" data-animate="timeline-walk">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Execution flow</div>
      <div class="r">05 / 12</div>
    </div>
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">Operator script</div>
      <h2 class="h-xl-zh" style="font-size:min(5.6vw,9.8vh)">
        <span class="en">Five moments that prove the product</span>
        <span class="zh">五个环节，证明产品成立</span>
      </h2>
    </div>
    <div class="timeline-h nav-safe-bottom" data-anim="timeline">
      <div class="tl-row">
        <div class="th-node up">
          <div class="label"><div class="yr">01</div><div class="name"><span class="en">Connect</span><span class="zh">连接钱包</span></div><div class="desc"><span class="en">Sui wallet</span><span class="zh">Sui 钱包</span></div></div><div class="dot"></div>
        </div>
        <div class="th-node down accent">
          <div class="label"><div class="yr">02</div><div class="name"><span class="en">Policy</span><span class="zh">创建策略</span></div><div class="desc"><span class="en">max notional, spread, band</span><span class="zh">金额、价差、价格带</span></div></div><div class="dot"></div>
        </div>
        <div class="th-node up">
          <div class="label"><div class="yr">03</div><div class="name"><span class="en">Fund</span><span class="zh">注入资金</span></div><div class="desc"><span class="en">BalanceManager + SUI</span><span class="zh">BalanceManager + SUI</span></div></div><div class="dot"></div>
        </div>
        <div class="th-node down accent">
          <div class="label"><div class="yr">04</div><div class="name"><span class="en">Guarded ask</span><span class="zh">受控卖单</span></div><div class="desc"><span class="en">post-only maker ask</span><span class="zh">post-only maker ask</span></div></div><div class="dot"></div>
        </div>
        <div class="th-node up">
          <div class="label"><div class="yr">05</div><div class="name"><span class="en">Exit cleanly</span><span class="zh">安全退出</span></div><div class="desc"><span class="en">verify, cancel, recover SUI</span><span class="zh">验证、取消、回收 SUI</span></div></div><div class="dot"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="slide grey" data-layout="S17" data-animate="system-diagram">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">System</div>
      <div class="r">06 / 12</div>
    </div>
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh;max-width:78vw">
      <div style="display:flex;flex-direction:column;gap:1.4vh">
        <div class="t-meta">Architecture</div>
        <h2 class="h-xl-zh" style="font-size:min(5.4vw,9.4vh)">
          <span class="en">A frontend preflight becomes a chain receipt.</span>
          <span class="zh">前端预检，变成链上凭证。</span>
        </h2>
      </div>
      <p class="t-body" style="margin-top:.6vh;max-width:68ch"><span class="en">The console does not custody keys. It builds PTBs, the wallet signs, DeepBook executes, and the Move package records why the action was allowed.</span><span class="zh">控制台不托管私钥。它构建 PTB，由钱包签名，DeepBook 执行，Move 包记录为什么允许这次动作。</span></p>
    </div>
    <div data-anim="diagram" style="flex:1;display:flex;align-items:center">
      <div class="system-row" style="width:100%">
        <div class="system-box">
          <div class="t-meta">React console</div>
          <div class="t-body-emp"><span class="en">Prediction input<br/>LP guardrails</span><span class="zh">预测输入<br/>LP 风控边界</span></div>
          <div class="t-body-sm">risk-engine</div>
        </div>
        <div class="system-arrow">→</div>
        <div class="system-box accent-box">
          <div class="t-meta" style="color:rgba(255,255,255,.78)">Wallet-signed PTB</div>
          <div class="t-body-emp" style="color:#fff"><span class="en">DeepBook order<br/>+ guard receipt</span><span class="zh">DeepBook 订单<br/>+ 守卫凭证</span></div>
          <div class="t-body-sm" style="color:rgba(255,255,255,.82)">dApp Kit + SDK</div>
        </div>
        <div class="system-arrow">→</div>
        <div class="system-box">
          <div class="t-meta">Sui execution layer</div>
          <div class="t-body-emp"><span class="en">Pool, BalanceManager,<br/>GuardPolicy</span><span class="zh">Pool、BalanceManager、<br/>GuardPolicy</span></div>
          <div class="t-body-sm">Move 2024</div>
        </div>
      </div>
    </div>
    <div data-anim="foot" class="kpi-row-4 nav-safe-bottom-tight">
      <div class="kpi-cell"><div class="lbl">Network</div><div class="nb">Sui</div><div class="note">configured execution</div></div>
      <div class="kpi-cell"><div class="lbl">Pool</div><div class="nb">SUI<span class="unit">DBUSDC</span></div><div class="note">DeepBookV3</div></div>
      <div class="kpi-cell"><div class="lbl">Order</div><div class="nb">1<span class="unit">SUI</span></div><div class="note">maker ask</div></div>
      <div class="kpi-cell"><div class="lbl">Receipt</div><div class="nb">1<span class="unit">object</span></div><div class="note">guard evidence</div></div>
    </div>
  </div>
</section>

<section class="slide" data-layout="S04" data-animate="grid-reveal">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Risk engine</div>
      <div class="r">07 / 12</div>
    </div>
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">Deterministic scoring</div>
      <h2 class="h-xl-zh" style="font-size:min(5.6vw,9.8vh)">
        <span class="en">The score is simple on purpose.</span>
        <span class="zh">评分故意做得简单、可解释。</span>
      </h2>
    </div>
    <div class="sub-grid-3-2" data-anim="grid">
      <div class="sub-card"><div class="nb-corner">01</div><i data-lucide="circle-dollar-sign"></i><div class="ttl"><span class="en">Notional cap</span><span class="zh">名义金额上限</span></div><div class="desc"><span class="en">Blocks orders above policy size.</span><span class="zh">超过策略规模直接阻断。</span></div></div>
      <div class="sub-card"><div class="nb-corner">02</div><i data-lucide="move-horizontal"></i><div class="ttl"><span class="en">Maker spread</span><span class="zh">Maker 价差</span></div><div class="desc"><span class="en">Requires minimum bps away from mid.</span><span class="zh">要求离中间价有最小 bps。</span></div></div>
      <div class="sub-card"><div class="nb-corner">03</div><i data-lucide="radar"></i><div class="ttl"><span class="en">Price band</span><span class="zh">价格带距离</span></div><div class="desc"><span class="en">Warns when price is too far from scenario band.</span><span class="zh">价格离情景带太远则警告。</span></div></div>
      <div class="sub-card"><div class="nb-corner">04</div><i data-lucide="scale"></i><div class="ttl"><span class="en">Inventory exposure</span><span class="zh">库存暴露</span></div><div class="desc"><span class="en">Compares base inventory against quote inventory.</span><span class="zh">比较 base 与 quote 库存偏斜。</span></div></div>
      <div class="sub-card"><div class="nb-corner">05</div><i data-lucide="shield-check"></i><div class="ttl"><span class="en">Policy active</span><span class="zh">策略启用</span></div><div class="desc"><span class="en">Inactive policy makes execution impossible.</span><span class="zh">策略停用则无法执行。</span></div></div>
      <div class="sub-card accent"><div class="nb-corner">06</div><i data-lucide="traffic-cone"></i><div class="ttl"><span class="en">PASS / WARN / BLOCK</span><span class="zh">PASS / WARN / BLOCK</span></div><div class="desc"><span class="en">Readable status before wallet signature.</span><span class="zh">签名前给出可读状态。</span></div></div>
    </div>
  </div>
</section>

<section class="slide" data-layout="S05" data-animate="stack-build">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Move package</div>
      <div class="r">08 / 12</div>
    </div>
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">On-chain guard objects</div>
      <h2 class="h-xl-zh" style="font-size:min(5.4vw,9.4vh)">
        <span class="en">We record the reason, not just the action.</span>
        <span class="zh">我们记录原因，而不只是动作。</span>
      </h2>
    </div>
    <div class="stack-row" data-anim="stack">
      <div class="stack-block b-ink">
        <div class="layer-nb">LAYER 01</div>
        <i data-lucide="shield" class="lucide"></i>
        <div class="layer-ttl"><span class="en">GuardPolicy</span><span class="zh">守卫策略</span></div>
        <div class="layer-desc"><span class="en">Owner, pool key, max notional, spread, inventory skew, max order size, active flag.</span><span class="zh">保存 owner、pool key、最大金额、价差、库存偏斜、最大订单规模和 active 状态。</span></div>
        <div class="layer-tag">shared policy object</div>
      </div>
      <div class="stack-block b-accent">
        <div class="layer-nb">LAYER 02</div>
        <i data-lucide="file-check-2" class="lucide"></i>
        <div class="layer-ttl"><span class="en">GuardReceipt</span><span class="zh">守卫凭证</span></div>
        <div class="layer-desc"><span class="en">Records action, side, price, quantity, client order id, risk score, DeepBook action type.</span><span class="zh">记录动作、方向、价格、数量、client order id、风险分数和 DeepBook 动作类型。</span></div>
        <div class="layer-tag">audit object + event</div>
      </div>
      <div class="stack-block b-grey">
        <div class="layer-nb">LAYER 03</div>
        <i data-lucide="undo-2" class="lucide"></i>
        <div class="layer-ttl"><span class="en">Cancel receipt</span><span class="zh">取消凭证</span></div>
        <div class="layer-desc"><span class="en">Cancel releases order inventory back to the BalanceManager; withdrawal returns unused SUI to the wallet.</span><span class="zh">取消会把订单库存释放回 BalanceManager；提现把未使用 SUI 退回钱包。</span></div>
        <div class="layer-tag">operator-safe ending</div>
      </div>
    </div>
  </div>
</section>

<section class="slide grey" data-layout="S18" data-animate="why-now">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Why now</div>
      <div class="r">09 / 12</div>
    </div>
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr auto;gap:4vh">
      <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
        <div class="t-meta">Timing</div>
        <h2 class="h-xl-zh" style="font-size:min(5.6vw,9.8vh)">
          <span class="en">DeepBook is composable enough for risk apps.</span>
          <span class="zh">DeepBook 已经足够可组合，可以承载风控应用。</span>
        </h2>
      </div>
      <div data-anim="grid" class="grid-3" style="align-self:start">
        <div class="proof-card"><div class="t-meta">01 · SDK</div><div class="t-h-prod"><span class="en">Orders are programmable</span><span class="zh">订单可编程</span></div><div class="t-body-sm"><span class="en">DeepBookV3 SDK lets us build order/cancel PTBs.</span><span class="zh">DeepBookV3 SDK 能构建下单/取消 PTB。</span></div></div>
        <div class="proof-card"><div class="t-meta">02 · Wallet</div><div class="t-h-prod"><span class="en">Signing stays user-owned</span><span class="zh">签名仍归用户</span></div><div class="t-body-sm"><span class="en">dApp Kit keeps private keys out of the browser app.</span><span class="zh">dApp Kit 让私钥不进入浏览器应用。</span></div></div>
        <div class="proof-card"><div class="t-meta">03 · Indexer</div><div class="t-h-prod"><span class="en">Proof is externally visible</span><span class="zh">证明可外部查看</span></div><div class="t-body-sm"><span class="en">Public indexer shows orders, updates, and book depth.</span><span class="zh">公开 indexer 能显示订单、更新和盘口深度。</span></div></div>
      </div>
      <div data-anim="big" style="border-top:1px solid var(--grey-2);padding-top:2vh">
        <div class="kpi-thin accent" style="font-size:min(10vw,17vh)">1<span class="unit">digest</span></div>
        <div class="t-body"><span class="en">One signed transaction can combine DeepBook execution with our guard receipt.</span><span class="zh">一笔签名交易可以同时包含 DeepBook 执行和我们的守卫凭证。</span></div>
      </div>
    </div>
  </div>
</section>

<section class="slide" data-layout="S16" data-animate="field-notes">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Video script</div>
      <div class="r">10 / 12</div>
    </div>
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">What to say on camera</div>
      <h2 class="h-xl-zh" style="font-size:min(5.4vw,9.4vh)">
        <span class="en">The product story in six beats</span>
        <span class="zh">产品讲解抓住这六件事</span>
      </h2>
    </div>
    <div class="sub-grid-3-2" data-anim="grid">
      <div class="sub-card"><div class="nb-corner">01</div><div class="ttl"><span class="en">Wallet-native execution.</span><span class="zh">钱包原生执行。</span></div><div class="desc"><span class="en">No browser private keys; users sign through their wallet.</span><span class="zh">浏览器不保存私钥；用户通过钱包签名。</span></div></div>
      <div class="sub-card"><div class="nb-corner">02</div><div class="ttl"><span class="en">The risk panel is live.</span><span class="zh">风险面板是实时的。</span></div><div class="desc"><span class="en">Change price or size and checks update before signing.</span><span class="zh">改价格或数量，签名前检查会变化。</span></div></div>
      <div class="sub-card"><div class="nb-corner">03</div><div class="ttl"><span class="en">Policy is on-chain.</span><span class="zh">策略在链上。</span></div><div class="desc"><span class="en">Create GuardPolicy, then reuse the object id.</span><span class="zh">创建 GuardPolicy，并复用对象 ID。</span></div></div>
      <div class="sub-card"><div class="nb-corner">04</div><div class="ttl"><span class="en">DeepBook sees the order.</span><span class="zh">DeepBook 看得到订单。</span></div><div class="desc"><span class="en">Open the indexer URL and show placed status.</span><span class="zh">打开 indexer URL，展示 placed 状态。</span></div></div>
      <div class="sub-card"><div class="nb-corner">05</div><div class="ttl"><span class="en">Sui sees the receipt.</span><span class="zh">Sui 看得到凭证。</span></div><div class="desc"><span class="en">Open SuiVision and show the created GuardReceipt.</span><span class="zh">打开 SuiVision，展示创建的 GuardReceipt。</span></div></div>
      <div class="sub-card accent"><div class="nb-corner">06</div><div class="ttl"><span class="en">Cancel, then recover.</span><span class="zh">取消，然后回收。</span></div><div class="desc"><span class="en">Cancel releases funds inside BalanceManager; withdraw returns unused SUI to the wallet.</span><span class="zh">取消释放 BalanceManager 内资金；提现把未使用 SUI 回收到钱包。</span></div></div>
    </div>
  </div>
</section>

<section class="slide" data-layout="S02" data-animate="progression">
  <div class="canvas-card">
    <div class="chrome-min">
      <div class="l">Roadmap</div>
      <div class="r">11 / 12</div>
    </div>
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">After the current milestone</div>
      <h2 class="h-xl-zh" style="font-size:min(5.4vw,9.4vh)">
        <span class="en">From receipt guard to delegated guard.</span>
        <span class="zh">从凭证式守卫，到委托式守卫。</span>
      </h2>
    </div>
    <div class="timeline-v" data-anim="timeline">
      <div class="tl-node accent"><div class="dot"></div><div class="yr">V1</div><div class="multi">Live</div><div class="desc"><span class="en">Wallet flow, GuardPolicy, guarded ask, DeepBook indexer proof, cancel, unused-SUI recovery.</span><span class="zh">钱包流程、GuardPolicy、受控卖单、DeepBook indexer 证明、取消订单、未使用 SUI 回收。</span></div></div>
      <div class="tl-node"><div class="dot"></div><div class="yr">V2</div><div class="multi">Ops</div><div class="desc"><span class="en">Persist policies, show pool snapshots, fetch open orders, add role-based operator workflow.</span><span class="zh">持久化策略、展示池子快照、拉取开放订单、加入角色化操作流程。</span></div></div>
      <div class="tl-node"><div class="dot"></div><div class="yr">V3</div><div class="multi">Guard</div><div class="desc"><span class="en">Move from receipt-only audit to delegated enforcement and automated cancel/rebalance rules.</span><span class="zh">从仅凭证审计，走向委托执行和自动取消/再平衡规则。</span></div></div>
    </div>
    <div data-anim="kpis" class="kpi-row-4 nav-safe-bottom-tight">
      <div class="kpi-cell"><div class="lbl">Now</div><div class="nb">21<span class="unit">subs</span></div><div class="note">generated submission set</div></div>
      <div class="kpi-cell"><div class="lbl">Chain</div><div class="nb">Sui</div><div class="note">Move 2024</div></div>
      <div class="kpi-cell"><div class="lbl">Venue</div><div class="nb">DeepBook</div><div class="note">V3 SDK + indexer</div></div>
      <div class="kpi-cell"><div class="lbl">Mode</div><div class="nb">Guarded</div><div class="note">policy-bound execution</div></div>
    </div>
  </div>
</section>

<section class="slide split" data-layout="S10" data-animate="split-statement">
  <div class="canvas-card">
    <div class="split-half">
      <div class="half b-accent" style="padding:5.6vh 3.6vw 4.4vh;justify-content:space-between;position:relative;overflow:hidden">
        <canvas class="ascii-bg" aria-hidden="true"></canvas>
        <div class="chrome-min" style="margin-bottom:0;position:relative;z-index:1">
          <div class="l">12 / 12</div>
          <div class="r">CLOSING</div>
        </div>
        <div data-anim="manifesto" style="display:flex;flex-direction:column;gap:2vh;position:relative;z-index:1">
          <div class="t-meta" style="color:rgba(255,255,255,.78);letter-spacing:.22em;margin-bottom:1.6vh">TAKEAWAY</div>
          <h2 style="font-family:var(--sans),var(--sans-zh);font-size:min(7.2vw,12.6vh);line-height:.94;letter-spacing:-.025em;font-weight:200;color:#fff">
            <span class="en">Guard the<br/>maker.</span><span class="zh">守住<br/>Maker。</span>
          </h2>
          <div class="t-body" style="color:rgba(255,255,255,.82);max-width:36ch"><span class="en">The pitch is not “AI predicts price.” The pitch is “an LP action can carry a deterministic risk reason.”</span><span class="zh">重点不是“AI 预测价格”，而是“LP 的一次动作可以带着确定性的风险理由”。</span></div>
        </div>
        <div data-anim="signature" style="display:flex;justify-content:space-between;align-items:end;border-top:1px solid rgba(255,255,255,.22);padding-top:2vh;position:relative;z-index:1">
          <div class="t-meta" style="color:rgba(255,255,255,.62)">DeepBook Risk Console</div>
          <div class="t-meta" style="color:rgba(255,255,255,.62)">2026</div>
        </div>
      </div>
      <div class="half" style="padding:5.6vh 3.6vw 4.4vh;justify-content:space-between">
        <div class="chrome-min">
          <div class="l">Three lines</div>
          <div class="r">For the room</div>
        </div>
        <div data-anim="rules" style="display:flex;flex-direction:column;gap:0">
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2vw;align-items:start;padding:2.6vh 0;border-top:1px solid var(--border-subtle)">
            <div style="font-family:var(--sans);font-weight:200;font-size:min(4.4vw,7.8vh);line-height:.9;color:var(--text-primary)">01</div>
            <div><h3 class="t-h-prod"><span class="en">It is a real DeepBook order.</span><span class="zh">这是真实 DeepBook 订单。</span></h3><p class="t-body-sm"><span class="en">The indexer can show order id, status, price, and quantity.</span><span class="zh">Indexer 能展示订单 ID、状态、价格和数量。</span></p></div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2vw;align-items:start;padding:2.6vh 0;border-top:1px solid var(--border-subtle)">
            <div style="font-family:var(--sans);font-weight:200;font-size:min(4.4vw,7.8vh);line-height:.9;color:var(--text-primary)">02</div>
            <div><h3 class="t-h-prod"><span class="en">It is wallet-native.</span><span class="zh">它是钱包原生流程。</span></h3><p class="t-body-sm"><span class="en">The app builds; the user signs; the chain verifies.</span><span class="zh">应用构建，用户签名，链上验证。</span></p></div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2vw;align-items:start;padding:2.6vh 0;border-top:1px solid var(--border-subtle);border-bottom:2px solid var(--accent)">
            <div style="font-family:var(--sans);font-weight:200;font-size:min(4.4vw,7.8vh);line-height:.9;color:var(--accent)">03</div>
            <div><h3 class="t-h-prod" style="color:var(--accent)"><span class="en">It makes risk auditable.</span><span class="zh">它让风险可审计。</span></h3><p class="t-body-sm"><span class="en">Every guarded order can leave a policy-bound receipt.</span><span class="zh">每个受控订单都能留下绑定策略的凭证。</span></p></div>
          </div>
        </div>
        <div data-anim="foot" class="t-meta" style="color:var(--text-helper);text-align:right">END · L TO SWITCH LANGUAGE</div>
      </div>
    </div>
  </div>
</section>
`;

html = html.replace('<title>[必填] 替换为 PPT 标题 · Deck Title</title>', '<title>DeepBook Risk Console · Bilingual Pitch Deck</title>\n<link rel="icon" href="data:,">');
html = html.replace('</style>', `${extraCss}\n</style>`);
html = html.replace('<div id="hint">← → 翻页 · B 静态 · ESC 索引</div>', `<div id="hint">← → 翻页 · B 静态 · ESC 索引</div>\n${langButton}`);
html = html.replace(/<!-- SLIDES_HERE[\s\S]*?<\/div>\n\n<div id="nav"><\/div>/, `${slides}\n</div>\n\n<div id="nav"></div>`);
html = html.replace('</body>', `${langJs}\n</body>`);

fs.writeFileSync(file, html);
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
fs.copyFileSync(motionSrc, path.join(root, 'assets', 'motion.min.js'));
