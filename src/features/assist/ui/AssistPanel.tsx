import { Lightbulb, ScanLine, ArrowUpRight, Sparkles } from "lucide-react";
import type { Session } from "../../../shared/types";
import { HINT_LIMIT } from "../model/hints";
import { RuleGuide } from "./RuleGuide";
export function AssistPanel({
  session,
  onHint,
  onCheck,
}: {
  session: Session;
  onHint: () => void;
  onCheck: () => void;
}) {
  const stats = {
    filled: session.marks.filter((m) => m === "filled").length,
    crossed: session.marks.filter((m) => m === "cross").length,
  };
  return (
    <section className="panel helper">
      <span className="eyebrow">A GENTLE NUDGE</span>
      <h2>换个思路看看</h2>
      <p className="muted">卡住也没关系，给灵感一点空间。</p>
      <button
        className="hint-button"
        onClick={onHint}
        disabled={session.hints >= HINT_LIMIT || session.solved}
      >
        <Lightbulb size={18} />
        <span>给我一点提示</span>
        <span className="hint-count">
          {HINT_LIMIT - session.hints} / {HINT_LIMIT}
        </span>
      </button>
      <p className="hint-note">
        每次只揭示一格，扣费确认会保留在听读队列，重复朗读不会再扣额度。
      </p>
      <button
        className="check-button"
        onClick={onCheck}
        disabled={session.solved}
      >
        <ScanLine size={17} />
        检查当前标记
        <ArrowUpRight size={16} />
      </button>
      <p className="hint-note">检查结果会列出问题位置，可逐项回到对应格子。</p>
      <div className="assist-stats">
        <div>
          <strong>{stats.filled}</strong>
          <span>已填涂</span>
        </div>
        <div>
          <strong>{stats.crossed}</strong>
          <span>已标空</span>
        </div>
        <div>
          <strong>{session.hints}</strong>
          <span>已用提示</span>
        </div>
      </div>
      <RuleGuide />
    </section>
  );
}
export function QuietCard() {
  return (
    <section className="quiet-card" aria-hidden="true">
      <Sparkles size={21} />
      <span>小小的专注时刻</span>
      <p>
        世界很大，
        <br />
        先解开眼前这一格。
      </p>
      <div className="quiet-grid">
        {[0, 1, 0, 1, 1, 1, 0, 1, 0].map((v, i) => (
          <span className={v ? "ink" : ""} key={i} />
        ))}
      </div>
    </section>
  );
}
