import type { ExtensionSettings, FocusDirection, Session, SplitDirection } from '@src/lib/types';

export type BackgroundRequest =
  | { type: 'SPLIT'; direction: SplitDirection; tabId: number }
  | { type: 'FOCUS_NEXT_PANE'; tabId: number }
  | { type: 'FOCUS_PANE_DIRECTION'; direction: FocusDirection; tabId: number }
  | { type: 'NEW_TAB'; tabId: number }
  | { type: 'CLOSE_TAB'; tabId: number }
  | { type: 'GET_SESSION_STATE' }
  | { type: 'FOCUS_PANE'; paneId: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: ExtensionSettings };

export type BackgroundResponse =
  | { type: 'SESSION_STATE'; session: Session | null; sessions: Session[]; settings: ExtensionSettings }
  | { type: 'SETTINGS'; settings: ExtensionSettings }
  | { type: 'ACTION_COMPLETE' }
  | { type: 'ERROR'; message: string };

export type BroadcastMessage = {
  type: 'SESSION_UPDATED';
  session: Session | null;
  sessions: Session[];
};

export type ContentMessage = { type: 'ENTER_PREFIX_MODE' };

export function isBackgroundRequest(message: unknown): message is BackgroundRequest {
  return typeof message === 'object' && message !== null && 'type' in message;
}

export async function sendToBackground(
  message: BackgroundRequest,
): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(message);
}

export function broadcastSessionUpdate(session: Session | null, sessions: Session[]) {
  const payload: BroadcastMessage = { type: 'SESSION_UPDATED', session, sessions };
  chrome.runtime.sendMessage(payload).catch(() => {});
}
