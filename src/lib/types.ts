export type SplitDirection = 'vertical' | 'horizontal';

export type FocusDirection = 'left' | 'right' | 'up' | 'down';

export type PaneNode = {
  id: string;
  windowId: number;
  tabIds: number[];
  children?: PaneNode[];
  splitDirection?: SplitDirection;
};

export type Session = {
  id: string;
  name: string;
  root: PaneNode;
};

export type KeyModifiers = {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

export type KeyChord = KeyModifiers & {
  key: string;
};

export type CommandBindings = {
  splitVertical: string;
  splitHorizontal: string;
  newTab: string;
  closeTab: string;
  focusNext: string;
  focusLeft: string;
  focusRight: string;
  focusUp: string;
  focusDown: string;
};

export type ExtensionSettings = {
  prefix: KeyChord;
  commands: CommandBindings;
  prefixTimeoutMs: number;
};

/** Legacy shape kept for migration from earlier builds. */
export type LegacyExtensionSettings = ExtensionSettings & {
  prefixKey?: string;
};

export const DEFAULT_COMMAND_BINDINGS: CommandBindings = {
  splitVertical: '%',
  splitHorizontal: '"',
  newTab: 'c',
  closeTab: 'x',
  focusNext: 'o',
  focusLeft: 'h',
  focusRight: 'l',
  focusUp: 'k',
  focusDown: 'j',
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  prefix: { key: 'Space', ctrl: true, alt: false, shift: false, meta: false },
  commands: DEFAULT_COMMAND_BINDINGS,
  prefixTimeoutMs: 1500,
};

export type SessionState = {
  activeSessionId: string | null;
  sessions: Session[];
  focusCycleIndex: number;
};

export const STORAGE_KEYS = {
  sessionState: 'sessionState',
  settings: 'settings',
} as const;
