import type { BackgroundRequest, BackgroundResponse } from '@src/lib/messaging';
import { isBackgroundRequest } from '@src/lib/messaging';
import {
  closeTabInPane,
  createTabInPane,
  focusNextPane,
  focusPaneById,
  focusPaneDirection,
  splitTab,
} from '@pages/background/splits';
import {
  getActiveSession,
  loadSessionState,
  loadSettings,
  removeWindowFromSession,
  saveSettings,
} from '@pages/background/sessions';

async function handleRequest(message: BackgroundRequest): Promise<BackgroundResponse> {
  try {
    switch (message.type) {
      case 'SPLIT':
        await splitTab(message.tabId, message.direction);
        return { type: 'ACTION_COMPLETE' };
      case 'FOCUS_NEXT_PANE':
        await focusNextPane(message.tabId);
        return { type: 'ACTION_COMPLETE' };
      case 'FOCUS_PANE_DIRECTION':
        await focusPaneDirection(message.tabId, message.direction);
        return { type: 'ACTION_COMPLETE' };
      case 'NEW_TAB':
        await createTabInPane(message.tabId);
        return { type: 'ACTION_COMPLETE' };
      case 'CLOSE_TAB':
        await closeTabInPane(message.tabId);
        return { type: 'ACTION_COMPLETE' };
      case 'FOCUS_PANE':
        await focusPaneById(message.paneId);
        return { type: 'ACTION_COMPLETE' };
      case 'GET_SESSION_STATE': {
        const settings = await loadSettings();
        const state = await loadSessionState();
        const session = await getActiveSession(state);
        return { type: 'SESSION_STATE', session, sessions: state.sessions, settings };
      }
      case 'GET_SETTINGS': {
        const settings = await loadSettings();
        return { type: 'SETTINGS', settings };
      }
      case 'SAVE_SETTINGS':
        await saveSettings(message.settings);
        return { type: 'ACTION_COMPLETE' };
      default:
        return { type: 'ERROR', message: 'Unknown request' };
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown error';
    return { type: 'ERROR', message: messageText };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isBackgroundRequest(message)) return false;

  handleRequest(message).then(sendResponse);
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'enter-prefix-mode') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'ENTER_PREFIX_MODE' }).catch(async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/newtab/index.html') });
  });
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const state = await loadSessionState();
  const session = await getActiveSession(state);
  if (!session) return;

  await removeWindowFromSession(session, state, windowId);
});

console.log('TmuxTabs background loaded');
