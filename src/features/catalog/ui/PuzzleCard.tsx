import { Grid2X2, Check } from "lucide-react";
import type { Puzzle, Session } from "../../../shared/types";
import { completion } from "../../../shared/document";
import { catalogLabel, puzzleAlias } from "../../a11y";
import { puzzles } from "../model/puzzles";
import { difficultyDots } from "../lib/filter";
export function PuzzleCard({
  puzzle,
  session,
  selected,
  onOpen,
}: {
  puzzle: Puzzle;
  session?: Session;
  selected: boolean;
  onOpen: () => void;
}) {
  const progress = session ? completion(session) : 0;
  return (
    <button
      className={`puzzle-card ${selected ? "selected" : ""}`}
      onClick={onOpen}
      aria-label={catalogLabel(puzzles, puzzle, session)}
      aria-current={selected || undefined}
    >
      <span className="puzzle-icon" style={{ color: puzzle.color }}>
        {session?.solved ? <Check size={22} /> : <Grid2X2 size={22} />}
      </span>
      <span className="puzzle-info">
        <strong>
          {session?.solved ? puzzle.title : puzzleAlias(puzzles, puzzle)}
        </strong>
        <small>
          {puzzle.size} × {puzzle.size}
          <i /> {puzzle.collection}
        </small>
        <span className="mini-track">
          <span style={{ width: progress + "%" }} />
        </span>
      </span>
      <span className="puzzle-meta">
        <span className="difficulty" aria-hidden="true">
          {"●".repeat(difficultyDots(puzzle.level))}
          {"○".repeat(3 - difficultyDots(puzzle.level))}
        </span>
        <small>
          {session?.solved ? "已完成" : progress ? progress + "%" : "未开始"}
        </small>
      </span>
    </button>
  );
}
