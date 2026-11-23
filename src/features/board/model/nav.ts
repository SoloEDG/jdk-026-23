/** 棋盘焦点移动的纯函数：方向键按行列移动并在边界处停住，不环绕。 */
export function clampFocus(size: number, index: number): number {
  const max = size * size - 1;
  if (!Number.isFinite(index)) return 0;
  return Math.min(max, Math.max(0, Math.trunc(index)));
}
export function moveFocus(size: number, index: number, key: string): number {
  const current = clampFocus(size, index);
  const row = Math.floor(current / size);
  const col = current % size;
  switch (key) {
    case "ArrowUp":
      return row > 0 ? current - size : current;
    case "ArrowDown":
      return row < size - 1 ? current + size : current;
    case "ArrowLeft":
      return col > 0 ? current - 1 : current;
    case "ArrowRight":
      return col < size - 1 ? current + 1 : current;
    case "Home":
      return row * size;
    case "End":
      return row * size + size - 1;
    case "PageUp":
      return col;
    case "PageDown":
      return (size - 1) * size + col;
    default:
      return current;
  }
}
export function isNavKey(key: string): boolean {
  return [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ].includes(key);
}
