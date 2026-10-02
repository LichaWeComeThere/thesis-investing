import { createServer } from 'vite';
import console from 'node:console';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { mkdirSync } from 'node:fs';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const previewRoot = resolve(repoRoot, 'tools/review-preview');
// An ignored, separate example database. Never use the desktop userData path.
const dataDirectory = resolve(repoRoot, 'node_modules/.cache/review-preview');
mkdirSync(dataDirectory, { recursive: true });
const filename = resolve(dataDirectory, 'example.sqlite');
let reviews;
let theses;
let decisions;
let history;
let reviewQueue;
const toolServices = {};
const server = await createServer({
  configFile: false, root: previewRoot,
  resolve: { alias: {
    '@thesis-investing/core': resolve(repoRoot, 'packages/core/src/index.ts'),
    '@thesis-investing/ui': resolve(repoRoot, 'packages/ui/src/index.ts'),
    react: resolve(appRoot, 'node_modules/react'),
    'react-dom': resolve(appRoot, 'node_modules/react-dom')
  } },
  plugins: [react(), { name: 'review-preview-bridge', configureServer(vite) {
    vite.middlewares.use('/__review_preview', async (request, response) => {
      if (request.method !== 'POST' || !request.headers['content-type']?.startsWith('application/json')) { response.statusCode = 405; response.end(); return; }
      // Only same-origin preview requests; no production IPC or general-purpose invocation.
      if (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host) { response.statusCode = 403; response.end(); return; }
      try {
        let body = '';
        for await (const part of request) { body += part; if (body.length > 2000000) throw new Error('Too large'); }
        const { method, args } = JSON.parse(body);
        const handlers = {
          'summary.get': () => toolServices.dashboard.get(),
          'reviewQueue.get': (...input) => reviewQueue.get(...input),
          'watchlist.list': () => toolServices.watchlist.list(),
          'watchlist.save': (...input) => toolServices.watchlist.save(...input),
          'watchlist.remove': (...input) => toolServices.watchlist.remove(...input),
          'notes.list': () => toolServices.notes.list(),
          'notes.save': (...input) => toolServices.notes.save(...input),
          'reminders.list': () => toolServices.reminders.list(),
          'reminders.save': (...input) => toolServices.reminders.save(...input),
          'reminders.remove': (...input) => toolServices.reminders.remove(...input),
          'ranker.list': () => toolServices.ranker.list(),
          'ranker.save': (...input) => toolServices.ranker.save(...input),
          'ranker.remove': (...input) => toolServices.ranker.remove(...input),
          'scores.list': () => toolServices.scores.list(),
          'scores.save': (...input) => toolServices.scores.save(...input),
          'theses.list': () => theses.list(), 'theses.getById': (...input) => theses.getById(...input), 'theses.create': (...input) => theses.create(...input), 'theses.update': (...input) => theses.update(...input), 'reviews.getActive': (...input) => reviews.getActive(...input), 'reviews.start': (...input) => reviews.start(...input), 'reviews.resume': (...input) => reviews.resume(...input), 'reviews.saveDraft': (...input) => reviews.saveDraft(...input), 'reviews.complete': (...input) => reviews.complete(...input), 'decisions.list': (...input) => decisions.list(...input), 'decisions.listCompletedReviews': (...input) => decisions.listCompletedReviews(...input), 'decisions.create': (...input) => decisions.create(...input), 'history.get': (...input) => history.get(...input) };
        if (!Object.hasOwn(handlers, method) || !Array.isArray(args)) throw new Error('Invalid');
        const result = await handlers[method](...args);
        response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(result));
      } catch { response.statusCode = 400; response.end(JSON.stringify({ ok: false, errors: ['Preview request failed.'] })); }
    });
  } }],
  server: { host: process.env.THESIS_PREVIEW_HOST || '127.0.0.1', port: 4173, strictPort: true, allowedHosts: ['terminal.local'], fs: { allow: [repoRoot] } }
});
const { createSqliteStorage } = await server.ssrLoadModule(resolve(appRoot, 'src/storage/sqlite.ts'));
const { createReviewSessionStorageService } = await server.ssrLoadModule(resolve(appRoot, 'src/main/reviewSessionStorageService.ts'));
const { createReviewSessionsIpcHandlers } = await server.ssrLoadModule(resolve(appRoot, 'src/main/reviewSessionsIpcHandlers.ts'));
const { createLivingThesesStorageService } = await server.ssrLoadModule(resolve(appRoot, 'src/main/livingThesesStorageService.ts'));
const { createDecisionsStorageService } = await server.ssrLoadModule(resolve(appRoot, 'src/main/decisionsStorageService.ts'));
const { createDecisionsIpcHandlers } = await server.ssrLoadModule(resolve(appRoot, 'src/main/decisionsIpcHandlers.ts'));
const { createThesisHistoryStorageService } = await server.ssrLoadModule(resolve(appRoot, 'src/main/thesisHistoryStorageService.ts'));
const { createThesisHistoryIpcHandlers } = await server.ssrLoadModule(resolve(appRoot, 'src/main/thesisHistoryIpcHandlers.ts'));
const { createReviewQueueStorageService } = await server.ssrLoadModule(resolve(appRoot, 'src/main/reviewQueueStorageService.ts'));
const { createReviewQueueIpcHandlers } = await server.ssrLoadModule(resolve(appRoot, 'src/main/reviewQueueIpcHandlers.ts'));
const reviewQueueService = createReviewQueueStorageService(() => createSqliteStorage({ filename }));
reviewQueue = createReviewQueueIpcHandlers(reviewQueueService);
const historyService = createThesisHistoryStorageService(() => createSqliteStorage({ filename }));
history = createThesisHistoryIpcHandlers(historyService);
const reviewService = createReviewSessionStorageService(() => createSqliteStorage({ filename }));
const decisionService = createDecisionsStorageService(() => createSqliteStorage({ filename }));
reviews = createReviewSessionsIpcHandlers(reviewService);
decisions = createDecisionsIpcHandlers(decisionService);
theses = createLivingThesesStorageService(() => createSqliteStorage({ filename }));
// Exercise the existing local-storage contracts with this isolated example file.
for (const [key, file, factory] of [
  ['dashboard', 'dashboardSummariesStorageService', 'createSqliteDashboardSummariesStorageService'],
  ['watchlist', 'watchlistStorageService', 'createSqliteWatchlistStorageService'],
  ['notes', 'thesisNotesStorageService', 'createSqliteThesisNotesStorageService'],
  ['reminders', 'remindersStorageService', 'createSqliteRemindersStorageService'],
  ['ranker', 'portfolioRankerStorageService', 'createSqlitePortfolioRankerStorageService'],
  ['scores', 'mbsScoreSnapshotsStorageService', 'createSqliteMbsScoreSnapshotsStorageService']
]) {
  const module = await server.ssrLoadModule(resolve(appRoot, `src/main/${file}.ts`));
  toolServices[key] = module[factory](filename);
}
const existing = await theses.list();
if (!existing.ok) throw new Error('Could not load the example database');
if (existing.value.length === 0) {
  const created = await theses.create({ entityName: 'Acme Research', ticker: 'ACME', title: 'Durable execution', summary: 'Recurring revenue and disciplined reinvestment support steady growth.', lifecycle: 'active', conviction: 'medium', riskLevel: 'low', risks: [], catalysts: [] });
  if (!created.ok) throw new Error('Could not create the example thesis');
}
await server.listen();
console.log('Guided review example workspace is ready.');
async function close() { await server.close(); await reviewService.close(); await decisionService.close(); await historyService.close(); await reviewQueueService.close(); await theses.close(); await Promise.all(Object.values(toolServices).map((service) => service.close())); process.exit(0); }
process.on('SIGTERM', close); process.on('SIGINT', close);
