import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../apps/desktop/src/renderer/src/App';
import '../../apps/desktop/src/renderer/src/styles.css';

// Development-only bridge. The production renderer always uses Electron preload.
const invoke = async (method: string, ...args: unknown[]) => {
  const response = await fetch('/__review_preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, args }) });
  if (!response.ok) throw new Error('Preview request failed');
  return response.json();
};
Object.assign(window, { thesisInvesting: {
  platform: 'preview',
  livingTheses: { list: () => invoke('theses.list'), getById: (id: string) => invoke('theses.getById', id), create: (...args: unknown[]) => invoke('theses.create', ...args), update: (...args: unknown[]) => invoke('theses.update', ...args) },
  reviewSessions: { getActive: (id: string) => invoke('reviews.getActive', id), start: (id: string) => invoke('reviews.start', id), resume: (id: string) => invoke('reviews.resume', id), saveDraft: (...args: unknown[]) => invoke('reviews.saveDraft', ...args), complete: (...args: unknown[]) => invoke('reviews.complete', ...args) }
} });
localStorage.setItem('thesis-investing:onboarding-completed', 'true');
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
