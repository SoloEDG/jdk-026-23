import type {
  GameAction,
  GameDocument,
  Mark,
  Puzzle,
  Session,
} from "../../../shared/types";
import { transition } from "../../../app/reducer";
import { nextHint, HINT_LIMIT, inspectIssues } from "../../assist";
import {
  cellLabel,
  markName,
  puzzleAlias,
  revealSummary,
} from "./labels";
import type { Notice, NoticeDraft } from "./notices";
let noticeSeq = 0;
function makeNotice(
  draft: NoticeDraft,
  puzzleId: string,
  sessionRev: number,
): Notice {
  return {
    ...draft,
    id: `n${Date.now().toString(36)}-${noticeSeq++}`,
    puzzleId,
    sessionRev,
    createdAt: Date.now(),
  };
}
function changedMarkIndex(before: Session, after: Session): number {
  if (before.marks === after.marks) return -1;
  return after.marks.findIndex((mark, i) => mark !== before.marks[i]);
}
/**
 * 准备一次提示请求：返回可提交的动作，或在无法提交时给出反馈草稿。
 * 提示格子在提交时由 reducer 复核，扣费与落子要么同时生效、要么都不生效。
 */
export function prepareHint(
  document: GameDocument,
  puzzles: Puzzle[],
  requestId: string,
): { action: GameAction; notice?: never } | { action?: never; notice: Notice } {
  const puzzle = puzzles.find((p) => p.id === document.activeId)!;
  const session = document.sessions[puzzle.id];
  const hint = nextHint(puzzle, session);
  if (hint) return { action: { type: "hint", ...hint, requestId } };
  const text = session.solved
    ? "本题已完成，不需要提示。"
    : session.hints >= HINT_LIMIT
      ? "本题提示额度已用完，试试检查当前标记。"
      : "当前标记都已正确，继续你的推理吧。";
  return {
    notice: makeNotice(
      { kind: "noop", priority: "info", text },
      puzzle.id,
      session.rev,
    ),
  };
}
/**
 * 统一提交协议：所有解题操作（鼠标、键盘、快捷键、模态确认）都经此提交。
 * 公告从提交前后的状态差分派生——播报的内容必然已经落盘生效，
 * 未生效的操作也必然不会产生"已扣费"之类的确认。
 */
export function commitTransition(
  document: GameDocument,
  action: GameAction,
  puzzles: Puzzle[],
): { document: GameDocument; notices: Notice[] } {
  const before = document.sessions[document.activeId];
  const after = transition(document, action, puzzles);
  const puzzle = puzzles.find((p) => p.id === after.activeId)!;
  const session = after.sessions[puzzle.id];
  const notices: Notice[] = [];
  const push = (draft: NoticeDraft, puzzleId = puzzle.id, rev = session.rev) =>
    notices.push(makeNotice(draft, puzzleId, rev));
  if (after === document) {
    if (action.type === "hint" && before && !before.solved) {
      const ref = action.requestId
        ? before.hintRefs.find((r) => r.id === action.requestId)
        : undefined;
      if (ref)
        push(
          {
            kind: "hint-duplicate",
            priority: "info",
            text: "这条提示已在棋盘上生效，不会重复扣除额度。",
            cellIndex: ref.index,
          },
          puzzle.id,
          before.rev,
        );
    }
    if (action.type === "undo" && before && !before.moves.length)
      push(
        { kind: "noop", priority: "info", text: "没有可以撤销的步骤。" },
        puzzle.id,
        before.rev,
      );
    return { document: after, notices };
  }
  if (action.type === "open" && after.activeId !== document.activeId) {
    const name = session.solved
      ? `「${puzzle.title}」`
      : puzzleAlias(puzzles, puzzle);
    push({
      kind: "open",
      priority: "info",
      text: `已打开 ${name}，${puzzle.size}×${puzzle.size}。`,
    });
    return { document: after, notices };
  }
  if (!before) return { document: after, notices };
  if (action.type === "reset") {
    push({
      kind: "reset",
      priority: "info",
      text: "已重新开始：本题标记、计时与提示额度已重置。",
    });
  } else if (session.hints > before.hints && action.type === "hint") {
    push({
      kind: "hint",
      priority: "important",
      text: `提示已确认，剩余 ${HINT_LIMIT - session.hints} 次：第 ${Math.floor(action.index / puzzle.size) + 1} 行、第 ${(action.index % puzzle.size) + 1} 列已揭示为「${markName(action.mark as Mark)}」。`,
      cellIndex: action.index,
    });
  } else if (session.checks > before.checks) {
    const issues = inspectIssues(puzzle, session);
    push({
      kind: "check",
      priority: "important",
      text: issues.length
        ? `检查完成：发现 ${issues.length} 处标记需要重新考虑，可在听读队列中逐项回到对应格子。`
        : "检查完成：已填写的标记都与答案一致，继续你的发现吧。",
      issues: issues.length ? issues : undefined,
    });
  } else {
    const index = changedMarkIndex(before, session);
    if (action.type === "undo")
      push({
        kind: "undo",
        priority: "info",
        text: `已撤销一步：${index >= 0 ? cellLabel(puzzle.size, session.marks, index) : "棋盘已恢复"}。`,
        cellIndex: index >= 0 ? index : undefined,
      });
    else if (index >= 0)
      push({
        kind: "mark",
        priority: "info",
        text: `${cellLabel(puzzle.size, session.marks, index)}。`,
        cellIndex: index,
      });
  }
  if (session.solved && !before.solved)
    push({
      kind: "solved",
      priority: "important",
      text: revealSummary(puzzle, session),
    });
  return { document: after, notices };
}
