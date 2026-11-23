export type Mark = "unknown" | "filled" | "cross";
export type Tool = "filled" | "cross" | "unknown";
export interface Puzzle {
  id: string;
  title: string;
  collection: string;
  level: "入门" | "进阶" | "挑战";
  size: number;
  solution: number[];
  color: string;
}
export interface Move {
  index: number;
  before: Mark;
  after: Mark;
}
export interface HintRef {
  id: string;
  index: number;
}
export interface Session {
  puzzleId: string;
  marks: Mark[];
  moves: Move[];
  hints: number;
  checks: number;
  seconds: number;
  solved: boolean;
  updatedAt: number;
  /** 棋盘数据版本：marks 每次实际变化时递增，用于裁决消息是否过期 */
  rev: number;
  /** 已生效的提示请求（幂等键 → 格子），同一请求重复提交不会再次扣费 */
  hintRefs: HintRef[];
}
export interface SolveRecord {
  id: string;
  puzzleId: string;
  seconds: number;
  hints: number;
  checks: number;
  finishedAt: number;
}
export interface GameDocument {
  version: 1;
  activeId: string;
  sessions: Record<string, Session>;
  records: SolveRecord[];
}
export interface FocusRequest {
  puzzleId: string;
  index: number;
  nonce: number;
}
export type GameAction =
  | { type: "open"; id: string }
  | { type: "mark"; index: number; mark: Mark }
  | { type: "undo" }
  | { type: "hint"; index: number; mark: Mark; requestId?: string }
  | { type: "check" }
  | { type: "tick" }
  | { type: "reset" };
