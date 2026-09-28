import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../apps/desktop/src/renderer/src/App';
import '../../apps/desktop/src/renderer/src/styles.css';
import '../../apps/desktop/src/renderer/src/workspace-shell.css';
import { previewCompanyDetails, previewDataConnection } from './companyDetailsFixture';

// Development-only bridge. The production renderer always uses Electron preload.
const invoke = async (method: string, ...args: unknown[]) => {
  const response = await fetch('/__review_preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, args }) });
  if (!response.ok) throw new Error('Preview request failed');
  return response.json();
};
Object.assign(window, { thesisInvesting: {
  platform: 'preview',
  dataConnection: previewDataConnection,
  companyDetails: previewCompanyDetails(id => invoke('theses.getById', id)),
  dashboardSummaries: { get: () => invoke('summary.get') },
  watchlist: { list: () => invoke('watchlist.list'), save: (...args: unknown[]) => invoke('watchlist.save', ...args), remove: (id: string) => invoke('watchlist.remove', id) },
  thesisNotes: { list: () => invoke('notes.list'), save: (...args: unknown[]) => invoke('notes.save', ...args) },
  reminders: { list: () => invoke('reminders.list'), save: (...args: unknown[]) => invoke('reminders.save', ...args), remove: (id: string) => invoke('reminders.remove', id) },
  portfolioRanker: { list: () => invoke('ranker.list'), save: (...args: unknown[]) => invoke('ranker.save', ...args), remove: (id: string) => invoke('ranker.remove', id) },
  mbsScoreSnapshots: { list: () => invoke('scores.list'), save: (...args: unknown[]) => invoke('scores.save', ...args) },
  thesisHistory: { get: (thesisId: string) => invoke('history.get', thesisId) },
  reviewQueue: { get: (today: string) => invoke('reviewQueue.get', today) },
  decisions: { list: (thesisId: string) => invoke('decisions.list', thesisId), listCompletedReviews: (thesisId: string) => invoke('decisions.listCompletedReviews', thesisId), create: (...args: unknown[]) => invoke('decisions.create', ...args) },
  livingTheses: { list: () => invoke('theses.list'), getById: (id: string) => invoke('theses.getById', id), create: (...args: unknown[]) => invoke('theses.create', ...args), update: (...args: unknown[]) => invoke('theses.update', ...args) },
  reviewSessions: { getActive: (id: string) => invoke('reviews.getActive', id), start: (id: string) => invoke('reviews.start', id), resume: (id: string) => invoke('reviews.resume', id), saveDraft: (...args: unknown[]) => invoke('reviews.saveDraft', ...args), complete: (...args: unknown[]) => invoke('reviews.complete', ...args) }
} });
localStorage.setItem('thesis-investing:onboarding-completed', 'true');
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
