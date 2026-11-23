export function Clue({
  values,
  done,
  vertical,
  role,
}: {
  values: number[];
  done: boolean;
  vertical?: boolean;
  role?: "rowheader" | "columnheader";
}) {
  return (
    <div
      role={role}
      className={`clue ${vertical ? "vertical" : ""} ${done ? "done" : ""}`}
      aria-label={values.join("、") + (done ? " 已满足" : "")}
    >
      {values.map((v, i) => (
        <span key={i} aria-hidden="true">
          {v}
        </span>
      ))}
    </div>
  );
}
