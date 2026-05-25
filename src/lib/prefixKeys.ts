import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommandBindings, ExtensionSettings } from '@src/lib/types';
import { sendToBackground } from '@src/lib/messaging';
import { DEFAULT_SETTINGS } from '@src/lib/types';
import { getBindingHints, matchesChord, normalizeSettings } from '@src/lib/keybindings';

export type PrefixAction =
  | { action: 'split'; direction: 'vertical' | 'horizontal' }
  | { action: 'newTab' }
  | { action: 'closeTab' }
  | { action: 'focusNext' }
  | { action: 'focusDirection'; direction: 'left' | 'right' | 'up' | 'down' }
  | { action: 'cancel' };

function buildCommandMap(commands: CommandBindings): Record<string, PrefixAction> {
  return {
    [commands.splitVertical]: { action: 'split', direction: 'vertical' },
    [commands.splitHorizontal]: { action: 'split', direction: 'horizontal' },
    [commands.newTab]: { action: 'newTab' },
    [commands.closeTab]: { action: 'closeTab' },
    [commands.focusNext]: { action: 'focusNext' },
    [commands.focusLeft]: { action: 'focusDirection', direction: 'left' },
    [commands.focusRight]: { action: 'focusDirection', direction: 'right' },
    [commands.focusUp]: { action: 'focusDirection', direction: 'up' },
    [commands.focusDown]: { action: 'focusDirection', direction: 'down' },
  };
}

export function getPrefixHints(settings: ExtensionSettings) {
  return getBindingHints(settings.commands);
}

async function executeAction(action: PrefixAction): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (!tabId) return;

  switch (action.action) {
    case 'split':
      await sendToBackground({ type: 'SPLIT', direction: action.direction, tabId });
      break;
    case 'newTab':
      await sendToBackground({ type: 'NEW_TAB', tabId });
      break;
    case 'closeTab':
      await sendToBackground({ type: 'CLOSE_TAB', tabId });
      break;
    case 'focusNext':
      await sendToBackground({ type: 'FOCUS_NEXT_PANE', tabId });
      break;
    case 'focusDirection':
      await sendToBackground({ type: 'FOCUS_PANE_DIRECTION', direction: action.direction, tabId });
      break;
    case 'cancel':
      break;
  }
}

export function usePrefixKeys(settings: ExtensionSettings) {
  const [prefixActive, setPrefixActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const commandMap = useMemo(() => buildCommandMap(settings.commands), [settings.commands]);

  const clearPrefixTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const exitPrefixMode = useCallback(() => {
    clearPrefixTimeout();
    setPrefixActive(false);
  }, [clearPrefixTimeout]);

  const enterPrefixMode = useCallback(() => {
    clearPrefixTimeout();
    setPrefixActive(true);
    timeoutRef.current = window.setTimeout(() => {
      setPrefixActive(false);
      timeoutRef.current = null;
    }, settings.prefixTimeoutMs);
  }, [clearPrefixTimeout, settings.prefixTimeoutMs]);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (prefixActive) {
        if (event.key === 'Escape') {
          event.preventDefault();
          exitPrefixMode();
          return;
        }

        const binding = commandMap[event.key];
        if (binding) {
          event.preventDefault();
          event.stopPropagation();
          exitPrefixMode();
          await executeAction(binding);
        }
        return;
      }

      if (matchesChord(event, settings.prefix)) {
        event.preventDefault();
        event.stopPropagation();
        enterPrefixMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [commandMap, enterPrefixMode, exitPrefixMode, prefixActive, settings.prefix]);

  useEffect(() => {
    const handleMessage = (message: { type?: string }) => {
      if (message.type === 'ENTER_PREFIX_MODE') {
        enterPrefixMode();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [enterPrefixMode]);

  useEffect(() => {
    const handleStorage = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.settings) {
        // Parent components reload settings; prefix listener uses latest props via deps.
      }
    };
    chrome.storage.onChanged.addListener(handleStorage);
    return () => chrome.storage.onChanged.removeListener(handleStorage);
  }, []);

  return { prefixActive, enterPrefixMode, exitPrefixMode };
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const response = await sendToBackground({ type: 'GET_SETTINGS' });
  if (response.type === 'SETTINGS') return response.settings;
  return DEFAULT_SETTINGS;
}

export { normalizeSettings };
