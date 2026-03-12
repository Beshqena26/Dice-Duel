const { useState, useEffect, useCallback, useMemo } = React;

/* ── Constants ── */
const MULTIPLIERS = { 1: 10.48, 2: 2.19, 3: 1.25 };
const BONUS_MULTIPLIERS = { 2: 5.8, 3: 34.9 };
const INSURANCE_RATE = 0.05;
const INSURANCE_RETURN = 0.25;
const INITIAL_BALANCE = 9137.76;
const MIN_BET = 0.10;
const MAX_BET = 100;

const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 22], [73, 22], [27, 50], [73, 50], [27, 78], [73, 78]],
};

const DICE_OPTIONS = [
  { count: 1, label: "High Risk", multiplier: "10.48x", color: "var(--red)" },
  { count: 2, label: "Medium", multiplier: "2.19x", color: "var(--amber)" },
  { count: 3, label: "Low Risk", multiplier: "1.25x", color: "var(--green)" },
];

/* ── Sound Effects (Web Audio API) ── */
const SFX = (() => {
  let ctx, masterGain;
  let _volume = parseFloat(localStorage.getItem("sfx_vol") ?? "0.7");
  let _muted = localStorage.getItem("sfx_muted") === "true";

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = _muted ? 0 : _volume;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function getDest() {
    getCtx();
    return masterGain;
  }

  function playTone(freq, duration, type = "sine", vol = 0.15) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(getDest());
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  return {
    click() {
      playTone(800, 0.06, "square", 0.08);
    },
    roll() {
      const c = getCtx();
      const t = c.currentTime;
      const dur = 1.2;

      // Layer 1: Shaking rattle — rapid dice-in-hand sound
      const rattleLen = c.sampleRate * dur;
      const rattleBuf = c.createBuffer(1, rattleLen, c.sampleRate);
      const rattleData = rattleBuf.getChannelData(0);
      for (let i = 0; i < rattleLen; i++) {
        // Pulse bursts at ~30Hz to simulate dice clacking in hand
        const burst = Math.sin(i / (c.sampleRate / 30)) > 0.3 ? 1 : 0.1;
        rattleData[i] = (Math.random() * 2 - 1) * burst;
      }
      const rattleSrc = c.createBufferSource();
      rattleSrc.buffer = rattleBuf;
      const rattleBand = c.createBiquadFilter();
      rattleBand.type = "bandpass";
      rattleBand.frequency.value = 3500;
      rattleBand.Q.value = 1.8;
      const rattleGain = c.createGain();
      rattleGain.gain.setValueAtTime(0.25, t);
      rattleGain.gain.setValueAtTime(0.3, t + 0.2);
      rattleGain.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.7);
      rattleGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      rattleSrc.connect(rattleBand).connect(rattleGain).connect(getDest());
      rattleSrc.start(t);
      rattleSrc.stop(t + dur);

      // Layer 2: Hard surface bounces — dice hitting table
      const bounces = [0.55, 0.68, 0.78, 0.86, 0.92, 0.96, 0.99];
      bounces.forEach((offset, idx) => {
        const vol = 0.4 * Math.pow(0.7, idx);
        const freq = 1800 + Math.random() * 2500;

        // Sharp click (plastic on hard surface)
        const clickBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.015), c.sampleRate);
        const clickData = clickBuf.getChannelData(0);
        for (let i = 0; i < clickData.length; i++) {
          clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.003));
        }
        const clickSrc = c.createBufferSource();
        clickSrc.buffer = clickBuf;
        const clickHP = c.createBiquadFilter();
        clickHP.type = "highpass";
        clickHP.frequency.value = freq;
        const clickGain = c.createGain();
        clickGain.gain.value = vol;
        clickSrc.connect(clickHP).connect(clickGain).connect(getDest());
        clickSrc.start(t + offset);
        clickSrc.stop(t + offset + 0.015);

        // Thud body (low resonance from impact)
        const osc = c.createOscillator();
        const thudGain = c.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(200 + Math.random() * 100, t + offset);
        osc.frequency.exponentialRampToValueAtTime(60, t + offset + 0.06);
        thudGain.gain.setValueAtTime(vol * 0.6, t + offset);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.07);
        osc.connect(thudGain).connect(getDest());
        osc.start(t + offset);
        osc.stop(t + offset + 0.07);
      });

      // Layer 3: Final settle — dice wobble and stop
      const wobbles = [1.02, 1.06, 1.09, 1.11];
      wobbles.forEach((offset, idx) => {
        const vol = 0.15 * Math.pow(0.5, idx);
        const wobBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.008), c.sampleRate);
        const wobData = wobBuf.getChannelData(0);
        for (let i = 0; i < wobData.length; i++) {
          wobData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.002));
        }
        const wobSrc = c.createBufferSource();
        wobSrc.buffer = wobBuf;
        const wobGain = c.createGain();
        wobGain.gain.value = vol;
        const wobHP = c.createBiquadFilter();
        wobHP.type = "highpass";
        wobHP.frequency.value = 4000;
        wobSrc.connect(wobHP).connect(wobGain).connect(getDest());
        wobSrc.start(t + offset);
        wobSrc.stop(t + offset + 0.008);
      });
    },
    win() {
      playTone(523, 0.15, "sine", 0.12);
      setTimeout(() => playTone(659, 0.15, "sine", 0.12), 100);
      setTimeout(() => playTone(784, 0.25, "sine", 0.15), 200);
    },
    lose() {
      playTone(350, 0.2, "sawtooth", 0.08);
      setTimeout(() => playTone(280, 0.35, "sawtooth", 0.06), 150);
    },
    tie() {
      playTone(440, 0.15, "triangle", 0.1);
      setTimeout(() => playTone(440, 0.2, "triangle", 0.08), 160);
    },
    setVolume(v) {
      _volume = v;
      localStorage.setItem("sfx_vol", v);
      if (masterGain && !_muted) masterGain.gain.value = v;
    },
    getVolume() { return _volume; },
    setMuted(m) {
      _muted = m;
      localStorage.setItem("sfx_muted", m);
      if (masterGain) masterGain.gain.value = m ? 0 : _volume;
    },
    isMuted() { return _muted; },
  };
})();

/* ── Helpers ── */
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function roundCents(value) {
  return Math.round(value * 100) / 100;
}

/* ── Single face with pips ── */
function DieFacePanel({ value, pipCls }) {
  const dots = DOT_POSITIONS[value] || [];
  return (
    <>
      <div className="die-pips">
        {dots.map(([x, y], i) => (
          <div key={i} className={`die-pip ${pipCls}`} style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
      </div>
    </>
  );
}

/* ── Static 3D die (shown when idle) ── */
function DiceFaceStatic({ value, color }) {
  const isRed = color === "red";
  const pipCls = isRed ? "die-pip--light" : "die-pip--dark";
  const c = isRed ? "red" : "white";

  return (
    <div className={`die die--${c}`}>
      <div className={`die-edge die-edge--bottom die-edge--bottom-${c}`} />
      <div className={`die-edge die-edge--right die-edge--right-${c}`} />
      <div className="die-main">
        <div className="die-shine" />
        <div className="die-pips">
          {(DOT_POSITIONS[value] || []).map(([x, y], i) => (
            <div key={i} className={`die-pip ${pipCls}`} style={{ left: `${x}%`, top: `${y}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Rolling 3D cube (shown during roll) ── */
function DiceFaceRolling({ value, color }) {
  const isRed = color === "red";
  const cls = isRed ? "red" : "white";
  const pipCls = isRed ? "die-pip--light" : "die-pip--dark";

  // Generate all 6 face values
  const faces = [1, 2, 3, 4, 5, 6];

  return (
    <div className="die-scene">
      <div className={`die-cube die-cube--${cls} die-cube--rolling`}>
        <div className={`die-cube-face die-cube-front die-cube-face--${cls}`}>
          <DieFacePanel value={faces[0]} pipCls={pipCls} />
        </div>
        <div className={`die-cube-face die-cube-back die-cube-face--${cls}`}>
          <DieFacePanel value={faces[1]} pipCls={pipCls} />
        </div>
        <div className={`die-cube-face die-cube-right die-cube-face--${cls}`}>
          <DieFacePanel value={faces[2]} pipCls={pipCls} />
        </div>
        <div className={`die-cube-face die-cube-left die-cube-face--${cls}`}>
          <DieFacePanel value={faces[3]} pipCls={pipCls} />
        </div>
        <div className={`die-cube-face die-cube-top die-cube-face--${cls}`}>
          <DieFacePanel value={faces[4]} pipCls={pipCls} />
        </div>
        <div className={`die-cube-face die-cube-bottom die-cube-face--${cls}`}>
          <DieFacePanel value={faces[5]} pipCls={pipCls} />
        </div>
      </div>
    </div>
  );
}

/* ── Animated Die Component ── */
function AnimatedDie({ finalValue, color, delay = 0, rolling }) {
  const [displayValue, setDisplayValue] = useState(finalValue || 1);
  const [showCube, setShowCube] = useState(false);

  useEffect(() => {
    if (!rolling) {
      if (finalValue) setDisplayValue(finalValue);
      setShowCube(false);
      return;
    }
    setShowCube(true);
    const interval = setInterval(() => setDisplayValue(rollDie()), 50);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setShowCube(false);
      if (finalValue) setDisplayValue(finalValue);
    }, 1100 + delay);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [rolling, finalValue, delay]);

  if (showCube) {
    return <DiceFaceRolling value={displayValue} color={color} />;
  }

  return (
    <div style={{ animation: rolling ? "none" : "pop-in .3s cubic-bezier(.34,1.56,.64,1)" }}>
      <DiceFaceStatic value={displayValue} color={color} />
    </div>
  );
}

/* ── Game Info Modal ── */
function GameInfoModal({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ textAlign: "left", maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--pad)" }}>
          <h2 style={{ fontSize: "var(--fs-title)", fontWeight: 900 }}>How to Play</h2>
          <button
            className="btn"
            onClick={onClose}
            style={{ width: "var(--btn-h)", height: "var(--btn-h)", borderRadius: 8, background: "var(--elev)", color: "var(--tx2)", fontSize: "var(--fs-body)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {/* How it works */}
        <div style={{ padding: "var(--gap) var(--pad)", marginBottom: "var(--gap)", borderRadius: 10, background: "var(--elev)", border: "1px solid var(--brd)", fontSize: "var(--fs-body)", color: "var(--tx2)", lineHeight: 1.5 }}>
          Roll your dice against the dealer's <strong style={{ color: "var(--tx)" }}>2 dice</strong>. Higher total <strong style={{ color: "var(--green)" }}>wins</strong>. Tie = <strong style={{ color: "var(--red)" }}>loss</strong> (use <strong style={{ color: "var(--amber)" }}>Insurance</strong> 5% to get 25% back).
        </div>

        {/* Combined table */}
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--brd)", marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", padding: "5px var(--pad)", background: "var(--elev)", borderBottom: "1px solid var(--brd)" }}>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--tx3)", letterSpacing: 1 }}>PAYOUTS</span>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textAlign: "center" }}>MULT</span>
          </div>
          {[
            { label: "1 Die", mult: "10.48x", color: "var(--red)" },
            { label: "2 Dice", mult: "2.19x", color: "var(--amber)" },
            { label: "3 Dice", mult: "1.25x", color: "var(--green)" },
          ].map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px", padding: "5px var(--pad)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
              <span style={{ fontSize: "var(--fs-body)", fontWeight: 700, color: row.color }}>{row.label}</span>
              <span className="mono" style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: "var(--tx)", textAlign: "center" }}>{row.mult}</span>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", padding: "5px var(--pad)", background: "var(--elev)", borderBottom: "1px solid var(--brd)", borderTop: "1px solid var(--brd)" }}>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--purple)", letterSpacing: 1 }}>BONUS</span>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textAlign: "center" }}>MULT</span>
          </div>
          {[
            { label: "Bonus 2D", mult: "5.8x", color: "var(--purple)" },
            { label: "Bonus 3D", mult: "34.9x", color: "var(--amber)" },
          ].map((row, i) => (
            <div key={"b" + i} style={{ display: "grid", gridTemplateColumns: "1fr 60px", padding: "5px var(--pad)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)" }}>
              <span style={{ fontSize: "var(--fs-body)", fontWeight: 700, color: row.color }}>{row.label}</span>
              <span className="mono" style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: "var(--tx)", textAlign: "center" }}>{row.mult}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "var(--gap) var(--pad)", marginBottom: "var(--gap)", borderRadius: 10, background: "var(--elev)", border: "1px solid var(--brd)", fontSize: "var(--fs-body)", color: "var(--tx2)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--purple)" }}>Bonus:</strong> 2+ dice, all same number wins. Max bonus = half your bet.
        </div>

        {/* Limits */}
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--brd)", marginBottom: "var(--gap)" }}>
          <div style={{ padding: "5px var(--pad)", background: "var(--elev)", borderBottom: "1px solid var(--brd)" }}>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--tx3)", letterSpacing: 1 }}>LIMITS</span>
          </div>
          {[
            { label: "Min Bet", value: "$" + MIN_BET.toFixed(2), color: "var(--tx2)" },
            { label: "Max Bet", value: "$" + MAX_BET.toFixed(2), color: "var(--tx2)" },
            { label: "Max Win (1 Die)", value: "$" + roundCents(MAX_BET * MULTIPLIERS[1]).toFixed(2), color: "var(--green)" },
            { label: "Max Win (2D + Bonus)", value: "$" + roundCents(MAX_BET * MULTIPLIERS[2] + (MAX_BET / 2) * BONUS_MULTIPLIERS[2]).toFixed(2), color: "var(--green)" },
            { label: "Max Win (3D + Bonus)", value: "$" + roundCents(MAX_BET * MULTIPLIERS[3] + (MAX_BET / 2) * BONUS_MULTIPLIERS[3]).toFixed(2), color: "var(--green)" },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px var(--pad)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)", borderBottom: i < 4 ? "1px solid rgba(255,255,255,.03)" : "none" }}>
              <span style={{ fontSize: "var(--fs-body)", fontWeight: 600, color: "var(--tx3)" }}>{row.label}</span>
              <span className="mono" style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>

        <button
          className="btn"
          onClick={onClose}
          style={{ width: "100%", height: 48, borderRadius: "var(--radius)", fontSize: "var(--fs-body)", fontWeight: 800, color: "white", background: "linear-gradient(135deg,#7C3AED,var(--purple))", boxShadow: "0 4px 16px rgba(124,58,237,.3)", marginTop: "var(--pad)" }}
        >
          Got It
        </button>
      </div>
    </div>
  );
}

/* ── Insufficient Balance Modal ── */
function InsufficientBalanceModal({ balance, totalBet, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: "float 2s ease-in-out infinite" }}>💰</div>
        <h2 style={{ fontSize: "var(--fs-title)", fontWeight: 900, color: "var(--red)", marginBottom: 8 }}>Insufficient Balance</h2>
        <p style={{ fontSize: "var(--fs-body)", color: "var(--tx2)", lineHeight: 1.6, marginBottom: 22 }}>
          Balance: <strong className="mono" style={{ color: "var(--tx)" }}>${balance.toFixed(2)}</strong><br />
          Bet required: <strong className="mono" style={{ color: "var(--tx)" }}>${totalBet.toFixed(2)}</strong><br />
          <span style={{ display: "inline-block", marginTop: 6 }}>Lower your bet to continue.</span>
        </p>
        <button
          className="btn"
          onClick={onClose}
          style={{ padding: "var(--pad) 36px", borderRadius: "var(--radius)", fontSize: "var(--fs-body)", fontWeight: 800, color: "white", background: "linear-gradient(135deg,#7C3AED,var(--purple))", boxShadow: "0 4px 16px rgba(124,58,237,.3)" }}
        >
          Got It
        </button>
      </div>
    </div>
  );
}

/* ── Sound Control Component ── */
function SoundControl() {
  const [muted, setMuted] = useState(SFX.isMuted());

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    SFX.setMuted(next);
    if (!next) SFX.click();
  };

  return (
    <button
      className="btn"
      onClick={toggleMute}
      style={{
        width: 32, height: 32, borderRadius: 8,
        background: muted ? "rgba(255,71,87,.15)" : "var(--elev)",
        border: "1px solid " + (muted ? "rgba(255,71,87,.25)" : "var(--brd)"),
        color: "var(--tx2)", fontSize: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: muted ? 0.5 : 1,
      }}
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

/* ── Header Component ── */
function Header({ balance, onShowInfo }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--pad) 0", gap: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--gap)" }}>
        <div>
          <h1 style={{ fontSize: "var(--fs-title)", fontWeight: 900, letterSpacing: 1.5, lineHeight: 1 }}>DICE DUEL</h1>
          <p style={{ fontSize: "var(--fs-small)", color: "var(--tx3)", fontWeight: 500, marginTop: 2 }}>Fast-Paced Casino Game</p>
        </div>
        <button
          className="btn"
          onClick={onShowInfo}
          aria-label="How to play"
          style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "linear-gradient(135deg, var(--purple), var(--purple-d))", color: "#fff", fontSize: "var(--fs-small)", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(168,85,247,0.3)" }}
        >
          ?
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--gap)" }}>
        <SoundControl />
        <div className="card" style={{ padding: "6px var(--pad)", display: "flex", alignItems: "center", gap: "var(--gap)", borderRadius: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,var(--blue),#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-small)", fontWeight: 900, flexShrink: 0 }}>$</div>
          <div>
            <div style={{ fontSize: "var(--fs-small)", color: "var(--tx3)", fontWeight: 600, lineHeight: 1 }}>Balance</div>
            <div className="mono" style={{ fontSize: "var(--fs-balance)", fontWeight: 800, lineHeight: 1.3, whiteSpace: "nowrap" }}>
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Dealer Card Component ── */
function DealerCard({ phase, result, dealerDice, rolling }) {
  const isResult = phase === "result" && dealerDice[0] !== null;
  const dealerTotal = dealerDice[0] !== null ? dealerDice[0] + dealerDice[1] : 0;

  const borderColor = isResult
    ? result === "win" ? "2px solid rgba(255,71,87,.4)"
    : result === "tie" ? "2px solid rgba(245,158,11,.4)"
    : "2px solid rgba(46,213,115,.5)"
    : "2px solid transparent";

  const glowAnimation = isResult
    ? result === "win" ? "lose-glow 1.5s ease infinite"
    : result === "tie" ? "tie-glow 1.5s ease infinite"
    : "win-glow 1.5s ease infinite"
    : "none";

  const bgGradient = isResult
    ? result === "win" ? "linear-gradient(180deg,rgba(255,71,87,.04),var(--card))"
    : result === "tie" ? "linear-gradient(180deg,rgba(245,158,11,.04),var(--card))"
    : "linear-gradient(180deg,rgba(46,213,115,.06),var(--card))"
    : "var(--card)";

  const labelColor = isResult
    ? result === "win" ? "var(--red)" : result === "tie" ? "var(--amber)" : "var(--green)"
    : "var(--red)";

  const labelText = isResult && result === "lose" ? "DEALER WINS"
    : isResult && result === "tie" ? "TIE"
    : "DEALER";

  return (
    <div className="card" style={{ padding: "var(--pad)", textAlign: "center", height: "var(--card-h)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTop: borderColor, animation: glowAnimation, background: bgGradient, transition: "border-top 0.3s ease, background 0.3s ease" }}>
      <div className="label" style={{ color: labelColor, marginBottom: 6, flexShrink: 0 }}>{labelText}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--gap)", padding: "4px 0" }}>
        <AnimatedDie finalValue={dealerDice[0]} color="red" delay={0} rolling={rolling} />
        <AnimatedDie finalValue={dealerDice[1]} color="red" delay={100} rolling={rolling} />
      </div>
      <div style={{ height: "var(--fs-dice-num)", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isResult && (
          <span className="mono" style={{ fontSize: "var(--fs-dice-num)", fontWeight: 800, color: "var(--tx2)", animation: "slide-up .2s ease" }}>
            {dealerTotal}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Player Card Component ── */
function PlayerCard({ phase, result, playerDice, diceCount, rolling, hasInsurance, winAmount, totalBet, latestHistory }) {
  const isResult = phase === "result" && result;
  const playerTotal = playerDice.slice(0, diceCount).reduce((a, b) => a + b, 0);

  const resultColor = result === "win" ? "var(--green)"
    : result === "tie" && hasInsurance && winAmount > 0 ? "var(--amber)"
    : "var(--red)";

  const borderColor = isResult
    ? result === "win" ? "2px solid rgba(46,213,115,.5)"
    : result === "tie" ? "2px solid rgba(245,158,11,.4)"
    : "2px solid rgba(255,71,87,.4)"
    : "2px solid transparent";

  const glowAnimation = isResult
    ? result === "win" ? "win-glow 1.5s ease infinite"
    : result === "lose" ? "lose-glow 1.5s ease infinite"
    : "tie-glow 1.5s ease infinite"
    : "none";

  const bgGradient = isResult
    ? result === "win" ? "linear-gradient(180deg,rgba(46,213,115,.06),var(--card))"
    : result === "lose" ? "linear-gradient(180deg,rgba(255,71,87,.04),var(--card))"
    : "linear-gradient(180deg,rgba(245,158,11,.04),var(--card))"
    : "var(--card)";

  const labelColor = isResult && result === "win" ? "var(--green)" : "var(--tx3)";

  return (
    <div className="card" style={{ padding: "var(--pad)", textAlign: "center", height: "var(--card-h)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTop: borderColor, animation: glowAnimation, background: bgGradient, transition: "border-top 0.3s ease, background 0.3s ease" }}>
      <div className="label" style={{ color: labelColor, marginBottom: 6, flexShrink: 0 }}>
        {isResult && result === "win" ? "YOU WIN!" : "YOU"}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "4px 0" }}>
        {[0, 1, 2].map((i) => {
          if (i >= diceCount) return null;
          const val = playerDice[i];
          return val !== null
            ? <AnimatedDie key={i} finalValue={val} color="white" delay={i * 70} rolling={rolling} />
            : <div key={i} className="die-placeholder" style={{ borderColor: "rgba(255,255,255,.12)" }} />;
        })}
      </div>
      <div style={{ minHeight: 24, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isResult && (
          <div style={{ animation: "pop-in .35s cubic-bezier(.34,1.56,.64,1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: "var(--fs-dice-num)", fontWeight: 800, color: "var(--tx2)" }}>{playerTotal}</span>
            <span style={{ fontSize: "var(--fs-body)", fontWeight: 900, letterSpacing: 1, color: resultColor, animation: result === "win" ? "win-pulse 1.5s ease infinite" : "none" }}>
              {result === "win" ? "WIN!" : result === "tie" ? "TIE" : "LOSE"}
            </span>
            {result === "win" && winAmount > 0 && (
              <span className="mono" style={{ fontSize: "var(--fs-body)", fontWeight: 700, color: "var(--green)" }}>+${winAmount.toFixed(2)}</span>
            )}
            {result === "tie" && hasInsurance && winAmount > 0 && (
              <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--amber)", background: "rgba(245,158,11,.12)", borderRadius: 5, padding: "2px 6px" }}>🛡 ${winAmount.toFixed(2)} back</span>
            )}
            {result === "tie" && !hasInsurance && (
              <span className="mono" style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--red)" }}>-${totalBet.toFixed(2)}</span>
            )}
            {result === "lose" && (
              <span className="mono" style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--red)" }}>-${totalBet.toFixed(2)}</span>
            )}
            {latestHistory && latestHistory.bonusWin && (
              <span style={{ fontSize: "var(--fs-small)", fontWeight: 800, color: "var(--purple)", background: "rgba(168,85,247,.15)", border: "1px solid rgba(168,85,247,.25)", borderRadius: 6, padding: "2px 7px" }}>BONUS 🎯</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Dice Count Selector ── */
function DiceCountSelector({ diceCount, onSelect, disabled }) {
  return (
    <section className="card" style={{ padding: "var(--pad)", marginBottom: "var(--gap)" }}>
      <div className="label" style={{ marginBottom: "var(--gap)" }}>DICE COUNT & MULTIPLIER</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--gap)" }}>
        {DICE_OPTIONS.map((option) => {
          const selected = diceCount === option.count;
          return (
            <button
              key={option.count}
              className="btn dice-select-btn"
              onClick={() => { SFX.click(); onSelect(option.count); }}
              disabled={disabled}
              style={{
                padding: "var(--gap) 4px", borderRadius: 10, color: "var(--tx)", textAlign: "center",
                border: "2px solid " + (selected ? option.color : "transparent"),
                background: selected ? option.color : "var(--bg)",
                opacity: disabled ? 0.45 : 1,
                transition: "all .2s",
              }}
            >
              <div style={{ fontSize: "var(--fs-dice-count)", fontWeight: 900, lineHeight: 1.1 }}>{option.count}</div>
              <div style={{ fontSize: "var(--fs-small)", color: selected ? "rgba(255,255,255,.7)" : "var(--tx3)", fontWeight: 600, marginTop: 1 }}>{option.label}</div>
              <div className="mono" style={{ fontSize: "var(--fs-mult)", fontWeight: 800, color: selected ? "white" : "var(--tx)", marginTop: 2 }}>{option.multiplier}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ── Bet Controls Component ── */
function BetControls({ bet, setBet, totalBet, insurance, setInsurance, bonusBet, setBonusBet, bonusAmount, setBonusAmount, bonusAvailable, maxBonus, effectiveBonusAmount, disabled, balance }) {
  function decreaseBet(prev) {
    if (prev <= 0.5) return MIN_BET;
    if (prev <= 1) return Math.max(MIN_BET, prev - 0.10);
    if (prev <= 5) return prev - 1;
    if (prev <= 20) return prev - 5;
    if (prev <= 100) return prev - 10;
    return prev - 100;
  }

  function increaseBet(prev) {
    const max = Math.min(MAX_BET, balance);
    if (prev < 1) return Math.min(prev + 0.10, max);
    if (prev < 5) return Math.min(prev + 1, max);
    if (prev < 20) return Math.min(prev + 5, max);
    if (prev < 100) return Math.min(prev + 10, max);
    return Math.min(prev + 100, max);
  }

  return (
    <section className="card" style={{ padding: "var(--pad)", marginBottom: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="label" style={{ textAlign: "left" }}>BET AMOUNT <span style={{ fontWeight: 600, color: "var(--tx3)", letterSpacing: 0 }}>(${MIN_BET.toFixed(2)} – ${MAX_BET})</span></span>
        <span className="mono" style={{ fontSize: "var(--fs-small)", color: "var(--tx3)", fontWeight: 600 }}>
          Total: <strong style={{ color: "var(--tx)" }}>${totalBet.toFixed(2)}</strong>
        </span>
      </div>

      {/* Bet input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: "var(--gap)" }}>
        <button className="btn control-btn" onClick={() => { SFX.click(); setBet((p) => decreaseBet(p)); }}>−</button>
        <input
          className="mono"
          type="number"
          min={MIN_BET}
          max={Math.min(MAX_BET, balance)}
          step="0.10"
          value={bet}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= 0) setBet(Math.min(v, MAX_BET, balance));
            if (e.target.value === "") setBet(0);
          }}
          onBlur={() => { if (bet < MIN_BET) setBet(MIN_BET); }}
          style={{ flex: 1, height: "var(--btn-h)", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--brd)", color: "var(--tx)", textAlign: "center", fontSize: "var(--fs-body)", fontWeight: 800, outline: "none", WebkitAppearance: "none", MozAppearance: "textfield", padding: "0 8px" }}
        />
        <button className="btn control-btn" onClick={() => { SFX.click(); setBet((p) => increaseBet(p)); }}>+</button>
        <button className="btn control-btn" onClick={() => { SFX.click(); setBet((p) => Math.max(MIN_BET, roundCents(p / 2))); }} style={{ background: "linear-gradient(135deg,var(--orange),#ea580c)", border: "none" }}>÷</button>
        <button className="btn control-btn" onClick={() => { SFX.click(); setBet((p) => Math.min(roundCents(p * 2), MAX_BET, balance)); }} style={{ background: "linear-gradient(135deg,var(--blue),#2563eb)", border: "none", fontSize: "var(--fs-body)", fontWeight: 800 }}>2x</button>
      </div>

      {/* Insurance & Bonus toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
        <button
          className="btn special-btn"
          onClick={() => { SFX.click(); setInsurance(!insurance); }}
          disabled={disabled}
          style={{
            padding: "var(--gap) 6px", borderRadius: 10, color: "white", textAlign: "center",
            border: "2px solid " + (insurance ? "var(--amber)" : "transparent"),
            background: insurance ? "linear-gradient(135deg,var(--amber-d),#6b4a00)" : "var(--bg)",
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <span style={{ fontSize: "var(--fs-body)" }}>🛡</span>
            <span style={{ fontSize: "var(--fs-body)", fontWeight: 700 }}>Insure Tie</span>
            <span style={{ fontSize: "var(--fs-small)", color: insurance ? "rgba(255,255,255,.6)" : "var(--tx3)", fontWeight: 600 }}>+25%</span>
          </div>
        </button>
        <button
          className="btn special-btn"
          onClick={() => {
            if (bonusAvailable) {
              SFX.click();
              setBonusBet(!bonusBet);
              if (!bonusBet) setBonusAmount(Math.max(1, Math.floor(bet / 2)));
            }
          }}
          disabled={disabled || !bonusAvailable}
          style={{
            padding: "var(--gap) 6px", borderRadius: 10, color: "white", textAlign: "center",
            border: "2px solid " + (bonusBet && bonusAvailable ? "var(--purple)" : "transparent"),
            background: bonusBet && bonusAvailable ? "linear-gradient(135deg,var(--purple-d),#5b21b6)" : "var(--bg)",
            opacity: disabled || !bonusAvailable ? 0.35 : 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <span style={{ fontSize: "var(--fs-body)" }}>✦</span>
            <span style={{ fontSize: "var(--fs-body)", fontWeight: 700 }}>Bonus Bet</span>
            <span className="mono" style={{ fontSize: "var(--fs-small)", color: bonusBet && bonusAvailable ? "rgba(255,255,255,.6)" : "var(--tx3)", fontWeight: 600 }}>
              {bonusAvailable ? "$" + effectiveBonusAmount : "2+ Dice"}
            </span>
          </div>
        </button>
      </div>

      {/* Bonus amount input */}
      {bonusBet && bonusAvailable && (
        <div style={{ marginTop: "var(--gap)", animation: "slide-up .2s ease" }}>
          <div className="label" style={{ marginBottom: 4, textAlign: "left" }}>BONUS BET (Max ${maxBonus} = half of ${bet})</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn control-btn" onClick={() => { SFX.click(); setBonusAmount((p) => Math.max(1, p - 1)); }}>−</button>
            <input
              className="mono"
              type="number"
              min="1"
              max={maxBonus}
              value={effectiveBonusAmount}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 0) setBonusAmount(Math.min(v, maxBonus));
                if (e.target.value === "") setBonusAmount(0);
              }}
              onBlur={() => { if (bonusAmount < 1) setBonusAmount(1); }}
              style={{ flex: 1, height: "var(--btn-h)", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--brd)", color: "var(--tx)", textAlign: "center", fontSize: "var(--fs-body)", fontWeight: 800, outline: "none", WebkitAppearance: "none", MozAppearance: "textfield", padding: "0 6px" }}
            />
            <button className="btn control-btn" onClick={() => { SFX.click(); setBonusAmount((p) => Math.min(maxBonus, p + 1)); }}>+</button>
          </div>
        </div>
      )}

    </section>
  );
}

/* ══════════════════════════════════════════
   ══ MAIN GAME COMPONENT ══
   ══════════════════════════════════════════ */
function Game() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(10);
  const [diceCount, setDiceCount] = useState(1);
  const [insurance, setInsurance] = useState(false);
  const [bonusBet, setBonusBet] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(5);
  const [rolling, setRolling] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [dealerDice, setDealerDice] = useState([1, 1]);
  const [playerDice, setPlayerDice] = useState([1]);
  const [result, setResult] = useState(null);
  const [winAmount, setWinAmount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const maxBonus = Math.max(1, Math.floor(bet / 2));
  const effectiveBonusAmount = Math.min(bonusAmount, maxBonus);
  const bonusAvailable = diceCount >= 2;

  const totalBet = useMemo(() => {
    let total = bet;
    if (insurance) total += bet * INSURANCE_RATE;
    if (bonusBet && bonusAvailable) total += effectiveBonusAmount;
    return roundCents(total);
  }, [bet, insurance, bonusBet, bonusAvailable, effectiveBonusAmount]);

  const canRoll = balance >= totalBet && totalBet > 0 && phase === "idle";

  // Disable bonus when switching to 1 die
  useEffect(() => {
    if (diceCount === 1 && bonusBet) setBonusBet(false);
  }, [diceCount]);

  // Reset all dice to 1 when dice count changes
  useEffect(() => {
    if (phase === "idle") {
      setPlayerDice(Array(diceCount).fill(1));
      setDealerDice([1, 1]);
    }
  }, [diceCount]);

  const handleRoll = useCallback(() => {
    if (balance < totalBet || balance <= 0) {
      setShowAlert(true);
      return;
    }
    if (!canRoll) return;

    SFX.roll();
    setRolling(true);
    setPhase("rolling");
    setResult(null);
    setWinAmount(0);
    setBalance((b) => roundCents(b - totalBet));

    const newDealerDice = [rollDie(), rollDie()];
    const newPlayerDice = Array.from({ length: diceCount }, () => rollDie());
    setDealerDice(newDealerDice);
    setPlayerDice(newPlayerDice);

    setTimeout(() => {
      setRolling(false);
      setPhase("result");

      const dealerTotal = newDealerDice[0] + newDealerDice[1];
      const playerTotal = newPlayerDice.reduce((a, b) => a + b, 0);

      let outcome, payout = 0;

      // Main bet result (tie = loss)
      if (playerTotal > dealerTotal) {
        outcome = "win";
        payout = bet * MULTIPLIERS[diceCount];
      } else if (playerTotal === dealerTotal) {
        outcome = "tie";
        payout = insurance ? roundCents(bet * INSURANCE_RETURN) : 0;
      } else {
        outcome = "lose";
        payout = 0;
      }

      // Bonus bet (all dice same number, 2+ dice required)
      const currentMaxBonus = Math.max(1, Math.floor(bet / 2));
      const currentBonusAmount = Math.min(bonusAmount, currentMaxBonus);
      if (bonusBet && diceCount >= 2 && newPlayerDice.length >= 2 && newPlayerDice.every((d) => d === newPlayerDice[0])) {
        payout += currentBonusAmount * BONUS_MULTIPLIERS[diceCount];
      }

      payout = roundCents(payout);
      setResult(outcome);
      setWinAmount(payout);

      // Play result sound
      if (outcome === "win") SFX.win();
      else if (outcome === "tie") SFX.tie();
      else SFX.lose();

      if (payout > 0) setBalance((b) => roundCents(b + payout));

      // Reset after showing result (keep dice visible)
      setTimeout(() => {
        setPhase("idle");
        setResult(null);
        setBalance((b) => {
          if (b <= 0) setTimeout(() => setShowAlert(true), 200);
          return b;
        });
      }, 2000);
    }, 1400);
  }, [canRoll, totalBet, diceCount, bet, insurance, bonusBet, bonusAmount, bonusAvailable, balance]);

  // Spacebar to roll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "idle") handleRoll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleRoll]);

  return (
    <>
      <Header balance={balance} onShowInfo={() => setShowInfo(true)} />

      {/* Game Arena */}
      <div className="arena">
        <DealerCard phase={phase} result={result} dealerDice={dealerDice} rolling={rolling} />
        <PlayerCard
          phase={phase}
          result={result}
          playerDice={playerDice}
          diceCount={diceCount}
          rolling={rolling}
          hasInsurance={insurance}
          winAmount={winAmount}
          totalBet={totalBet}
          latestHistory={null}
        />

        {/* Roll Button */}
        <button
          className="btn roll-btn"
          onClick={handleRoll}
          disabled={phase !== "idle"}
          style={{
            width: "100%",
            padding: "var(--pad) 0",
            borderRadius: "var(--radius)",
            fontSize: "var(--fs-roll)",
            fontWeight: 900,
            letterSpacing: 3,
            color: "white",
            background: phase === "idle"
              ? "linear-gradient(135deg,var(--green-d),var(--green),var(--green-d))"
              : "linear-gradient(135deg,#252040,#1a1630)",
            backgroundSize: phase === "idle" ? "200% auto" : "100% auto",
            animation: phase === "idle" && canRoll ? "shimmer 2.5s linear infinite" : "none",
            boxShadow: phase === "idle" && canRoll ? "0 6px 28px rgba(46,213,115,.25),inset 0 1px 0 rgba(255,255,255,.15)" : "none",
            opacity: phase !== "idle" ? 0.35 : 1,
          }}
        >
          {phase === "idle" ? "🎲  ROLL" : "ROLLING..."}
        </button>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <DiceCountSelector
          diceCount={diceCount}
          onSelect={(count) => {
            setDiceCount(count);
          }}
          disabled={phase !== "idle"}
        />
        <BetControls
          bet={bet}
          setBet={setBet}
          totalBet={totalBet}
          insurance={insurance}
          setInsurance={setInsurance}
          bonusBet={bonusBet}
          setBonusBet={setBonusBet}
          bonusAmount={bonusAmount}
          setBonusAmount={setBonusAmount}
          bonusAvailable={bonusAvailable}
          maxBonus={maxBonus}
          effectiveBonusAmount={effectiveBonusAmount}
          disabled={phase !== "idle"}
          balance={balance}
        />
      </div>

      {/* Modals */}
      {showInfo && <GameInfoModal onClose={() => setShowInfo(false)} />}
      {showAlert && <InsufficientBalanceModal balance={balance} totalBet={totalBet} onClose={() => setShowAlert(false)} />}

      <div style={{ height: 20 }} />
    </>
  );
}

ReactDOM.render(React.createElement(Game), document.getElementById("root"));
