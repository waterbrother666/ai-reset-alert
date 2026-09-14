import { useState } from "react";
import type { SignalRecord } from "../data/viewModels";
import { CATEGORY_LABELS, CATEGORY_HINTS } from "../data/viewModels";
import { CATEGORY_TONE, absoluteTime } from "../lib/format";
import { ExternalIcon, BellIcon, ChevronDownIcon } from "./ui/Icon";

function NotifyTag({ state }: { state: SignalRecord["notify"] }) {
  const notified = state === "notified";
  return (
    <span className={`inline-flex items-center gap-1 text-[12.5px] ${notified ? "text-[var(--color-ok)]" : "text-[var(--color-text-faint)]"}`}>
      <BellIcon size={12} />
      {notified ? "已通知" : "未通知"}
    </span>
  );
}

export function CategoryChip({ record }: { record: SignalRecord }) {
  const tone = CATEGORY_TONE[record.category];
  return (
    <span title={CATEGORY_HINTS[record.category]} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${tone.chipBg} ${tone.chipText}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {CATEGORY_LABELS[record.category]}
    </span>
  );
}

interface TiboPostProps {
  record: SignalRecord;
  compact?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

export function TiboPost({ record, compact = false, expanded, onToggle }: TiboPostProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const isExpanded = expanded ?? localExpanded;
  const toggle = onToggle ?? (() => setLocalExpanded((value) => !value));
  const long = record.body.length + record.originalText.length > (compact ? 170 : 320);

  return (
    <article className={`flex items-start ${compact ? "gap-3" : "gap-3.5"}`}>
      <img src="./tibo-avatar.jpg" alt="Tibo" className={`${compact ? "h-10 w-10" : "h-12 w-12"} shrink-0 rounded-full object-cover ring-1 ring-[var(--color-border)]`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-tight">
          <span className="font-bold text-[var(--color-text)]">Tibo</span>
          <span className="text-[14px] font-medium text-[var(--color-text-faint)]">@thsottiaux</span>
          <span className="text-[var(--color-text-faint)]">·</span>
          <time className="tnum text-[13px] font-medium text-[var(--color-text-faint)]" dateTime={new Date(record.publishedAt).toISOString()} title={absoluteTime(record.publishedAt)}>
            {absoluteTime(record.publishedAt)}
          </time>
        </div>

        <div className={`${compact ? "mt-2" : "mt-3"} ${!isExpanded && long ? (compact ? "line-clamp-4" : "line-clamp-6") : ""}`}>
          <p className={`${compact ? "text-[14.5px]" : "text-[16px]"} whitespace-pre-wrap font-medium leading-relaxed text-[var(--color-text)]`}>
            {record.originalText || record.body}
          </p>
          {record.originalText && record.body !== record.originalText && (
            <p className={`${compact ? "mt-2 text-[13.5px]" : "mt-3 text-[14.5px]"} whitespace-pre-wrap border-l-2 border-[var(--color-border-strong)] pl-3 leading-relaxed text-[var(--color-text-muted)]`}>
              {record.body}
            </p>
          )}
        </div>

        <div className={`${compact ? "mt-2.5" : "mt-4"} flex flex-wrap items-center gap-2`}>
          <CategoryChip record={record} />
          <NotifyTag state={record.notify} />
          {long && (
            <button onClick={toggle} aria-expanded={isExpanded} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              {isExpanded ? "收起" : "展开"}
              <ChevronDownIcon size={13} className={isExpanded ? "rotate-180" : ""} />
            </button>
          )}
          <button onClick={() => { void window.appApi.openPost(record.url) }} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[13px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
            <ExternalIcon size={13} />查看原文
          </button>
        </div>
      </div>
    </article>
  );
}

export function SignalCard({ record }: { record: SignalRecord }) {
  return (
    <div className="jelly-surface relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <TiboPost record={record} />
    </div>
  );
}

export { NotifyTag };
