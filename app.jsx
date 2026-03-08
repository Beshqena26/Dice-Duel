const { useState, useEffect, useCallback, useMemo } = React;

/* ── Constants ── */
const MULTIPLIERS = { 1: 10.48, 2: 2.19, 3: 1.25 };
const BONUS_MULTIPLIERS = { 2: 5.8, 3: 34.9 };
const INSURANCE_RATE = 0.05;
const INSURANCE_RETURN = 0.25;
const INITIAL_BALANCE = 9137.76;

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

/* ── Helpers ── */
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function roundCents(value) {
  return Math.round(value * 100) / 100;
}

/* ── Dice Face Component ── */
function DiceFace({ value, color }) {
  const dots = DOT_POSITIONS[value] || [];
  const dotColor = color === "red" ? "white" : "#12101e";

  return (
    <div className={`die die--${color === "red" ? "red" : "white"}`}>
      <svg viewBox="0 0 100 100" style={{ width: "70%", height: "70%" }}>
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={9} fill={dotColor} opacity={0.9} />
        ))}
      </svg>
    </div>
  );
}

/* ── Animated Die Component ── */
function AnimatedDie({ finalValue, color, delay = 0, rolling }) {
  const [displayValue, setDisplayValue] = useState(finalValue || 1);

  useEffect(() => {
    if (!rolling) {
      if (finalValue) setDisplayValue(finalValue);
      return;
    }
    const interval = setInterval(() => setDisplayValue(rollDie()), 50);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (finalValue) setDisplayValue(finalValue);
    }, 1100 + delay);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [rolling, finalValue, delay]);

  return (
    <div
      className={rolling ? "rolling" : ""}
      style={{ transition: rolling ? "none" : "transform .3s cubic-bezier(.34,1.56,.64,1)" }}
    >
      <DiceFace value={displayValue} color={color} />
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
        <div style={{ padding: "var(--gap) var(--pad)", marginBottom: "var(--gap)", borderRadius: 10, background: "var(--elev)", border: "1px solid var(--brd)", fontSize: "var(--fs-body)", color: "var(--tx2)", lineHeight: 1.7 }}>
          Roll your dice against the dealer's <strong style={{ color: "var(--tx)" }}>2 dice</strong>. If your total is higher, <strong style={{ color: "var(--green)" }}>you win</strong>.
        </div>

        {/* Multipliers table */}
        <div style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: "var(--tx)", marginBottom: "var(--gap)" }}>Payouts</div>
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--brd)", marginBottom: "var(--gap)" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", padding: "6px var(--pad)", background: "var(--elev)", borderBottom: "1px solid var(--brd)" }}>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--tx3)", letterSpacing: 1 }}>BET</span>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textAlign: "center" }}>MULT</span>
            <span style={{ fontSize: "var(--fs-small)", fontWeight: 700, color: "var(--tx3)", letterSpacing: 1, textAlign: "right" }}>RTP</span>
          </div>
          {[
            { label: "1 Die", mult: "10.48x", rtp: "97.0%", color: "var(--red)" },
            { label: "2 Dice", mult: "2.19x", rtp: "97.2%", color: "var(--amber)" },
            { label: "3 Dice", mult: "1.25x", rtp: "97.3%", color: "var(--green)" },
            { label: "Bonus 2D", mult: "5.8x", rtp: "96.7%", color: "var(--purple)" },
            { label: "Bonus 3D", mult: "34.9x", rtp: "96.9%", color: "var(--amber)" },
          ].map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", padding: "7px var(--pad)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)", borderBottom: i < 4 ? "1px solid rgba(255,255,255,.03)" : "none" }}>
              <span style={{ fontSize: "var(--fs-body)", fontWeight: 700, color: row.color }}>{row.label}</span>
              <span className="mono" style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: "var(--tx)", textAlign: "center" }}>{row.mult}</span>
              <span className="mono" style={{ fontSize: "var(--fs-small)", fontWeight: 600, color: "var(--green)", textAlign: "right" }}>{row.rtp}</span>
            </div>
          ))}
        </div>

        {/* Tie */}
        <div style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: "var(--amber)", marginBottom: "var(--gap)" }}>Tie</div>
        <div style={{ padding: "var(--gap) var(--pad)", marginBottom: "var(--gap)", borderRadius: 10, background: "var(--elev)", border: "1px solid var(--brd)", fontSize: "var(--fs-body)", color: "var(--tx2)", lineHeight: 1.6 }}>
          If your total equals the dealer's, <strong style={{ color: "var(--red)" }}>you lose your bet</strong>. Use <strong style={{ color: "var(--amber)" }}>Insurance</strong> (5% of bet) to get <strong style={{ color: "var(--green)" }}>25% back</strong> on ties.
        </div>

        {/* Bonus */}
        <div style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: "var(--purple)", marginBottom: "var(--gap)" }}>Bonus Bet</div>
        <div style={{ padding: "var(--gap) var(--pad)", borderRadius: 10, background: "var(--elev)", border: "1px solid var(--brd)", fontSize: "var(--fs-body)", color: "var(--tx2)", lineHeight: 1.6 }}>
          Available with 2+ dice. All your dice must land on the <strong style={{ color: "var(--tx)" }}>same number</strong> to win. Max bonus is half your bet.
        </div>

        <button
          className="btn"
          onClick={onClose}
          style={{ width: "100%", padding: "var(--gap)", borderRadius: "var(--radius)", fontSize: "var(--fs-body)", fontWeight: 800, color: "white", background: "linear-gradient(135deg,#7C3AED,var(--purple))", boxShadow: "0 4px 16px rgba(124,58,237,.3)", marginTop: "var(--pad)" }}
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
          style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px solid var(--brd2)", background: "transparent", color: "var(--tx3)", fontSize: "var(--fs-small)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ?
        </button>
      </div>
      <div className="card" style={{ padding: "6px var(--pad)", display: "flex", alignItems: "center", gap: "var(--gap)", borderRadius: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,var(--blue),#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-small)", fontWeight: 900, flexShrink: 0 }}>$</div>
        <div>
          <div style={{ fontSize: "var(--fs-small)", color: "var(--tx3)", fontWeight: 600, lineHeight: 1 }}>Balance</div>
          <div className="mono" style={{ fontSize: "var(--fs-balance)", fontWeight: 800, lineHeight: 1.3, whiteSpace: "nowrap" }}>
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
    <div className="card" style={{ padding: "var(--pad)", textAlign: "center", height: "var(--card-h)", display: "flex", flexDirection: "column", overflow: "hidden", borderTop: borderColor, animation: glowAnimation, background: bgGradient }}>
      <div className="label" style={{ color: labelColor, marginBottom: 6, flexShrink: 0 }}>{labelText}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--gap)" }}>
        {dealerDice[0] !== null ? (
          <>
            <AnimatedDie finalValue={dealerDice[0]} color="red" delay={0} rolling={rolling} />
            <AnimatedDie finalValue={dealerDice[1]} color="red" delay={100} rolling={rolling} />
          </>
        ) : (
          <>
            <div className="die-placeholder" style={{ borderColor: "var(--red)" }} />
            <div className="die-placeholder" style={{ borderColor: "var(--red)" }} />
          </>
        )}
        {isResult && (
          <span className="mono" style={{ fontSize: "var(--fs-dice-num)", fontWeight: 800, color: "var(--tx2)", animation: "slide-up .2s ease", marginLeft: 6 }}>
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
    <div className="card" style={{ padding: "var(--pad)", textAlign: "center", height: "var(--card-h)", display: "flex", flexDirection: "column", overflow: "hidden", borderTop: borderColor, animation: glowAnimation, background: bgGradient }}>
      <div className="label" style={{ color: labelColor, marginBottom: 6, flexShrink: 0 }}>
        {isResult && result === "win" ? "YOU WIN!" : "YOU"}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {[0, 1, 2].map((i) => {
          if (i >= diceCount) return null;
          const val = playerDice[i];
          return val !== null
            ? <AnimatedDie key={i} finalValue={val} color="white" delay={i * 70} rolling={rolling} />
            : <div key={i} className="die-placeholder" style={{ borderColor: "rgba(255,255,255,.12)" }} />;
        })}
        {isResult && (
          <div style={{ marginLeft: 8, animation: "pop-in .35s cubic-bezier(.34,1.56,.64,1)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
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
              onClick={() => onSelect(option.count)}
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
    if (prev <= 1) return 1;
    if (prev <= 5) return prev - 1;
    if (prev <= 20) return prev - 5;
    if (prev <= 100) return prev - 10;
    if (prev <= 500) return prev - 50;
    return prev - 100;
  }

  function increaseBet(prev) {
    const max = Math.floor(balance);
    if (prev < 5) return Math.min(prev + 1, max);
    if (prev < 20) return Math.min(prev + 5, max);
    if (prev < 100) return Math.min(prev + 10, max);
    if (prev < 500) return Math.min(prev + 50, max);
    return Math.min(prev + 100, max);
  }

  return (
    <section className="card" style={{ padding: "var(--pad)", marginBottom: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="label" style={{ textAlign: "left" }}>BET AMOUNT</span>
        <span className="mono" style={{ fontSize: "var(--fs-small)", color: "var(--tx3)", fontWeight: 600 }}>
          Total: <strong style={{ color: "var(--tx)" }}>${totalBet.toFixed(2)}</strong>
        </span>
      </div>

      {/* Bet input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: "var(--gap)" }}>
        <button className="btn control-btn" onClick={() => setBet((p) => decreaseBet(p))}>−</button>
        <input
          className="mono"
          type="number"
          min="1"
          max={Math.floor(balance)}
          value={bet}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= 0) setBet(Math.min(v, Math.floor(balance)));
            if (e.target.value === "") setBet(0);
          }}
          onBlur={() => { if (bet < 1) setBet(1); }}
          style={{ flex: 1, height: "var(--btn-h)", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--brd)", color: "var(--tx)", textAlign: "center", fontSize: "var(--fs-body)", fontWeight: 800, outline: "none", WebkitAppearance: "none", MozAppearance: "textfield", padding: "0 8px" }}
        />
        <button className="btn control-btn" onClick={() => setBet((p) => increaseBet(p))}>+</button>
        <button className="btn control-btn" onClick={() => setBet((p) => Math.max(1, Math.round(p / 2)))} style={{ background: "linear-gradient(135deg,var(--orange),#ea580c)", border: "none" }}>÷</button>
        <button className="btn control-btn" onClick={() => setBet((p) => Math.min(Math.round(p * 2), Math.floor(balance)))} style={{ background: "linear-gradient(135deg,var(--blue),#2563eb)", border: "none", fontSize: "var(--fs-body)", fontWeight: 800 }}>2x</button>
      </div>

      {/* Insurance & Bonus toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
        <button
          className="btn special-btn"
          onClick={() => setInsurance(!insurance)}
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
            <button className="btn control-btn" onClick={() => setBonusAmount((p) => Math.max(1, p - 1))}>−</button>
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
            <button className="btn control-btn" onClick={() => setBonusAmount((p) => Math.min(maxBonus, p + 1))}>+</button>
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
  const [dealerDice, setDealerDice] = useState([null, null]);
  const [playerDice, setPlayerDice] = useState([null]);
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

  // Reset player dice placeholders when dice count changes
  useEffect(() => {
    if (phase === "idle") setPlayerDice(Array(diceCount).fill(null));
  }, [diceCount, phase]);

  const handleRoll = useCallback(() => {
    if (balance < totalBet || balance <= 0) {
      setShowAlert(true);
      return;
    }
    if (!canRoll) return;

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

      if (payout > 0) setBalance((b) => roundCents(b + payout));

      // Reset after showing result
      setTimeout(() => {
        setPhase("idle");
        setResult(null);
        setDealerDice([null, null]);
        setPlayerDice(Array(diceCount).fill(null));
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
            if (phase === "idle") setPlayerDice(Array(count).fill(null));
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
