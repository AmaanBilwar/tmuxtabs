import type { FocusDirection, PaneNode, Session, SplitDirection } from '@src/lib/types';

export function createPaneId(): string {
  return `pane-${crypto.randomUUID()}`;
}

export function createSessionId(): string {
  return `session-${crypto.randomUUID()}`;
}

export function createPane(windowId: number, tabIds: number[] = []): PaneNode {
  return { id: createPaneId(), windowId, tabIds };
}

export function createSession(name: string, root: PaneNode): Session {
  return { id: createSessionId(), name, root };
}

export function findPaneByWindowId(root: PaneNode, windowId: number): PaneNode | null {
  if (root.children?.length) {
    for (const child of root.children) {
      const found = findPaneByWindowId(child, windowId);
      if (found) return found;
    }
    return null;
  }
  if (root.windowId === windowId) return root;
  return null;
}

export function findPaneById(root: PaneNode, paneId: string): PaneNode | null {
  if (root.id === paneId) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findPaneById(child, paneId);
    if (found) return found;
  }
  return null;
}

export function findParentPane(root: PaneNode, paneId: string): PaneNode | null {
  if (!root.children) return null;
  if (root.children.some((child) => child.id === paneId)) return root;
  for (const child of root.children) {
    const found = findParentPane(child, paneId);
    if (found) return found;
  }
  return null;
}

export function collectPanes(root: PaneNode): PaneNode[] {
  const panes = [root];
  if (root.children) {
    for (const child of root.children) {
      panes.push(...collectPanes(child));
    }
  }
  return panes;
}

export function splitPaneInTree(
  root: PaneNode,
  windowId: number,
  newWindowId: number,
  newTabIds: number[],
  direction: SplitDirection,
): PaneNode {
  const pane = findPaneByWindowId(root, windowId);
  if (!pane) return root;

  const originalPane: PaneNode = {
    id: pane.id,
    windowId: -1,
    tabIds: [],
    splitDirection: direction,
    children: [
      {
        id: createPaneId(),
        windowId: pane.windowId,
        tabIds: pane.tabIds.filter((id) => !newTabIds.includes(id)),
      },
      {
        id: createPaneId(),
        windowId: newWindowId,
        tabIds: newTabIds,
      },
    ],
  };

  return replacePane(root, pane.id, originalPane);
}

function replacePane(root: PaneNode, paneId: string, replacement: PaneNode): PaneNode {
  if (root.id === paneId) return replacement;
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((child) => replacePane(child, paneId, replacement)),
  };
}

export function removePaneFromTree(root: PaneNode, windowId: number): PaneNode | null {
  if (root.children?.length) {
    const filteredChildren = root.children
      .map((child) => removePaneFromTree(child, windowId))
      .filter((child): child is PaneNode => child !== null);

    if (filteredChildren.length === root.children.length) {
      return root;
    }
    if (filteredChildren.length === 0) return null;
    if (filteredChildren.length === 1) return filteredChildren[0];
    return { ...root, children: filteredChildren };
  }

  if (root.windowId === windowId) return null;
  return root;
}

export function getSiblingPane(
  root: PaneNode,
  windowId: number,
  direction: FocusDirection,
): PaneNode | null {
  const pane = findPaneByWindowId(root, windowId);
  if (!pane) return null;

  const parent = findParentPane(root, pane.id);
  if (!parent?.children || parent.children.length < 2) return null;

  const index = parent.children.findIndex((child) => child.id === pane.id);
  if (index === -1) return null;

  const splitDirection = parent.splitDirection ?? 'vertical';
  if (direction === 'left' || direction === 'right') {
    if (splitDirection !== 'vertical') return null;
    const siblingIndex = direction === 'left' ? index - 1 : index + 1;
    return parent.children[siblingIndex] ?? null;
  }

  if (splitDirection !== 'horizontal') return null;
  const siblingIndex = direction === 'up' ? index - 1 : index + 1;
  return parent.children[siblingIndex] ?? null;
}

export function getNextPaneInCycle(root: PaneNode, currentWindowId: number): PaneNode | null {
  const panes = collectPanes(root).filter((pane) => !pane.children?.length);
  if (panes.length <= 1) return null;

  const index = panes.findIndex((pane) => pane.windowId === currentWindowId);
  const nextIndex = index === -1 ? 0 : (index + 1) % panes.length;
  return panes[nextIndex] ?? null;
}

export function syncPaneTabs(root: PaneNode, windowId: number, tabIds: number[]): PaneNode {
  const pane = findPaneByWindowId(root, windowId);
  if (!pane) return root;
  return replacePane(root, pane.id, { ...pane, tabIds });
}
