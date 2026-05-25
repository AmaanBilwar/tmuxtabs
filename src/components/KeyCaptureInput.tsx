import { useEffect, useState } from 'react';
import type { KeyChord } from '@src/lib/types';
import {
  chordFromEvent,
  isModifierOnlyEvent,
  isValidCommandKey,
  isValidPrefixChord,
} from '@src/lib/keybindings';

type KeyCaptureInputProps = {
  value: string | KeyChord;
  onChange: (value: string | KeyChord) => void;
  mode: 'prefix' | 'command';
  label: string;
  description?: string;
};

function displayValue(value: string | KeyChord, mode: 'prefix' | 'command'): string {
  if (mode === 'command') {
    const key = value as string;
    if (!key) return 'Click to bind';
    if (key === 'Space') return 'Space';
    if (key.startsWith('Arrow')) return key.replace('Arrow', '');
    return key;
  }

  const chord = value as KeyChord;
  if (!chord?.key) return 'Click to bind';
  const parts: string[] = [];
  if (chord.ctrl) parts.push('Ctrl');
  if (chord.alt) parts.push('Alt');
  if (chord.shift) parts.push('Shift');
  if (chord.meta) parts.push('Meta');
  parts.push(chord.key === 'Space' ? 'Space' : chord.key);
  return parts.join('+');
}

export default function KeyCaptureInput({
  value,
  onChange,
  mode,
  label,
  description,
}: KeyCaptureInputProps) {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (isModifierOnlyEvent(event)) return;

      if (mode === 'prefix') {
        const chord = chordFromEvent(event);
        if (!isValidPrefixChord(chord)) return;
        onChange(chord);
        setRecording(false);
        return;
      }

      const key = event.key === ' ' ? 'Space' : event.key;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (!isValidCommandKey(key)) return;
      onChange(key);
      setRecording(false);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [mode, onChange, recording]);

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {description && <span className="mb-2 block text-xs text-zinc-500">{description}</span>}
      <button
        type="button"
        onClick={() => setRecording(true)}
        onBlur={() => setRecording(false)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-left font-mono text-sm outline-none hover:border-zinc-600 focus:border-emerald-500"
      >
        {recording ? (
          <span className="text-emerald-400">Press a key…</span>
        ) : (
          displayValue(value, mode)
        )}
      </button>
    </label>
  );
}
