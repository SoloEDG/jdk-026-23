import { useCallback, useEffect, useRef, useState } from "react";
import type { GameAction, GameDocument, FocusRequest } from "../shared/types";
import { findPuzzle, puzzles } from "../features/catalog";
import {
  commitTransition,
  prepareHint,
  dequeueSpeech,
  enqueueSpeech,
  isExpired,
  loadNotices,
  restoreSummary,
  saveNotices,
  type Notice,
  type SpeechItem,
  type SpeechQueue,
} from "../features/a11y";
import { loadDocument, saveDocument } from "../features/journal";
export type { FocusRequest } from "../shared/types";
let localSeq = 0;
function localNotice(
  draft: Pick<Notice, "kind" | "priority" | "text">,
  document: GameDocument,
): Notice {
  return {
    ...draft,
    id: `l${Date.now().toString(36)}-${localSeq++}`,
    puzzleId: document.activeId,
    sessionRev: document.sessions[document.activeId]?.rev ?? 0,
    createdAt: Date.now(),
  };
}
export function useGame() {
  const [initial] = useState(() => loadDocument(puzzles));
  const [document, setDocument] = useState(initial.document);
  const docRef = useRef(document);
  const [saveState, setSaveState] = useState(
    initial.warning ? "手动保存" : "进度已保存",
  );
  const allowSave = useRef(!initial.warning);
  const [notices, setNotices] = useState<Notice[]>(() => {
    const restored = loadNotices();
    const hasProgress =
      initial.document.records.length > 0 ||
      Object.values(initial.document.sessions).some(
        (s) =>
          s.hints > 0 ||
          s.seconds > 0 ||
          s.marks.some((m) => m !== "unknown"),
      );
    if (!initial.warning && !hasProgress) return restored;
    const summary = localNotice(
      {
        kind: "restore",
        priority: initial.warning ? "important" : "info",
        text: initial.warning || restoreSummary(puzzles, initial.document),
      },
      initial.document,
    );
    return [...restored, summary];
  });
  const queueRef = useRef<SpeechQueue>({ pending: [] });
  const [speechItem, setSpeechItem] = useState<SpeechItem | null>(null);
  const [focusByPuzzle, setFocusByPuzzle] = useState<Record<string, number>>(
    {},
  );
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const focusNonce = useRef(0);
  const speak = useCallback((item: SpeechItem) => {
    queueRef.current = enqueueSpeech(queueRef.current, item);
  }, []);
  const pushNotices = useCallback(
    (list: Notice[]) => {
      if (!list.length) return;
      for (const notice of list)
        speak({ id: notice.id, text: notice.text, priority: notice.priority });
      setNotices((prev) => {
        const next = [...prev, ...list];
        if (next.length <= 40) return next;
        // 超限时先丢弃最旧的普通消息，未确认的重要消息始终保留。
        const important = next.filter(
          (n) => n.priority === "important" && !n.acknowledged,
        );
        const rest = next.filter(
          (n) => !(n.priority === "important" && !n.acknowledged),
        );
        return [...important, ...rest].slice(-40);
      });
    },
    [speak],
  );
  /** 统一提交入口：鼠标、键盘、快捷键、模态确认全部经此裁决。 */
  const commit = useCallback(
    (action: GameAction) => {
      const result = commitTransition(docRef.current, action, puzzles);
      docRef.current = result.document;
      setDocument(result.document);
      pushNotices(result.notices);
    },
    [pushNotices],
  );
  // 朗读队列冲刷：导航播报会被合并，重要消息按优先级先播且必达。
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = dequeueSpeech(queueRef.current);
      if (next) {
        queueRef.current = next.queue;
        setSpeechItem(next.item);
      }
    }, 140);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (globalThis.document.visibilityState === "visible")
        commit({ type: "tick" });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [commit]);
  // 未处理的重要消息（含来源版本）随队列变化落盘，刷新后可恢复。
  useEffect(() => {
    saveNotices(notices);
  }, [notices]);
  const reportSave = useCallback(
    (ok: boolean) => {
      setSaveState(ok ? "进度已保存" : "保存失败 · 点击重试");
      if (ok) {
        setNotices((prev) =>
          prev.filter((n) => n.kind !== "save" || n.acknowledged),
        );
        return;
      }
      const notice = localNotice(
        {
          kind: "save",
          priority: "important",
          text: "进度保存失败：浏览器存储不可用，请点击保存按钮重试。当前棋盘数据未丢失。",
        },
        docRef.current,
      );
      setNotices((prev) =>
        prev.some((n) => n.kind === "save" && !n.acknowledged)
          ? prev
          : [...prev, notice],
      );
      speak({ id: notice.id, text: notice.text, priority: "important" });
    },
    [speak],
  );
  useEffect(() => {
    if (!allowSave.current) return;
    const timer = window.setTimeout(
      () => reportSave(saveDocument(docRef.current)),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [document, reportSave]);
  const save = useCallback(() => {
    allowSave.current = true;
    reportSave(saveDocument(docRef.current));
  }, [reportSave]);
  const hint = useCallback(() => {
    const prepared = prepareHint(
      docRef.current,
      puzzles,
      `hint-${Date.now().toString(36)}-${localSeq++}`,
    );
    if (prepared.action) commit(prepared.action);
    else pushNotices([prepared.notice]);
  }, [commit, pushNotices]);
  const check = useCallback(() => commit({ type: "check" }), [commit]);
  /** 回听：只朗读，不触发任何提交，因此永远不会重复扣费。 */
  const readNotice = useCallback(
    (notice: Notice) => {
      const puzzle = puzzles.find((p) => p.id === notice.puzzleId);
      const issues = notice.issues?.length
        ? `问题位置：${notice.issues
            .map((issue) =>
              puzzle
                ? `第 ${Math.floor(issue.index / puzzle.size) + 1} 行第 ${(issue.index % puzzle.size) + 1} 列，${issue.reason}`
                : issue.reason,
            )
            .join("；")}`
        : "";
      speak({
        id: `${notice.id}-read-${Date.now()}`,
        text: issues ? `${notice.text}${issues}` : notice.text,
        priority: notice.priority,
      });
    },
    [speak],
  );
  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);
  /** 回到格子：过期结果只允许回听，不允许应用。 */
  const jumpTo = useCallback(
    (notice: Notice, index: number) => {
      if (isExpired(notice, docRef.current)) return;
      if (notice.puzzleId !== docRef.current.activeId)
        commit({ type: "open", id: notice.puzzleId });
      setFocusRequest({
        puzzleId: notice.puzzleId,
        index,
        nonce: ++focusNonce.current,
      });
    },
    [commit],
  );
  const rememberFocus = useCallback((puzzleId: string, index: number) => {
    setFocusByPuzzle((prev) =>
      prev[puzzleId] === index ? prev : { ...prev, [puzzleId]: index },
    );
  }, []);
  const announce = useCallback(
    (text: string) =>
      speak({
        id: `nav-${Date.now().toString(36)}-${localSeq++}`,
        text,
        priority: "nav",
      }),
    [speak],
  );
  const puzzle = findPuzzle(document.activeId);
  const session = document.sessions[puzzle.id];
  return {
    document,
    puzzle,
    session,
    notices,
    saveState,
    speechItem,
    focusByPuzzle,
    focusRequest,
    commit,
    save,
    hint,
    check,
    announce,
    readNotice,
    dismissNotice,
    jumpTo,
    rememberFocus,
    clearFocusRequest: () => setFocusRequest(null),
  };
}
