import type { SplitDirection } from '@src/lib/types';

export type WindowBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function computeSplitBounds(
  bounds: WindowBounds,
  direction: SplitDirection,
): { original: WindowBounds; split: WindowBounds } {
  const { left, top, width, height } = bounds;

  if (direction === 'vertical') {
    const halfWidth = Math.floor(width / 2);
    return {
      original: { left, top, width: halfWidth, height },
      split: { left: left + halfWidth, top, width: width - halfWidth, height },
    };
  }

  const halfHeight = Math.floor(height / 2);
  return {
    original: { left, top, width, height: halfHeight },
    split: { left, top: top + halfHeight, width, height: height - halfHeight },
  };
}

export async function getWindowBounds(windowId: number): Promise<WindowBounds> {
  const win = await chrome.windows.get(windowId);
  return {
    left: win.left ?? 0,
    top: win.top ?? 0,
    width: win.width ?? 800,
    height: win.height ?? 600,
  };
}

export async function applyWindowBounds(windowId: number, bounds: WindowBounds): Promise<void> {
  await chrome.windows.update(windowId, {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  });
}
