import type { ExtensionSettings } from '@src/lib/types';
import { formatChord, getBindingHints } from '@src/lib/keybindings';

type PrefixOverlayProps = {
  active: boolean;
  settings: ExtensionSettings;
};

export default function PrefixOverlay({ active, settings }: PrefixOverlayProps) {
  if (!active) return null;

  const hints = getBindingHints(settings.commands);

  return (
    <div className="fixed bottom-4 left-1/2 z-[2147483647] -translate-x-1/2 rounded-lg border border-emerald-500/40 bg-zinc-900/95 px-4 py-3 text-sm text-zinc-100 shadow-2xl backdrop-blur">
      <div className="mb-2 font-semibold text-emerald-400">
        tmux mode — {formatChord(settings.prefix)} prefix active
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-300">
        {hints.map((hint) => (
          <div key={hint.label}>
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-emerald-300">{hint.keys}</kbd>
            <span className="ml-2">{hint.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-zinc-500">Esc to cancel</div>
    </div>
  );
}
