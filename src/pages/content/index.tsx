import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PrefixOverlay from '@pages/content/PrefixOverlay';
import { loadSettings, usePrefixKeys } from '@src/lib/prefixKeys';
import { DEFAULT_SETTINGS } from '@src/lib/types';
import '@assets/styles/tailwind.css';
import './style.css';

function ContentApp() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { prefixActive } = usePrefixKeys(settings);

  useEffect(() => {
    loadSettings().then(setSettings);

    const handleStorage = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.settings) loadSettings().then(setSettings);
    };

    chrome.storage.onChanged.addListener(handleStorage);
    return () => chrome.storage.onChanged.removeListener(handleStorage);
  }, []);

  return <PrefixOverlay active={prefixActive} settings={settings} />;
}

const div = document.createElement('div');
div.id = '__tmuxtabs_root';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__tmuxtabs_root');
if (!rootContainer) throw new Error("Can't find content root element");

const root = createRoot(rootContainer);
root.render(<ContentApp />);
