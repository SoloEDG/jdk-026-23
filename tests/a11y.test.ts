import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { puzzles } from "../src/features/catalog/model/puzzles";
import { newDocument } from "../src/shared/document";
import {
  commitTransition,
  prepareHint,
} from "../src/features/a11y/model/commit";
import {
  enqueueSpeech,
  dequeueSpeech,
  type SpeechQueue,
} from "../src/features/a11y/model/speech";
import {
  isExpired,
  loadNotices,
  saveNotices,
  type Notice,
} from "../src/features/a11y/model/notices";
import {
  catalogLabel,
  cellLabel,
  restoreSummary,
  revealSummary,
} from "../src/features/a11y/model/labels";
import { clampFocus, moveFocus } from "../src/features/board/model/nav";
import { inspectIssues } from "../src/features/assist/lib/inspect";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
let stored: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => stored[k] ?? null,
    setItem: (k: string, v: string) => {
      stored[k] = v;
    },
    removeItem: (k: string) => {
      delete stored[k];
    },
  },
  configurable: true,
});
test("hint commit is atomic: deduction, mark and confirmation come from one commit", () => {
  const d = newDocument(puzzles[0]);
  const prepared = prepareHint(d, puzzles, "req-atomic");
  assert.ok(prepared.action);
  const before = d.sessions[d.activeId];
  const result = commitTransition(d, prepared.action, puzzles);
  const after = result.document.sessions[d.activeId];
  assert.equal(after.hints, before.hints + 1);
  const changed = after.marks.findIndex((m, i) => m !== before.marks[i]);
  const notice = result.notices.find((n) => n.kind === "hint")!;
  assert.equal(notice.priority, "important");
  assert.equal(notice.cellIndex, changed);
  assert.equal(notice.sessionRev, after.rev);
});
test("same hint request replayed never deducts twice and points to the same cell", () => {
  let d = newDocument(puzzles[0]);
  const prepared = prepareHint(d, puzzles, "req-once");
  const first = commitTransition(d, prepared.action!, puzzles);
  assert.equal(first.document.sessions[d.activeId].hints, 1);
  const firstNotice = first.notices.find((n) => n.kind === "hint")!;
  // 朗读确认后再次提交同一请求：协议裁决为无操作，不重复扣费
  const second = commitTransition(first.document, prepared.action!, puzzles);
  assert.equal(second.document, first.document);
  assert.equal(second.document.sessions[d.activeId].hints, 1);
  const duplicate = second.notices.find((n) => n.kind === "hint-duplicate")!;
  assert.equal(duplicate.cellIndex, firstNotice.cellIndex);
  // 换一个新请求才会扣第二次
  const again = prepareHint(first.document, puzzles, "req-twice");
  const third = commitTransition(first.document, again.action!, puzzles);
  assert.equal(third.document.sessions[d.activeId].hints, 2);
});
test("check returns navigable issues with reasons, matching inspect exactly", () => {
  const p = puzzles[1];
  let d = newDocument(p);
  d = commitTransition(d, { type: "mark", index: 0, mark: "filled" }, puzzles)
    .document;
  d = commitTransition(d, { type: "mark", index: 1, mark: "cross" }, puzzles)
    .document;
  const checked = commitTransition(d, { type: "check" }, puzzles);
  const notice = checked.notices.find((n) => n.kind === "check")!;
  assert.equal(notice.priority, "important");
  assert.deepEqual(
    notice.issues,
    inspectIssues(p, checked.document.sessions[p.id]),
  );
  assert.deepEqual(
    notice.issues!.map((i) => i.index),
    [0, 1],
  );
  assert.ok(notice.issues!.every((i) => i.reason.length > 0));
});
test("check stays fresh across ticks but expires once the board changes", () => {
  const p = puzzles[1];
  let d = newDocument(p);
  d = commitTransition(d, { type: "mark", index: 0, mark: "filled" }, puzzles)
    .document;
  const checked = commitTransition(d, { type: "check" }, puzzles);
  const notice = checked.notices.find((n) => n.kind === "check")!;
  const ticked = commitTransition(checked.document, { type: "tick" }, puzzles);
  assert.equal(isExpired(notice, ticked.document), false);
  const marked = commitTransition(
    checked.document,
    { type: "mark", index: 2, mark: "filled" },
    puzzles,
  );
  assert.equal(isExpired(notice, marked.document), true);
  const undone = commitTransition(checked.document, { type: "undo" }, puzzles);
  assert.equal(isExpired(notice, undone.document), true);
});
test("reset bumps the board version so earlier results can not be applied", () => {
  let d = newDocument(puzzles[1]);
  const marked = commitTransition(
    d,
    { type: "mark", index: 1, mark: "filled" },
    puzzles,
  );
  const toReset = commitTransition(marked.document, { type: "reset" }, puzzles);
  const notice = marked.notices.find((n) => n.kind === "mark")!;
  assert.equal(isExpired(notice, marked.document), false);
  assert.equal(isExpired(notice, toReset.document), true);
  assert.ok(
    toReset.document.sessions[puzzles[1].id].rev > notice.sessionRev,
  );
});
test("speech queue merges movement but keeps important messages first", () => {
  let q: SpeechQueue = { pending: [] };
  q = enqueueSpeech(q, { id: "m1", text: "第 1 行第 1 列", priority: "nav" });
  q = enqueueSpeech(q, { id: "m2", text: "第 1 行第 2 列", priority: "nav" });
  assert.equal(q.pending.length, 1);
  assert.equal(q.pending[0].id, "m2");
  q = enqueueSpeech(q, { id: "i1", text: "已填涂", priority: "info" });
  q = enqueueSpeech(q, { id: "h1", text: "提示已确认", priority: "important" });
  q = enqueueSpeech(q, { id: "m3", text: "第 1 行第 3 列", priority: "nav" });
  const first = dequeueSpeech(q)!;
  assert.equal(first.item.id, "h1");
  const second = dequeueSpeech(first.queue)!;
  assert.equal(second.item.id, "i1");
  const third = dequeueSpeech(second.queue)!;
  assert.equal(third.item.id, "m3");
  assert.equal(dequeueSpeech(third.queue), null);
});
test("info feedback is capped while important messages are never dropped", () => {
  let q: SpeechQueue = { pending: [] };
  for (let i = 0; i < 6; i++)
    q = enqueueSpeech(q, { id: `i${i}`, text: `反馈 ${i}`, priority: "info" });
  q = enqueueSpeech(q, { id: "h", text: "保存失败", priority: "important" });
  q = enqueueSpeech(q, { id: "i6", text: "反馈 6", priority: "info" });
  const infos = q.pending.filter((i) => i.priority === "info");
  assert.equal(infos.length, 3);
  assert.deepEqual(
    infos.map((i) => i.id),
    ["i4", "i5", "i6"],
  );
  assert.ok(q.pending.some((i) => i.id === "h"));
});
test("focus movement clamps at edges and never wraps", () => {
  assert.equal(moveFocus(5, 0, "ArrowLeft"), 0);
  assert.equal(moveFocus(5, 0, "ArrowUp"), 0);
  assert.equal(moveFocus(5, 0, "ArrowRight"), 1);
  assert.equal(moveFocus(5, 4, "ArrowRight"), 4);
  assert.equal(moveFocus(5, 4, "ArrowDown"), 9);
  assert.equal(moveFocus(5, 7, "ArrowUp"), 2);
  assert.equal(moveFocus(5, 7, "Home"), 5);
  assert.equal(moveFocus(5, 7, "End"), 9);
  assert.equal(moveFocus(5, 7, "PageUp"), 2);
  assert.equal(moveFocus(5, 7, "PageDown"), 22);
  assert.equal(clampFocus(5, 999), 24);
  assert.equal(clampFocus(5, -3), 0);
});
test("catalog and restore summaries never leak unsolved titles", () => {
  const p = puzzles[0];
  const d = newDocument(p);
  const label = catalogLabel(puzzles, p, d.sessions[p.id]);
  assert.ok(!label.includes(p.title));
  assert.ok(label.includes("图案 01"));
  const summary = restoreSummary(puzzles, d);
  for (const q of puzzles) assert.ok(!summary.includes(q.title));
  assert.ok(summary.includes("图案 01"));
});
test("reveal summary names the finished work without exposing the pattern", () => {
  const p = puzzles[1];
  let d = newDocument(p);
  let notices: Notice[] = [];
  p.solution.forEach((v, index) => {
    if (!v) return;
    const result = commitTransition(
      d,
      { type: "mark", index, mark: "filled" },
      puzzles,
    );
    d = result.document;
    notices = result.notices;
  });
  const solved = notices.find((n) => n.kind === "solved")!;
  assert.equal(solved.priority, "important");
  assert.ok(solved.text.includes(p.title));
  assert.ok(!solved.text.includes(p.solution.join("")));
  const session = d.sessions[p.id];
  const summary = revealSummary(p, session);
  assert.ok(summary.includes(p.title));
  assert.ok(!summary.includes(p.solution.join("")));
  const solvedLabel = catalogLabel(puzzles, p, session);
  assert.ok(solvedLabel.includes(p.title));
});
test("unhandled important notices persist with their source version", () => {
  stored = {};
  const important: Notice = {
    id: "n1",
    kind: "hint",
    priority: "important",
    text: "提示已确认",
    puzzleId: "heart",
    sessionRev: 3,
    createdAt: 1,
  };
  const info: Notice = {
    id: "n2",
    kind: "mark",
    priority: "info",
    text: "已填涂",
    puzzleId: "heart",
    sessionRev: 3,
    createdAt: 2,
  };
  assert.ok(saveNotices([important, info]));
  const loaded = loadNotices();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, "n1");
  assert.equal(loaded[0].sessionRev, 3);
  const d = newDocument(puzzles[1]);
  assert.equal(isExpired(loaded[0], d), true);
  assert.ok(
    !isExpired(
      { ...loaded[0], sessionRev: d.sessions.heart.rev },
      d,
    ),
  );
});
test("prepareHint refuses gracefully once the quota is exhausted", () => {
  let d = newDocument(puzzles[1]);
  for (let i = 0; i < 3; i++) {
    const prepared = prepareHint(d, puzzles, `req-${i}`);
    assert.ok(prepared.action);
    d = commitTransition(d, prepared.action!, puzzles).document;
  }
  const refused = prepareHint(d, puzzles, "req-3");
  assert.equal(refused.action, undefined);
  assert.ok(refused.notice);
  assert.equal(refused.notice!.priority, "info");
});
test("cell labels are generated from structured data", () => {
  assert.equal(
    cellLabel(5, Array(25).fill("unknown"), 0),
    "第 1 行第 1 列，未知",
  );
  const marks = Array(25).fill("unknown");
  marks[7] = "filled";
  assert.equal(cellLabel(5, marks, 7), "第 2 行第 3 列，已填涂");
});
