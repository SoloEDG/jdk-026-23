import { Volume2, Crosshair, Check, Inbox } from "lucide-react";
import type { GameDocument, Puzzle } from "../../../shared/types";
import { isExpired, type Notice } from "../model/notices";
function position(size: number, index: number): string {
  return `第 ${Math.floor(index / size) + 1} 行第 ${(index % size) + 1} 列`;
}
/**
 * 听读队列：选中条目可重新朗读（免费，不触发任何提交），
 * 未过期的条目可通过结构化坐标回到对应格子——坐标只取数据字段，
 * 不解析界面文字。过期条目保留回听，应用入口禁用。
 */
export function NoticeCenter({
  notices,
  puzzles,
  document,
  onRead,
  onJump,
  onDismiss,
}: {
  notices: Notice[];
  puzzles: Puzzle[];
  document: GameDocument;
  onRead: (notice: Notice) => void;
  onJump: (notice: Notice, index: number) => void;
  onDismiss: (id: string) => void;
}) {
  const sizeOf = (puzzleId: string) =>
    puzzles.find((p) => p.id === puzzleId)?.size ?? 0;
  return (
    <section className="panel notice-center" aria-label="听读队列">
      <div className="notice-heading">
        <span className="eyebrow">LISTEN BACK</span>
        <h2>听读队列</h2>
        <p className="muted">
          重要消息会保留在这里。选中条目可再次朗读；未过期的结果可以回到对应格子。
        </p>
      </div>
      {notices.length ? (
        <ul className="notice-list">
          {[...notices].reverse().map((notice) => {
            const expired = isExpired(notice, document);
            const size = sizeOf(notice.puzzleId);
            return (
              <li
                key={notice.id}
                className={`notice-item ${notice.priority}${expired ? " expired" : ""}`}
              >
                <button
                  className="notice-read"
                  onClick={() => onRead(notice)}
                  aria-label={`朗读：${notice.text}`}
                >
                  <Volume2 size={14} />
                  <span>{notice.text}</span>
                </button>
                <div className="notice-meta">
                  {notice.priority === "important" && (
                    <span className="notice-badge">重要</span>
                  )}
                  {expired && <span className="notice-badge stale">已过期</span>}
                  {notice.cellIndex !== undefined && size > 0 && (
                    <button
                      className="notice-jump"
                      disabled={expired}
                      onClick={() => onJump(notice, notice.cellIndex!)}
                      aria-label={`回到${position(size, notice.cellIndex)}`}
                    >
                      <Crosshair size={13} />
                      {position(size, notice.cellIndex)}
                    </button>
                  )}
                  <button
                    className="notice-dismiss"
                    onClick={() => onDismiss(notice.id)}
                    aria-label="知道了，移出队列"
                  >
                    <Check size={14} />
                  </button>
                </div>
                {notice.issues && size > 0 && (
                  <ul className="issue-list">
                    {notice.issues.map((issue) => (
                      <li key={issue.index}>
                        <button
                          disabled={expired}
                          onClick={() => onJump(notice, issue.index)}
                          aria-label={`回到${position(size, issue.index)}，${issue.reason}`}
                        >
                          <Crosshair size={12} />
                          {position(size, issue.index)}：{issue.reason}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="notice-empty">
          <Inbox size={15} />
          暂时没有消息。移动棋盘、使用提示或检查后，结果会出现在这里。
        </p>
      )}
    </section>
  );
}
