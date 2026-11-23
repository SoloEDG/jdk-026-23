import { useEffect, useRef, useState } from "react";
import {
  Grid2X2,
  Images,
  Leaf,
  ArrowUpRight,
  CheckCircle2,
  X,
} from "lucide-react";
import { CatalogPanel, puzzles } from "../features/catalog";
import { BoardPanel } from "../features/board";
import { AssistPanel, QuietCard } from "../features/assist";
import { JournalPanel } from "../features/journal";
import { GalleryPanel } from "../features/gallery";
import { LiveRegion, NoticeCenter } from "../features/a11y";
import { useGame } from "./useGame";
export function App() {
  const game = useGame();
  const [page, setPage] = useState<"play" | "gallery">("play");
  const [resetting, setResetting] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const restoreFocus = useRef<Element | null>(null);
  const open = (id: string) => {
    game.commit({ type: "open", id });
    setPage("play");
  };
  // 模态确认期间：焦点移入对话框，棋盘与页面快捷键随 inert 一并隔离。
  useEffect(() => {
    if (!resetting) return;
    restoreFocus.current = globalThis.document.activeElement;
    const dialog = modalRef.current;
    const first = dialog?.querySelector<HTMLElement>("[data-autofocus]");
    (first ?? dialog?.querySelector("button"))?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setResetting(false);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("button"));
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = globalThis.document.activeElement;
      if (e.shiftKey && active === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    globalThis.document.addEventListener("keydown", onKeyDown, true);
    return () => {
      globalThis.document.removeEventListener("keydown", onKeyDown, true);
      (restoreFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [resetting]);
  return (
    <div className="app-shell">
      <LiveRegion item={game.speechItem} />
      <nav className="rail" inert={resetting}>
        <a className="brand-mark" href="#" aria-label="格间首页">
          <Grid2X2 size={25} />
        </a>
        <button
          className={page === "play" ? "active" : ""}
          onClick={() => setPage("play")}
          aria-label="解谜工作台"
        >
          <Grid2X2 size={21} />
          <span>解谜</span>
        </button>
        <button
          className={page === "gallery" ? "active" : ""}
          onClick={() => setPage("gallery")}
          aria-label="作品展柜"
        >
          <Images size={21} />
          <span>展柜</span>
        </button>
        <span className="rail-bottom">
          <Leaf size={20} />
          <span>慢一点</span>
        </span>
      </nav>
      <div className="main-shell" inert={resetting}>
        <header className="topbar">
          <a href="#" className="wordmark" onClick={() => setPage("play")}>
            格间<span>gejian</span>
          </a>
          <div className="header-center">给思绪留一点空白</div>
          <div className="header-right">
            <span className="online-dot" />
            只属于你的专注时光
          </div>
        </header>
        <main>
          <div className="page-intro">
            <div>
              <span className="eyebrow">NONOGRAM CLUB / 数织俱乐部</span>
              <h2>
                {page === "play"
                  ? "在数字之间，发现图案。"
                  : "让每一次发现，都有归处。"}
              </h2>
            </div>
            <div className="intro-note">
              不赶时间，只享受解开的瞬间。
              <ArrowUpRight size={16} />
            </div>
          </div>
          {page === "play" ? (
            <>
              <div className="workspace">
                <CatalogPanel document={game.document} onOpen={open} />
                <BoardPanel
                  puzzle={game.puzzle}
                  session={game.session}
                  initialFocus={game.focusByPuzzle[game.puzzle.id]}
                  focusRequest={game.focusRequest}
                  onFocusChange={(index) =>
                    game.rememberFocus(game.puzzle.id, index)
                  }
                  onFocusRequestDone={game.clearFocusRequest}
                  onMark={(index, mark) =>
                    game.commit({ type: "mark", index, mark })
                  }
                  onUndo={() => game.commit({ type: "undo" })}
                  onReset={() => setResetting(true)}
                  onAnnounce={game.announce}
                />
                <aside className="assist">
                  <AssistPanel
                    session={game.session}
                    onHint={game.hint}
                    onCheck={game.check}
                  />
                  <NoticeCenter
                    notices={game.notices}
                    puzzles={puzzles}
                    document={game.document}
                    onRead={game.readNotice}
                    onJump={game.jumpTo}
                    onDismiss={game.dismissNotice}
                  />
                  <QuietCard />
                </aside>
              </div>
              <div className="bottom-row">
                <JournalPanel
                  document={game.document}
                  puzzles={puzzles}
                  saveState={game.saveState}
                  onSave={game.save}
                  onOpen={open}
                />
                <button
                  className="collection-teaser"
                  onClick={() => setPage("gallery")}
                >
                  <div>
                    <span className="eyebrow">THE REVEAL</span>
                    <h2>
                      {game.session.solved
                        ? "你的新作品，正在等你"
                        : "每一幅图，都藏着一个惊喜。"}
                    </h2>
                    <p>
                      {game.session.solved ? (
                        <>
                          <CheckCircle2 size={15} />
                          已完成「{game.puzzle.title}」· 去展柜看看
                        </>
                      ) : (
                        "完成解谜，让隐藏的图案成为你的收藏。"
                      )}
                    </p>
                    <span className="text-link">
                      打开我的展柜 <ArrowUpRight size={16} />
                    </span>
                  </div>
                  <div className="teaser-art">✳</div>
                </button>
              </div>
            </>
          ) : (
            <GalleryPanel
              document={game.document}
              puzzles={puzzles}
              onOpen={open}
            />
          )}
          <footer>
            格间 GEJIAN <span>把复杂交给数字，把片刻留给自己。</span>
            <span>本地保存 · 无需登录</span>
          </footer>
        </main>
      </div>
      {resetting && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            ref={modalRef}
          >
            <button
              className="modal-close"
              aria-label="取消重新开始"
              onClick={() => setResetting(false)}
            >
              <X size={19} />
            </button>
            <h2 id="reset-title">重新探索这幅图？</h2>
            <p>
              本题标记、计时和提示额度会重置。已完成的解题记录和收藏仍保留。
            </p>
            <div>
              <button data-autofocus onClick={() => setResetting(false)}>
                继续解题
              </button>
              <button
                className="primary"
                onClick={() => {
                  game.commit({ type: "reset" });
                  setResetting(false);
                }}
              >
                重新开始
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
