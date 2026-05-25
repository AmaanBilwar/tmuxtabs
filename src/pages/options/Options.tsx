import { useEffect, useState } from 'react';
import { sendToBackground } from '@src/lib/messaging';
import type { CommandBindings, ExtensionSettings, KeyChord } from '@src/lib/types';
import { DEFAULT_SETTINGS } from '@src/lib/types';
import KeyCaptureInput from '@src/components/KeyCaptureInput';
import { COMMAND_LABELS, formatChord, formatPrefixCommand } from '@src/lib/keybindings';

export default function Options() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sendToBackground({ type: 'GET_SETTINGS' }).then((response) => {
      if (response.type === 'SETTINGS') setSettings(response.settings);
    });
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendToBackground({ type: 'SAVE_SETTINGS', settings });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const updateCommand = (key: keyof CommandBindings, value: string) => {
    setSettings({
      ...settings,
      commands: { ...settings.commands, [key]: value },
    });
  };

  const updatePrefix = (value: string | KeyChord) => {
    setSettings({ ...settings, prefix: value as KeyChord });
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-2xl font-bold text-emerald-400">TmuxTabs Settings</h1>
        <p className="mb-8 text-sm text-zinc-400">
          Customize your prefix chord and command keys. Default prefix is Ctrl+Space to avoid
          conflicting with browser bookmarks (Ctrl+B).
        </p>

        <form onSubmit={handleSave} className="space-y-8">
          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-semibold">Prefix key</h2>
            <KeyCaptureInput
              mode="prefix"
              label="Prefix chord"
              description="Press a key combination (must include Ctrl, Alt, or Meta). Example: Ctrl+Space"
              value={settings.prefix}
              onChange={updatePrefix}
            />

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Prefix timeout (ms)</span>
              <input
                type="number"
                min={500}
                max={5000}
                step={100}
                value={settings.prefixTimeoutMs}
                onChange={(event) =>
                  setSettings({ ...settings, prefixTimeoutMs: Number(event.target.value) })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-semibold">Command keys</h2>
            <p className="text-xs text-zinc-500">
              Single keys pressed after the prefix. Current prefix:{' '}
              <kbd className="font-mono text-emerald-400">{formatChord(settings.prefix)}</kbd>
            </p>

            {COMMAND_LABELS.map(({ key, label, description }) => (
              <KeyCaptureInput
                key={key}
                mode="command"
                label={label}
                description={description}
                value={settings.commands[key]}
                onChange={(value) => updateCommand(key, value as string)}
              />
            ))}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="mb-3 text-lg font-semibold">Preview</h2>
            <ul className="space-y-1 text-sm text-zinc-400">
              {COMMAND_LABELS.map(({ key, label }) => (
                <li key={key}>
                  <kbd className="font-mono text-emerald-400">
                    {formatPrefixCommand(settings.prefix, settings.commands[key])}
                  </kbd>
                  <span className="ml-2">— {label.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Save settings
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Reset to defaults
            </button>
          </div>

          {saved && <p className="text-sm text-emerald-400">Settings saved. Reload open tabs for changes to take effect.</p>}
        </form>
      </div>
    </div>
  );
}
