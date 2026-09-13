import { useMemo, useState } from "react";
import type { DayActivity } from "../data/viewModels";
import { heatColor, dateLabel } from "../lib/format";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

// GitHub 风格热力网格：列=周，行=周一~周日，一格 = 一天，有重置的日子标蓝
export function ResetHeatmap({
  data,
  onSelectDay,
}: {
  data: DayActivity[];
  onSelectDay?: (d: DayActivity) => void;
}) {
  const [hover, setHover] = useState<{ d: DayActivity; x: number; y: number } | null>(null);

  // 按周分列。第一天对齐到周一
  const weeks = useMemo(() => {
    const cols: DayActivity[][] = [];
    let col: DayActivity[] = [];
    data.forEach((d, i) => {
      const dow = (new Date(d.date).getDay() + 6) % 7; // 0=周一
      if (i === 0 && dow > 0) {
        for (let k = 0; k < dow; k++) col.push({ date: 0, count: -1, released: false });
      }
      col.push(d);
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    });
    if (col.length) cols.push(col);
    return cols;
  }, [data]);

  // 月份标签：每列首格所在月份，变化时标注
  const monthMarks = useMemo(() => {
    const marks: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((w, ci) => {
      const first = w.find((d) => d.count >= 0);
      if (!first) return;
      const m = new Date(first.date).getMonth();
      if (m !== lastMonth) {
        marks.push({ col: ci, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return marks;
  }, [weeks]);

  const totalResets = data.filter((d) => d.count > 0).length;

  return (
    <div className="heatmap-root relative">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold text-[var(--color-text)]">重置日历</div>
          <div className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
            过去 {Math.round(data.length / 7)} 周 · 共
            <span className="tnum mx-1 font-mono text-[var(--color-brand-text)]">{totalResets}</span>
            天检测到重置
          </div>
        </div>
        <Legend />
      </div>

      <div className="flex gap-3 overflow-visible pb-1">
        {/* 星期轴 */}
        <div
          className="grid w-3 shrink-0 grid-rows-7 gap-[5px] pt-[20px]"
        >
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className="flex items-center text-[11px] font-semibold text-[var(--color-text-faint)]"
            >
              {i % 2 === 0 ? d : ""}
            </div>
          ))}
        </div>

        {/* 网格 + 月份标签 */}
        <div className="relative min-w-0 flex-1 pr-16">
          <div
            className="mb-1 grid h-[15px] gap-[5px]"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(14px, 1fr))` }}
          >
            {monthMarks.map((m) => (
              <span
                key={m.col}
                className="text-[11px] font-semibold text-[var(--color-text-faint)]"
                style={{ gridColumn: m.col + 1 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div
            className="grid gap-[5px]"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(14px, 1fr))` }}
          >
            {weeks.map((week, ci) => (
              <div key={ci} className="grid min-w-0 grid-rows-7 gap-[5px]">
                {week.map((d, ri) => {
                  if (d.count < 0)
                    return <div key={ri} className="aspect-square w-full" />;
                  const isReset = d.count >= 3;
                  return (
                    <button
                      key={ri}
                      type="button"
                      disabled={d.count === 0}
                      onPointerDown={(event) => {
                        if (d.count > 0) event.currentTarget.setPointerCapture(event.pointerId)
                      }}
                      onClick={() => d.count > 0 && onSelectDay?.(d)}
                      onMouseEnter={(e) => {
                        const cell = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const root = (e.currentTarget as HTMLElement)
                          .closest(".heatmap-root")
                          ?.getBoundingClientRect();
                        setHover({
                          d,
                          x: cell.left - (root?.left ?? 0) + cell.width / 2,
                          y: cell.top - (root?.top ?? 0),
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                      aria-label={`${dateLabel(d.date)}${d.count > 0 ? `：${d.count} 条重置信号` : "：无"}`}
                      className={`heat-cell aspect-square w-full ${d.count > 0 ? "cursor-pointer" : "cursor-default"}`}
                      style={{
                        background: "transparent",
                      }}
                    >
                      <span
                        className="heat-jelly pointer-events-none block h-full w-full rounded-[5px]"
                        style={{
                          background: heatColor(d.count),
                          boxShadow: isReset && d.count >= 4 ? "0 0 7px rgba(239,243,244,0.32)" : undefined,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {hover && hover.d.count >= 0 && (
        <div
          className="pointer-events-none absolute z-50 w-max whitespace-nowrap -translate-x-1/2 -translate-y-full rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-elevated)] px-2.5 py-1.5 text-[12.5px] shadow-lg"
          style={{ left: hover.x + 6, top: hover.y - 8 }}
        >
          <div className="tnum font-semibold text-[var(--color-text)]">
            {dateLabel(hover.d.date)} · {hover.d.count > 0 ? `重置 ${hover.d.count} 次` : "未重置"}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-faint)]">
      <span>少</span>
      {[0, 1, 2, 3, 4].map((c) => (
        <span
          key={c}
          className="h-[11px] w-[11px] rounded-[3px]"
          style={{ background: heatColor(c) }}
        />
      ))}
      <span>多</span>
    </div>
  );
}
