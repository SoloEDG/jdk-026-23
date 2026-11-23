import type { GameDocument, Mark, Puzzle, Session } from "../../../shared/types";
import { completion } from "../../../shared/document";
import { formatTime } from "../../journal/lib/summary";
/** 题库中的稳定编号（图案 01、02……），未揭晓前代替标题使用。 */
export function puzzleCode(puzzles: Puzzle[], id: string): string {
  const index = puzzles.findIndex((p) => p.id === id);
  return String(index < 0 ? 0 : index + 1).padStart(2, "0");
}
/** 未揭晓前不泄露标题与图案内容的称呼。 */
export function puzzleAlias(puzzles: Puzzle[], puzzle: Puzzle): string {
  return `图案 ${puzzleCode(puzzles, puzzle.id)}`;
}
export function markName(mark: Mark): string {
  return mark === "filled" ? "已填涂" : mark === "cross" ? "已标空" : "未知";
}
/** 单格语义：坐标由结构化数据生成，界面文字不作为坐标来源。 */
export function cellLabel(size: number, marks: Mark[], index: number): string {
  const row = Math.floor(index / size) + 1;
  const col = (index % size) + 1;
  return `第 ${row} 行第 ${col} 列，${markName(marks[index] ?? "unknown")}`;
}
export function clueText(values: number[], done: boolean): string {
  return `线索 ${values.join("、")}${done ? "，已满足" : ""}`;
}
/** 题库卡片摘要：未完成的题不读出标题，只给编号、尺寸、系列与进度。 */
export function catalogLabel(
  puzzles: Puzzle[],
  puzzle: Puzzle,
  session?: Session,
): string {
  const base = `${puzzle.size}×${puzzle.size}，${puzzle.collection}，难度${puzzle.level}`;
  if (session?.solved) return `「${puzzle.title}」，${base}，已完成`;
  const progress = session ? completion(session) : 0;
  const state = progress ? `已标记 ${progress}%，按回车继续` : "未开始";
  return `${puzzleAlias(puzzles, puzzle)}，${base}，${state}`;
}
/** 存档恢复摘要：只报告数量与当前进度，不泄露未揭晓作品的答案。 */
export function restoreSummary(
  puzzles: Puzzle[],
  document: GameDocument,
): string {
  const sessions = puzzles
    .map((p) => document.sessions[p.id])
    .filter((s): s is Session => !!s);
  const solved = sessions.filter((s) => s.solved).length;
  const started = sessions.filter((s) => !s.solved && completion(s) > 0).length;
  const active = puzzles.find((p) => p.id === document.activeId) ?? puzzles[0];
  const activeSession = document.sessions[active.id];
  const parts = [`已恢复本地存档：${started} 幅进行中，${solved} 幅已完成`];
  if (activeSession)
    parts.push(
      activeSession.solved
        ? `当前「${active.title}」已完成`
        : `当前继续 ${puzzleAlias(puzzles, active)}，已标记 ${completion(activeSession)}%`,
    );
  return `${parts.join("。")}。`;
}
/** 作品揭晓摘要：标题是完成的奖励，但摘要不包含任何图案数据。 */
export function revealSummary(puzzle: Puzzle, session: Session): string {
  return `作品揭晓：「${puzzle.title}」已收入展柜。用时 ${formatTime(session.seconds)}，使用提示 ${session.hints} 次。`;
}
