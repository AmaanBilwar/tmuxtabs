import { useCallback, useEffect, useState } from 'react';
import type { PaneNode, Session } from '@src/lib/types';
import { sendToBackground } from '@src/lib/messaging';
import PrefixOverlay from '@pages/content/PrefixOverlay';
import { loadSettings, usePrefixKeys } from '@src/lib/prefixKeys';
import { DEFAULT_SETTINGS } from '@src/lib/types';
import { COMMAND_LABELS, formatChord, formatPrefixCommand } from '@src/lib/keybindings';

type TabInfo = {
  id: number;
  title: string;
  url: string;
};

function PaneTreeNode({
  pane,
  depth,
  onFocusPane,
}: {
  pane: PaneNode;
  depth: number;
  onFocusPane: (paneId: string) => void;
}) {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const isSplit = Boolean(pane.children?.length);

  useEffect(() => {
    if (isSplit || pane.tabIds.length === 0) {
      setTabs([]);
      return;
    }

    Promise.all(
      pane.tabIds.map(async (tabId) => {
        try {
          const tab = await chrome.tabs.get(tabId);
          return { id: tab.id!, title: tab.title || 'Untitled', url: tab.url || '' };
        } catch {
          return null;
        }
      }),
    ).then((results) => setTabs(results.filter((tab): tab is TabInfo => tab !== null)));
  }, [isSplit, pane.tabIds]);

  const paddingLeft = `${depth * 1.25}rem`;

  if (isSplit) {
    return (
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500" style={{ paddingLeft }}>
          split {pane.splitDirection} — window {pane.windowId}
        </div>
        {pane.children!.map((child) => (
          <PaneTreeNode key={child.id} pane={child} depth={depth + 1} onFocusPane={onFocusPane} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 transition hover:border-emerald-500/50"
      style={{ marginLeft: paddingLeft }}
    >
      <button
        type="button"
        onClick={() => onFocusPane(pane.id)}
        className="mb-2 text-left text-sm font-medium text-emerald-400 hover:text-emerald-300"
      >
        Pane — window {pane.windowId}
      </button>
      <ul className="space-y-1">
        {tabs.map((tab) => (
          <li key={tab.id} className="truncate text-xs text-zinc-400">
            {tab.title}
          </li>
        ))}
        {tabs.length === 0 && <li className="text-xs text-zinc-600">No tabs</li>}
      </ul>
    </div>
  );
}

export default function Newtab() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { prefixActive } = usePrefixKeys(settings);

  const refreshState = useCallback(async () => {
    const response = await sendToBackground({ type: 'GET_SESSION_STATE' });
    if (response.type === 'SESSION_STATE') {
      setSession(response.session);
      setSessions(response.sessions);
      setSettings(response.settings);
    }
  }, []);

  useEffect(() => {
    refreshState();
    loadSettings().then(setSettings);

    const handleMessage = (message: { type?: string; session?: Session | null; sessions?: Session[] }) => {
      if (message.type === 'SESSION_UPDATED') {
        setSession(message.session ?? null);
        setSessions(message.sessions ?? []);
      }
    };

    const handleStorage = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.sessionState) refreshState();
      if (changes.settings) loadSettings().then(setSettings);
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.storage.onChanged.addListener(handleStorage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.storage.onChanged.removeListener(handleStorage);
    };
  }, [refreshState]);

  const handleFocusPane = async (paneId: string) => {
    await sendToBackground({ type: 'FOCUS_PANE', paneId });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-400">TmuxTabs</h1>
          <p className="mt-2 text-zinc-400">
            Use{' '}
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm">{formatChord(settings.prefix)}</kbd>
            {' '}then{' '}
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm">{settings.commands.splitVertical}</kbd> or{' '}
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm">{settings.commands.splitHorizontal}</kbd>
            {' '}to split windows.{' '}
            <a
              href={chrome.runtime.getURL('src/pages/options/index.html')}
              className="text-emerald-400 hover:text-emerald-300"
            >
              Customize keybinds
            </a>
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="mb-3 text-lg font-semibold">Active session</h2>
          {session ? (
            <div>
              <p className="mb-4 text-sm text-zinc-400">{session.name}</p>
              <PaneTreeNode pane={session.root} depth={0} onFocusPane={handleFocusPane} />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No active session yet. Open a page and press{' '}
              {formatPrefixCommand(settings.prefix, settings.commands.splitVertical)} to create your first split.
            </p>
          )}
        </section>

        {sessions.length > 1 && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-3 text-lg font-semibold">All sessions</h2>
            <ul className="space-y-1 text-sm text-zinc-400">
              {sessions.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="mb-3 text-lg font-semibold">Keybindings</h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400">
            {COMMAND_LABELS.map(({ key, label }) => (
              <div key={key}>
                <kbd className="font-mono text-emerald-400">
                  {formatPrefixCommand(settings.prefix, settings.commands[key])}
                </kbd>
                {' '}— {label.toLowerCase()}
              </div>
            ))}
            <div><kbd className="font-mono text-emerald-400">Ctrl+Shift+B</kbd> — enter prefix mode (fallback)</div>
          </div>
        </section>
      </div>

      <PrefixOverlay active={prefixActive} settings={settings} />
    </div>
  );
}
