import type { FocusDirection, SplitDirection } from '@src/lib/types';
import { collectPanes, getNextPaneInCycle, getSiblingPane } from '@src/lib/paneTree';
import { getActiveSession, loadSessionState } from '@pages/background/sessions';
import {
  applyWindowBounds,
  computeSplitBounds,
  getWindowBounds,
} from '@src/lib/splitWindow';
import {
  ensureActiveSession,
  removeWindowFromSession,
  splitSessionPane,
  updateSession,
} from '@pages/background/sessions';
import { syncPaneTabs } from '@src/lib/paneTree';

export async function splitTab(tabId: number, direction: SplitDirection): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const { state, session } = await ensureActiveSession(tab.windowId);
  const bounds = await getWindowBounds(tab.windowId);
  const { original, split } = computeSplitBounds(bounds, direction);

  await applyWindowBounds(tab.windowId, original);

  const newWindow = await chrome.windows.create({
    tabId,
    left: split.left,
    top: split.top,
    width: split.width,
    height: split.height,
    focused: true,
  });

  if (!newWindow.id) return;
  await splitSessionPane(session, state, tab.windowId, newWindow.id, tabId, direction);
}

export async function focusNextPane(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const { session } = await ensureActiveSession(tab.windowId);
  const nextPane = getNextPaneInCycle(session.root, tab.windowId);
  if (!nextPane) return;
  await chrome.windows.update(nextPane.windowId, { focused: true });
}

export async function focusPaneDirection(tabId: number, direction: FocusDirection): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const { session } = await ensureActiveSession(tab.windowId);
  const sibling = getSiblingPane(session.root, tab.windowId, direction);
  if (!sibling) return;
  await chrome.windows.update(sibling.windowId, { focused: true });
}

export async function createTabInPane(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const { state, session } = await ensureActiveSession(tab.windowId);
  await chrome.tabs.create({ windowId: tab.windowId, active: true });
  const tabs = await chrome.tabs.query({ windowId: tab.windowId });
  const syncedSession = {
    ...session,
    root: syncPaneTabs(
      session.root,
      tab.windowId,
      tabs.map((item) => item.id!).filter(Boolean),
    ),
  };
  await updateSession(syncedSession, state);
}

export async function closeTabInPane(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const { state, session } = await ensureActiveSession(tab.windowId);
  const windowId = tab.windowId;
  const tabsInWindow = await chrome.tabs.query({ windowId });

  if (tabsInWindow.length <= 1) {
    await chrome.windows.remove(windowId);
    await removeWindowFromSession(session, state, windowId);
    return;
  }

  await chrome.tabs.remove(tabId);
  const remainingTabs = await chrome.tabs.query({ windowId });
  const syncedSession = {
    ...session,
    root: syncPaneTabs(
      session.root,
      windowId,
      remainingTabs.map((item) => item.id!).filter(Boolean),
    ),
  };
  await updateSession(syncedSession, state);
}

export async function focusPaneById(paneId: string): Promise<void> {
  const state = await loadSessionState();
  const session = await getActiveSession(state);
  if (!session) return;

  const pane = collectPanes(session.root).find((item) => item.id === paneId);
  if (!pane) return;

  await chrome.windows.update(pane.windowId, { focused: true });
}
