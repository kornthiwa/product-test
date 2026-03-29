export type PageToken = number | "gap";

/** สร้างชุดปุ่มเลขหน้า (มี …) จากหน้าปัจจุบันและจำนวนหน้าทั้งหมด */
export function getPageTokens(current: number, totalPages: number): PageToken[] {
  const last = Math.max(1, totalPages);
  const cur = Math.min(Math.max(1, current), last);

  if (last <= 9) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  const items = new Set<number>();
  items.add(1);
  items.add(last);
  for (let i = cur - 1; i <= cur + 1; i++) {
    if (i >= 1 && i <= last) items.add(i);
  }

  const sorted = [...items].sort((a, b) => a - b);
  const out: PageToken[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push("gap");
    }
    out.push(sorted[i]);
  }
  return out;
}
