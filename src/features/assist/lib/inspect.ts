import type { Mark, Puzzle, Session } from "../../../shared/types";
export interface Issue {
  index: number;
  mark: Mark;
  reason: string;
}
export function inspect(
  puzzle: Puzzle,
  session: Session,
): { filled: number; crossed: number; errors: number } {
  return {
    filled: session.marks.filter((m) => m === "filled").length,
    crossed: session.marks.filter((m) => m === "cross").length,
    errors: session.marks.filter(
      (m, i) =>
        (m === "filled" && !puzzle.solution[i]) ||
        (m === "cross" && !!puzzle.solution[i]),
    ).length,
  };
}
/** 检查的结构化结果：问题格子的索引与理由，供听读队列导航回棋盘。 */
export function inspectIssues(puzzle: Puzzle, session: Session): Issue[] {
  const issues: Issue[] = [];
  session.marks.forEach((mark, index) => {
    if (mark === "filled" && !puzzle.solution[index])
      issues.push({ index, mark, reason: "填涂与答案不符" });
    if (mark === "cross" && !!puzzle.solution[index])
      issues.push({ index, mark, reason: "标空与答案不符" });
  });
  return issues;
}
