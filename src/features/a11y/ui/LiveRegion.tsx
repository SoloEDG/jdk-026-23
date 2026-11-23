import { useEffect, useRef, useState } from "react";
import type { SpeechItem } from "../model/speech";
/**
 * 双通道朗读区域：普通反馈走 polite，重要消息（保存失败、扣费确认、
 * 完成结果）走 assertive。相同文本连续播报时交替附加不可见字符，
 * 保证每次都能触发重读。
 */
export function LiveRegion({ item }: { item: SpeechItem | null }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const last = useRef<{ text: string; rendered: string } | null>(null);
  useEffect(() => {
    if (!item) return;
    let rendered = item.text;
    if (last.current?.text === item.text)
      rendered = last.current.rendered.endsWith("⁠")
        ? item.text
        : `${item.text}⁠`;
    last.current = { text: item.text, rendered };
    if (item.priority === "important") setAssertive(rendered);
    else setPolite(rendered);
  }, [item]);
  return (
    <>
      <div className="visually-hidden" role="status" aria-live="polite">
        {polite}
      </div>
      <div className="visually-hidden" aria-live="assertive">
        {assertive}
      </div>
    </>
  );
}
