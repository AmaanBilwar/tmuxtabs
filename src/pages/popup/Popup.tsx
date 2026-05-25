import { useEffect, useState } from 'react';
import { sendToBackground } from '@src/lib/messaging';
import type { ExtensionSettings, Session } from '@src/lib/types';
import { DEFAULT_SETTINGS } from '@src/lib/types';
import { formatChord } from '@src/lib/keybindings';

export default function Popup() {
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    sendToBackground({ type: 'GET_SESSION_STATE' }).then((response) => {
      if (response.type === 'SESSION_STATE') {
        setSession(response.session);
        setSettings(response.settings);
      }
    });
  }, []);

  return (
    <div className="w-72 bg-zinc-950 p-4 text-zinc-100">
      <h1 className="text-lg font-bold text-emerald-400">TmuxTabs</h1>
      <p className="mt-2 text-xs text-zinc-400">
        Press{' '}
        <kbd className="font-mono text-emerald-300">{formatChord(settings.prefix)}</kbd>
        {' '}then{' '}
        <kbd className="font-mono">{settings.commands.splitVertical}</kbd> or{' '}
        <kbd className="font-mono">{settings.commands.splitHorizontal}</kbd> to split.
      </p>
      <p className="mt-3 text-sm text-zinc-300">
        Session: {session?.name ?? 'none'}
      </p>
      <div className="mt-3 flex flex-col gap-1 text-sm">
        <a
          href={chrome.runtime.getURL('src/pages/newtab/index.html')}
          className="text-emerald-400 hover:text-emerald-300"
        >
          Open dashboard
        </a>
        <a
          href={chrome.runtime.getURL('src/pages/options/index.html')}
          className="text-emerald-400 hover:text-emerald-300"
        >
          Customize keybinds
        </a>
      </div>
    </div>
  );
}
