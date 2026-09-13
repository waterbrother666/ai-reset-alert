import { describe, expect, it } from 'vitest'
import { placeTrayPopover } from '../../src/main/trayPosition'

describe('tray popover placement', () => {
  it('places the popover above a bottom taskbar tray icon', () => {
    expect(placeTrayPopover(
      { x: 1880, y: 1040, width: 24, height: 24 },
      { x: 0, y: 0, width: 1920, height: 1040 }, 228, 250,
    )).toEqual({ x: 1676, y: 782, width: 228, height: 250 })
  })

  it('places the popover below a top taskbar tray icon', () => {
    expect(placeTrayPopover(
      { x: 1880, y: 8, width: 24, height: 24 },
      { x: 0, y: 40, width: 1920, height: 1040 }, 228, 250,
    )).toEqual({ x: 1676, y: 48, width: 228, height: 250 })
  })

  it('keeps the full popover inside a narrow display work area', () => {
    const result = placeTrayPopover(
      { x: -10, y: 750, width: 20, height: 20 },
      { x: 0, y: 0, width: 800, height: 760 }, 228, 250,
    )
    expect(result.x).toBe(8)
    expect(result.y).toBeGreaterThanOrEqual(8)
    expect(result.y + result.height).toBeLessThanOrEqual(752)
  })
})
