import { useEffect, useRef, useState } from "react";
import { Clock3, CheckCircle2, MousePointer2, Keyboard } from "lucide-react";
import { clueSet } from "../../../shared/clues";
import type {
  FocusRequest,
  Puzzle,
  Session,
  Tool,
} from "../../../shared/types";
import { completion } from "../../../shared/document";
import { cellLabel, clueText } from "../../a11y";
import { lineStatuses } from "../lib/lineStatus";
import { clampFocus, isNavKey, moveFocus } from "../model/nav";
import { BoardToolbar } from "./BoardToolbar";
import { Clue } from "./Clue";
export function BoardPanel({
  puzzle,
  session,
  initialFocus,
  focusRequest,
  onFocusChange,
  onFocusRequestDone,
  onMark,
  onUndo,
  onReset,
  onAnnounce,
}: {
  puzzle: Puzzle;
  session: Session;
  initialFocus?: number;
  focusRequest: FocusRequest | null;
  onFocusChange: (index: number) => void;
  onFocusRequestDone: () => void;
  onMark: (i: number, t: Tool) => void;
  onUndo: () => void;
  onReset: () => void;
  onAnnounce: (text: string) => void;
}) {
  const [tool, setTool] = useState<Tool>("filled");
  const [focus, setFocus] = useState(() =>
    clampFocus(puzzle.size, initialFocus ?? 0),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const clues = clueSet(puzzle.size, puzzle.solution);
  const statuses = lineStatuses(puzzle, session.marks);
  const helpId = `board-help-${puzzle.id}`;
  // 切题后恢复该题的有效焦点（越界时收敛到棋盘内）。
  const savedFocus = useRef(initialFocus);
  savedFocus.current = initialFocus;
  useEffect(() => {
    setFocus(clampFocus(puzzle.size, savedFocus.current ?? 0));
  }, [puzzle.id, puzzle.size]);
  // 听读队列的"回到格子"：焦点来自结构化坐标，不解析任何界面文字。
  useEffect(() => {
    if (!focusRequest || focusRequest.puzzleId !== puzzle.id) return;
    setFocus(clampFocus(puzzle.size, focusRequest.index));
    gridRef.current?.focus();
    onFocusRequestDone();
  }, [focusRequest, puzzle.id, puzzle.size, onFocusRequestDone]);
  const updateFocus = (index: number) => {
    setFocus(index);
    onFocusChange(index);
  };
  // 鼠标与听读共用同一焦点模型：点击格子同时把键盘焦点收回棋盘。
  const activateCell = (index: number) => {
    updateFocus(index);
    gridRef.current?.focus({ preventScroll: true });
  };
  const quickMark = (mark: Tool) => {
    if (session.solved) return;
    onMark(focus, session.marks[focus] === mark ? "unknown" : mark);
  };
  const readLine = (which: "row" | "col") => {
    const row = Math.floor(focus / puzzle.size);
    const col = focus % puzzle.size;
    const line = which === "row" ? row : puzzle.size + col;
    const label = which === "row" ? `第 ${row + 1} 行` : `第 ${col + 1} 列`;
    onAnnounce(`${label}，${clueText(clues[line], statuses[line])}`);
  };
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (isNavKey(key)) {
      e.preventDefault();
      const next = moveFocus(puzzle.size, focus, key);
      if (next !== focus) {
        updateFocus(next);
        onAnnounce(cellLabel(puzzle.size, session.marks, next));
      } else onAnnounce(`已到边缘，${cellLabel(puzzle.size, session.marks, focus)}`);
      return;
    }
    const lower = key.toLowerCase();
    if (lower === "r" || lower === "c") {
      e.preventDefault();
      readLine(lower === "r" ? "row" : "col");
      return;
    }
    if (session.solved) return;
    if (key === " " || key === "Enter") {
      e.preventDefault();
      quickMark(tool);
    } else if (lower === "f") {
      e.preventDefault();
      quickMark("filled");
    } else if (lower === "x") {
      e.preventDefault();
      quickMark("cross");
    } else if (lower === "e" || key === "Backspace" || key === "Delete") {
      e.preventDefault();
      quickMark("unknown");
    } else if (lower === "u") {
      e.preventDefault();
      onUndo();
    }
  };
  return (
    <section className="board-panel panel">
      <div className="board-heading">
        <div>
          <span className="eyebrow">
            A LITTLE DISCOVERY · {puzzle.collection}
          </span>
          <h1>
            {session.solved ? puzzle.title : "一格一格，拼出惊喜"}
            <span className="level-tag">{puzzle.level}</span>
          </h1>
        </div>
        <div
          className="timer"
          aria-label={`已用时 ${Math.floor(session.seconds / 60)} 分 ${session.seconds % 60} 秒`}
        >
          <Clock3 size={15} aria-hidden="true" />
          <span aria-hidden="true">
            {Math.floor(session.seconds / 60)
              .toString()
              .padStart(2, "0")}
            :{(session.seconds % 60).toString().padStart(2, "0")}
          </span>
        </div>
      </div>
      <BoardToolbar
        tool={tool}
        onTool={setTool}
        onUndo={onUndo}
        onReset={onReset}
        canUndo={session.moves.length > 0}
        disabled={session.solved}
      />
      <div className="board-stage">
        <div
          ref={gridRef}
          className="puzzle-grid"
          role="grid"
          tabIndex={0}
          aria-label={`棋盘，${puzzle.size} 行 ${puzzle.size} 列`}
          aria-describedby={helpId}
          aria-disabled={session.solved}
          aria-activedescendant={`cell-${puzzle.id}-${focus}`}
          aria-rowcount={puzzle.size}
          aria-colcount={puzzle.size}
          onKeyDown={onGridKeyDown}
          style={{
            gridTemplateColumns: `64px repeat(${puzzle.size}, var(--cell))`,
            gridTemplateRows: `64px repeat(${puzzle.size}, var(--cell))`,
          }}
        >
          <div className="grid-row" role="row">
            <div className="grid-corner" aria-hidden="true">
              <span>
                {puzzle.size}×{puzzle.size}
              </span>
              <small>NONOGRAM</small>
            </div>
            {clues.slice(puzzle.size).map((v, i) => (
              <Clue
                key={"c" + i}
                values={v}
                done={statuses[puzzle.size + i]}
                vertical
                role="columnheader"
              />
            ))}
          </div>
          {Array.from({ length: puzzle.size }, (_, row) => (
            <div className="grid-row" role="row" key={row}>
              <Clue
                values={clues[row]}
                done={statuses[row]}
                role="rowheader"
              />
              {Array.from({ length: puzzle.size }, (_, col) => {
                const i = row * puzzle.size + col;
                const mark = session.marks[i];
                return (
                  <span
                    key={col}
                    id={`cell-${puzzle.id}-${i}`}
                    role="gridcell"
                    aria-selected={i === focus}
                    aria-label={cellLabel(puzzle.size, session.marks, i)}
                    className={`cell ${mark} ${i === focus ? "active" : ""} ${(col + 1) % 5 === 0 ? "major-right" : ""} ${(row + 1) % 5 === 0 ? "major-bottom" : ""}`}
                    onClick={() => {
                      activateCell(i);
                      if (!session.solved)
                        onMark(i, session.marks[i] === tool ? "unknown" : tool);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      activateCell(i);
                      if (!session.solved)
                        onMark(i, mark === "cross" ? "unknown" : "cross");
                    }}
                  >
                    <span aria-hidden="true">
                      {mark === "cross" ? "×" : ""}
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="visually-hidden" id={helpId}>
        方向键按行列移动，F 填涂，X 标空，E 擦除，空格或回车应用当前工具，R
        朗读行线索，C 朗读列线索，U 撤销。
      </p>
      <div className="board-footer">
        <span>
          <MousePointer2 size={14} aria-hidden="true" /> 左键填涂 · 右键标空
        </span>
        <span>
          <Keyboard size={14} aria-hidden="true" /> 方向键移动 · F 填涂 · X 标空
          · R/C 读线索
        </span>
        <span>
          <span className="status-dot" aria-hidden="true" />{" "}
          {statuses.filter(Boolean).length} / {puzzle.size * 2} 条线已满足
        </span>
      </div>
      <div className="progress-caption">
        <span>
          {session.solved ? (
            <>
              <CheckCircle2 size={15} aria-hidden="true" />
              图案已揭晓
            </>
          ) : (
            "每一小步，都离答案更近"
          )}
        </span>
        <strong>{completion(session)}% 已标记</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={completion(session)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="标记进度"
      >
        <span style={{ width: completion(session) + "%" }} />
      </div>
    </section>
  );
}
