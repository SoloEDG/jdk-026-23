import type { GameDocument } from "../../../shared/types";
import type { Issue } from "../../assist/lib/inspect";
export type NoticePriority = "nav" | "info" | "important";
export type NoticeKind =
  | "mark"
  | "undo"
  | "hint"
  | "hint-duplicate"
  | "check"
  | "save"
  | "solved"
  | "open"
  | "reset"
  | "restore"
  | "noop";
/** 提交产物的草稿：由 commitTransition 从状态差分派生，不含运行期字段。 */
export interface NoticeDraft {
  kind: NoticeKind;
  priority: NoticePriority;
  text: string;
  cellIndex?: number;
  issues?: Issue[];
}
/** 听读队列条目：坐标只来自结构化字段，不允许从文字解析。 */
export interface Notice extends NoticeDraft {
  id: string;
  puzzleId: string;
  /** 来源版本：产生该消息时的棋盘数据版本 */
  sessionRev: number;
  createdAt: number;
  acknowledged?: boolean;
}
/** 过期判定：棋盘数据版本已前进（或题目不存在）即过期。过期可回听，不可应用。 */
export function isExpired(
  notice: Pick<Notice, "puzzleId" | "sessionRev" | "kind">,
  document: GameDocument,
): boolean {
  if (notice.kind === "save" || notice.kind === "restore") return false;
  const session = document.sessions[notice.puzzleId];
  return !session || session.rev !== notice.sessionRev;
}
const KEY = "gejian.notices.v1";
const PRIORITIES: NoticePriority[] = ["nav", "info", "important"];
const KINDS: NoticeKind[] = [
  "mark",
  "undo",
  "hint",
  "hint-duplicate",
  "check",
  "save",
  "solved",
  "open",
  "reset",
  "restore",
  "noop",
];
function validIssue(value: unknown): value is Issue {
  const issue = value as Issue;
  return (
    !!issue &&
    Number.isInteger(issue.index) &&
    ["filled", "cross", "unknown"].includes(issue.mark) &&
    typeof issue.reason === "string"
  );
}
function validNotice(value: unknown): value is Notice {
  const notice = value as Notice;
  return (
    !!notice &&
    typeof notice.id === "string" &&
    KINDS.includes(notice.kind) &&
    PRIORITIES.includes(notice.priority) &&
    typeof notice.text === "string" &&
    typeof notice.puzzleId === "string" &&
    Number.isInteger(notice.sessionRev) &&
    Number.isFinite(notice.createdAt) &&
    (notice.cellIndex === undefined || Number.isInteger(notice.cellIndex)) &&
    (notice.issues === undefined ||
      (Array.isArray(notice.issues) && notice.issues.every(validIssue)))
  );
}
/** 刷新后恢复未处理的重要消息及其来源版本。 */
export function loadNotices(): Notice[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter(validNotice)
      .filter((notice) => notice.priority === "important")
      .slice(-20);
  } catch {
    return [];
  }
}
/** 只持久化未处理的重要消息；普通导航与操作反馈不落盘。 */
export function saveNotices(notices: Notice[]): boolean {
  try {
    const keep = notices
      .filter((notice) => notice.priority === "important" && !notice.acknowledged)
      .slice(-20);
    localStorage.setItem(KEY, JSON.stringify(keep));
    return true;
  } catch {
    return false;
  }
}
