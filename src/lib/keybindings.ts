import type { CommandBindings, ExtensionSettings, KeyChord, LegacyExtensionSettings } from '@src/lib/types';
import { DEFAULT_COMMAND_BINDINGS, DEFAULT_SETTINGS } from '@src/lib/types';

export function normalizeKey(key: string): string {
  if (key === ' ') return 'Space';
  return key;
}

export function eventToKey(event: KeyboardEvent): string {
  return normalizeKey(event.key);
}

export function chordFromEvent(event: KeyboardEvent): KeyChord {
  return {
    key: eventToKey(event),
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
}

export function matchesChord(event: KeyboardEvent, chord: KeyChord): boolean {
  return (
    event.ctrlKey === chord.ctrl &&
    event.altKey === chord.alt &&
    event.shiftKey === chord.shift &&
    event.metaKey === chord.meta &&
    eventToKey(event).toLowerCase() === chord.key.toLowerCase()
  );
}

export function formatKeyLabel(key: string): string {
  if (key === 'Space') return 'Space';
  if (key.startsWith('Arrow')) return key.replace('Arrow', '');
  if (key === '"') return '"';
  if (key === '%') return '%';
  return key.length === 1 ? key.toUpperCase() : key;
}

export function formatChord(chord: KeyChord): string {
  const parts: string[] = [];
  if (chord.ctrl) parts.push('Ctrl');
  if (chord.alt) parts.push('Alt');
  if (chord.shift) parts.push('Shift');
  if (chord.meta) parts.push('Meta');
  parts.push(formatKeyLabel(chord.key));
  return parts.join('+');
}

export function formatPrefixCommand(prefix: KeyChord, commandKey: string): string {
  return `${formatChord(prefix)} ${formatKeyLabel(commandKey)}`;
}

export function getBindingHints(commands: CommandBindings) {
  return [
    { keys: formatKeyLabel(commands.splitVertical), label: 'split vertical' },
    { keys: formatKeyLabel(commands.splitHorizontal), label: 'split horizontal' },
    { keys: formatKeyLabel(commands.newTab), label: 'new tab' },
    { keys: formatKeyLabel(commands.closeTab), label: 'close tab' },
    { keys: formatKeyLabel(commands.focusNext), label: 'cycle panes' },
    {
      keys: `${formatKeyLabel(commands.focusLeft)}/${formatKeyLabel(commands.focusDown)}/${formatKeyLabel(commands.focusUp)}/${formatKeyLabel(commands.focusRight)}`,
      label: 'focus direction',
    },
  ];
}

export function normalizeSettings(stored: Partial<LegacyExtensionSettings> | undefined): ExtensionSettings {
  if (!stored) return DEFAULT_SETTINGS;

  const prefix = stored.prefix ?? (
    stored.prefixKey
      ? { key: stored.prefixKey, ctrl: true, alt: false, shift: false, meta: false }
      : DEFAULT_SETTINGS.prefix
  );

  const commands = {
    ...DEFAULT_COMMAND_BINDINGS,
    ...stored.commands,
  };

  return {
    prefix,
    commands,
    prefixTimeoutMs: stored.prefixTimeoutMs ?? DEFAULT_SETTINGS.prefixTimeoutMs,
  };
}

export function isModifierOnlyEvent(event: KeyboardEvent): boolean {
  return ['Control', 'Alt', 'Shift', 'Meta'].includes(event.key);
}

export function isValidPrefixChord(chord: KeyChord): boolean {
  return Boolean(chord.key) && (chord.ctrl || chord.alt || chord.meta);
}

export function isValidCommandKey(key: string): boolean {
  return Boolean(key) && key !== 'Escape';
}

export const COMMAND_LABELS: { key: keyof CommandBindings; label: string; description: string }[] = [
  { key: 'splitVertical', label: 'Split vertical', description: 'Tile window to the right' },
  { key: 'splitHorizontal', label: 'Split horizontal', description: 'Tile window below' },
  { key: 'newTab', label: 'New tab', description: 'Open tab in current pane' },
  { key: 'closeTab', label: 'Close tab', description: 'Close the active tab' },
  { key: 'focusNext', label: 'Cycle panes', description: 'Focus next pane' },
  { key: 'focusLeft', label: 'Focus left', description: 'Focus pane to the left' },
  { key: 'focusDown', label: 'Focus down', description: 'Focus pane below' },
  { key: 'focusUp', label: 'Focus up', description: 'Focus pane above' },
  { key: 'focusRight', label: 'Focus right', description: 'Focus pane to the right' },
];
