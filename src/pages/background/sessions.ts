import type { ExtensionSettings, LegacyExtensionSettings, Session, SessionState } from '@src/lib/types';
import { STORAGE_KEYS } from '@src/lib/types';
import { normalizeSettings } from '@src/lib/keybindings';
import {
  collectPanes,
  createPane,
  createSession,
  findPaneByWindowId,
  removePaneFromTree,
  splitPaneInTree,
  syncPaneTabs,
} from '@src/lib/paneTree';
import { broadcastSessionUpdate } from '@src/lib/messaging';

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return normalizeSettings(result[STORAGE_KEYS.settings] as LegacyExtensionSettings | undefined);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

export async function loadSessionState(): Promise<SessionState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.sessionState);
  const stored = result[STORAGE_KEYS.sessionState] as SessionState | undefined;
  if (stored) return stored;
  return { activeSessionId: null, sessions: [], focusCycleIndex: 0 };
}

async function persistSessionState(state: SessionState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.sessionState]: state });
}

export async function getActiveSession(state: SessionState): Promise<Session | null> {
  if (!state.activeSessionId) return null;
  return state.sessions.find((session) => session.id === state.activeSessionId) ?? null;
}

async function syncWindowTabs(session: Session): Promise<Session> {
  let root = session.root;
  const panes = collectPanes(root);

  for (const pane of panes) {
    if (pane.children?.length) continue;
    try {
      const tabs = await chrome.tabs.query({ windowId: pane.windowId });
      root = syncPaneTabs(root, pane.windowId, tabs.map((tab) => tab.id!).filter(Boolean));
    } catch {
      root = removePaneFromTree(root, pane.windowId) ?? root;
    }
  }

  return { ...session, root };
}

export async function ensureActiveSession(windowId: number): Promise<{ state: SessionState; session: Session }> {
  const state = await loadSessionState();
  let session = await getActiveSession(state);

  if (session) {
    session = await syncWindowTabs(session);
    const updatedSessions = state.sessions.map((item) => (item.id === session!.id ? session! : item));
    const nextState = { ...state, sessions: updatedSessions };
    await persistSessionState(nextState);
    return { state: nextState, session };
  }

  const tabs = await chrome.tabs.query({ windowId });
  const root = createPane(
    windowId,
    tabs.map((tab) => tab.id!).filter(Boolean),
  );
  session = createSession('default', root);
  const nextState: SessionState = {
    activeSessionId: session.id,
    sessions: [session],
    focusCycleIndex: 0,
  };
  await persistSessionState(nextState);
  return { state: nextState, session };
}

export async function updateSession(session: Session, state: SessionState): Promise<SessionState> {
  const sessions = state.sessions.map((item) => (item.id === session.id ? session : item));
  const nextState = { ...state, sessions };
  await persistSessionState(nextState);
  broadcastSessionUpdate(session, sessions);
  return nextState;
}

export async function splitSessionPane(
  session: Session,
  state: SessionState,
  windowId: number,
  newWindowId: number,
  movedTabId: number,
  direction: 'vertical' | 'horizontal',
): Promise<SessionState> {
  const updatedRoot = splitPaneInTree(session.root, windowId, newWindowId, [movedTabId], direction);
  const updatedSession = await syncWindowTabs({ ...session, root: updatedRoot });
  return updateSession(updatedSession, state);
}

export async function removeWindowFromSession(
  session: Session,
  state: SessionState,
  windowId: number,
): Promise<SessionState> {
  const updatedRoot = removePaneFromTree(session.root, windowId);
  if (!updatedRoot) {
    const sessions = state.sessions.filter((item) => item.id !== session.id);
    const nextState: SessionState = {
      activeSessionId: sessions[0]?.id ?? null,
      sessions,
      focusCycleIndex: 0,
    };
    await persistSessionState(nextState);
    broadcastSessionUpdate(sessions[0] ?? null, sessions);
    return nextState;
  }

  const updatedSession = await syncWindowTabs({ ...session, root: updatedRoot });
  return updateSession(updatedSession, state);
}

export function findSessionPane(session: Session, windowId: number) {
  return findPaneByWindowId(session.root, windowId);
}
