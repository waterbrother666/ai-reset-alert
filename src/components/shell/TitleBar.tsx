import { useEffect, useState, type CSSProperties } from "react";

const DRAG = { WebkitAppRegion: "drag" } as CSSProperties;
const NO_DRAG = { WebkitAppRegion: "no-drag" } as CSSProperties;

// 无边框自定义标题栏：左侧 macOS 交通灯占位 / 右侧 Windows 按钮位，中间显示仓库名
export function TitleBar({
  platform,
  runtime,
}: {
  platform: "mac" | "win";
  runtime: "desktop" | "web";
}) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (runtime !== "desktop" || platform !== "win") return;
    void window.desktopApi?.isWindowMaximized().then(setMaximized);
    return window.desktopApi?.onWindowMaximizedChanged(setMaximized);
  }, [platform, runtime]);

  return (
    <header
      className="relative z-50 flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-glass-strong)] pl-3 backdrop-blur-2xl select-none"
      style={runtime === "desktop" ? DRAG : undefined}
    >
      <div className="flex items-center gap-3">
        {platform === "mac" && (
          <div className="flex items-center gap-2" style={NO_DRAG}>
            <span className="h-3 w-3 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-2)]" />
            <span className="h-3 w-3 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-2)]" />
            <span className="h-3 w-3 rounded-full bg-[var(--color-brand)]" />
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <img src="./app-icon.png" alt="" draggable={false}
            className="h-6 w-6 rounded-[7px] object-cover ring-1 ring-white/15" />
          <span className="text-[16px] font-extrabold tracking-[-0.015em] text-[var(--color-text)]">
            ai-reset-alert
          </span>
        </div>
      </div>

      <div className="flex items-center" style={NO_DRAG}>
        {runtime === "desktop" && platform === "win" && (
          <div className="flex items-center">
            <button onClick={() => { void window.desktopApi?.minimizeWindow() }}
              className="flex h-12 w-12 items-center justify-center text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-white/10 hover:text-[var(--color-text)] active:scale-100" aria-label="最小化" title="最小化">
              <svg width="11" height="11" viewBox="0 0 11 11"><path d="M0 5.5h11" stroke="currentColor" /></svg>
            </button>
            <button onClick={() => { void window.desktopApi?.toggleMaximizeWindow().then(setMaximized) }}
              className="flex h-12 w-12 items-center justify-center text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-white/10 hover:text-[var(--color-text)] active:scale-100"
              aria-label={maximized ? "还原" : "最大化"} title={maximized ? "还原" : "最大化"}>
              {maximized
                ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3.5 3.5V1.5h7v7h-2M1.5 3.5h7v7h-7z" fill="none" stroke="currentColor" /></svg>
                : <svg width="11" height="11" viewBox="0 0 11 11"><rect x="0.5" y="0.5" width="10" height="10" fill="none" stroke="currentColor" /></svg>}
            </button>
            <button onClick={() => { void window.desktopApi?.closeWindow() }}
              className="flex h-12 w-12 items-center justify-center text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[#c42b1c] hover:text-white active:scale-100" aria-label="关闭" title="关闭">
              <svg width="11" height="11" viewBox="0 0 11 11"><path d="M0 0l11 11M11 0L0 11" stroke="currentColor" /></svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
