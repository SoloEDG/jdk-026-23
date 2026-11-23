import type { Puzzle } from "../../../shared/types";
export function Artwork({ puzzle }: { puzzle: Puzzle }) {
  return (
    <div
      className="artwork"
      style={{ gridTemplateColumns: `repeat(${puzzle.size},1fr)` }}
      role="img"
      aria-label={`作品「${puzzle.title}」的图案`}
    >
      {puzzle.solution.map((v, i) => (
        <span
          key={i}
          style={{ background: v ? puzzle.color : "transparent" }}
        />
      ))}
    </div>
  );
}
