export interface Bounds { x: number; y: number; width: number; height: number }

export function placeTrayPopover(tray: Bounds, workArea: Bounds, width: number, height: number): Bounds {
  const margin = 8
  const workRight = workArea.x + workArea.width
  const workBottom = workArea.y + workArea.height
  const x = Math.min(Math.max(tray.x + tray.width - width, workArea.x + margin), workRight - width - margin)
  const spaceBelow = workBottom - (tray.y + tray.height)
  const preferredY = spaceBelow >= height + margin ? tray.y + tray.height + margin : tray.y - height - margin
  const y = Math.min(Math.max(preferredY, workArea.y + margin), workBottom - height - margin)
  return { x: Math.round(x), y: Math.round(y), width, height }
}
