import type { NoticePriority } from "./notices";
export interface SpeechItem {
  id: string;
  text: string;
  priority: NoticePriority;
}
export interface SpeechQueue {
  pending: SpeechItem[];
}
const PRIORITY_RANK: Record<NoticePriority, number> = {
  nav: 0,
  info: 1,
  important: 2,
};
const INFO_CAP = 3;
/**
 * 入队规则：
 * - nav（位置播报）可被合并：队列中只保留最新一条，连续移动不会积压；
 * - info（普通反馈）最多保留 INFO_CAP 条，超出丢弃最旧；
 * - important（保存失败、扣费确认、完成结果）永不丢弃、永不合并。
 */
export function enqueueSpeech(
  queue: SpeechQueue,
  item: SpeechItem,
): SpeechQueue {
  let pending = queue.pending;
  if (item.priority === "nav") pending = pending.filter((i) => i.priority !== "nav");
  pending = [...pending, item];
  const info = pending.filter((i) => i.priority === "info");
  if (info.length > INFO_CAP) {
    const drop = new Set(info.slice(0, info.length - INFO_CAP).map((i) => i.id));
    pending = pending.filter((i) => !drop.has(i.id));
  }
  return { pending };
}
/** 出队：优先级高者先播，同级按入队先后。 */
export function dequeueSpeech(
  queue: SpeechQueue,
): { item: SpeechItem; queue: SpeechQueue } | null {
  if (!queue.pending.length) return null;
  let best = 0;
  for (let i = 1; i < queue.pending.length; i++)
    if (
      PRIORITY_RANK[queue.pending[i].priority] >
      PRIORITY_RANK[queue.pending[best].priority]
    )
      best = i;
  return {
    item: queue.pending[best],
    queue: { pending: queue.pending.filter((_, i) => i !== best) },
  };
}
