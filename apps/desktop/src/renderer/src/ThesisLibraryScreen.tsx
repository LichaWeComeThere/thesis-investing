import {
  LIVING_THESIS_LIFECYCLES,
  type LivingThesis,
  type LivingThesisLifecycle
} from '@thesis-investing/core';
import { Badge, Button } from '@thesis-investing/ui';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  getDefaultLivingThesesStorageClient,
  type LivingThesesStorageClient
} from './livingThesesStorageClient';
import './thesis-library.css';

export type ThesisLibraryBrowseState = {
  search: string;
  lifecycle: 'all' | LivingThesisLifecycle;
  sort: 'recently-updated' | 'entity' | 'next-review';
};

const DEFAULT_THESIS_LIBRARY_BROWSE_STATE: ThesisLibraryBrowseState = {
  search: '', lifecycle: 'all', sort: 'recently-updated'
};

type ThesisLibraryScreenProps = {
  client?: LivingThesesStorageClient | null;
  browseState?: ThesisLibraryBrowseState;
  onBrowseStateChange?: (state: ThesisLibraryBrowseState) => void;
  onOpenThesis: (target: { thesisId: string; view?: 'history' }) => void;
  onBackToWorkspace: () => void;
  onCreateThesis?: () => void;
};

const lifecycleLabels: Record<LivingThesisLifecycle, string> = {
  draft: 'Draft', active: 'Active', monitoring: 'Monitoring', paused: 'Paused', archived: 'Archived'
};

export function ThesisLibraryScreen({
  client = getDefaultLivingThesesStorageClient(),
  browseState,
  onBrowseStateChange,
  onOpenThesis,
  onBackToWorkspace,
  onCreateThesis
}: ThesisLibraryScreenProps): JSX.Element {
  const [localBrowseState, setLocalBrowseState] = useState(DEFAULT_THESIS_LIBRARY_BROWSE_STATE);
  const browse = browseState ?? localBrowseState;
  const [theses, setTheses] = useState<LivingThesis[] | null>(null);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(Boolean(client));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const requestId = useRef(0);
  const headingId = useId();
  const resultsId = useId();

  const changeBrowse = (changes: Partial<ThesisLibraryBrowseState>): void => {
    const next = { ...browse, ...changes };
    if (browseState === undefined) setLocalBrowseState(next);
    onBrowseStateChange?.(next);
  };

  const clearFilters = (): void => {
    changeBrowse({ search: '', lifecycle: 'all' });
    searchRef.current?.focus();
  };

  const refresh = useCallback(async (): Promise<void> => {
    if (!client || !mounted.current) return;
    const request = ++requestId.current;
    setLoading(true);
    try {
      const result = await client.list();
      if (!mounted.current || request !== requestId.current) return;
      if (result.ok) {
        setTheses(result.value);
        setErrors([]);
      } else {
        setErrors(result.errors.length ? result.errors : ['Please try again.']);
      }
    } catch (error: unknown) {
      if (mounted.current && request === requestId.current) {
        setErrors([error instanceof Error ? error.message : 'Please try again.']);
      }
    } finally {
      if (mounted.current && request === requestId.current) setLoading(false);
    }
  }, [client]);

  useEffect(() => { headingRef.current?.focus(); }, []);

  useEffect(() => {
    mounted.current = true;
    setTheses(null);
    setErrors([]);
    setLoading(Boolean(client));
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted.current = false;
      requestId.current += 1;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client, refresh]);

  const visibleTheses = useMemo(() => {
    const terms = browse.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (theses ?? []).filter((thesis) => {
      if (browse.lifecycle !== 'all' && thesis.lifecycle !== browse.lifecycle) return false;
      const searchableText = [thesis.entityName, thesis.ticker, thesis.title, thesis.summary, thesis.theme]
        .filter(Boolean).join(' ').toLowerCase();
      return terms.every((term) => searchableText.includes(term));
    }).sort((left, right) => {
      if (browse.sort === 'recently-updated') {
        const byUpdated = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
        if (byUpdated) return byUpdated;
      }
      if (browse.sort === 'next-review') {
        const byReview = compareText(left.nextReviewAt ?? '9999-99-99', right.nextReviewAt ?? '9999-99-99');
        if (byReview) return byReview;
      }
      return compareText(left.entityName.toLowerCase(), right.entityName.toLowerCase())
        || compareText(left.title.toLowerCase(), right.title.toLowerCase())
        || compareText(left.id, right.id);
    });
  }, [browse.lifecycle, browse.search, browse.sort, theses]);

  const stale = errors.length > 0;
  const hasFilters = Boolean(browse.search.trim()) || browse.lifecycle !== 'all';

  return <section className="thesis-library" aria-labelledby={headingId}>
    <div className="thesis-library-back">
      <Button type="button" size="sm" variant="ghost" onClick={onBackToWorkspace}>Back to workspace</Button>
    </div>
    <header className="thesis-library-header">
      <div>
        <h1 id={headingId} ref={headingRef} tabIndex={-1}>Thesis library</h1>
        <p>Your saved research, from first draft to archived idea.</p>
      </div>
      {onCreateThesis ? <Button type="button" onClick={onCreateThesis} disabled={!client}>New thesis</Button> : null}
    </header>

    {!client ? <div className="thesis-library-state">
      <h2>Your saved theses aren’t available in this window.</h2>
      <p>Open the desktop app to browse your local research.</p>
    </div> : <>
      <div className="thesis-library-controls">
        <label className="thesis-library-search">Search theses
          <input ref={searchRef} type="search" value={browse.search}
            placeholder="Company, ticker, or an idea…" aria-controls={resultsId}
            onChange={(event) => changeBrowse({ search: event.target.value })} />
        </label>
        <label>Status
          <select value={browse.lifecycle} aria-controls={resultsId}
            onChange={(event) => changeBrowse({ lifecycle: event.target.value as ThesisLibraryBrowseState['lifecycle'] })}>
            <option value="all">All statuses</option>
            {LIVING_THESIS_LIFECYCLES.map((lifecycle) => <option key={lifecycle} value={lifecycle}>{lifecycleLabels[lifecycle]}</option>)}
          </select>
        </label>
        <label>Sort by
          <select value={browse.sort} aria-controls={resultsId}
            onChange={(event) => changeBrowse({ sort: event.target.value as ThesisLibraryBrowseState['sort'] })}>
            <option value="recently-updated">Recently updated</option>
            <option value="entity">Company name</option>
            <option value="next-review">Next review date</option>
          </select>
        </label>
      </div>

      <div className="thesis-library-results-bar">
        <p role="status" aria-live="polite">
          {loading ? (theses ? 'Refreshing your library…' : 'Loading your saved theses…')
            : stale ? 'Your library could not be refreshed.'
              : theses ? `${visibleTheses.length} of ${theses.length} saved ${theses.length === 1 ? 'thesis' : 'theses'}` : ''}
        </p>
        <div>
          {hasFilters && visibleTheses.length > 0 ? <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button> : null}
          <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => { void refresh(); }}>Refresh</Button>
        </div>
      </div>

      {stale ? <div className="thesis-library-error" role="alert">
        <h2>{theses ? 'We couldn’t refresh your library.' : 'We couldn’t load your library.'}</h2>
        <ul>{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
        {theses?.length ? <p>The entries below may be out of date. Try again before opening them.</p> : null}
        <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => { void refresh(); }}>Try again</Button>
      </div> : null}

      <div id={resultsId} className="thesis-library-results" aria-busy={loading}>
        {visibleTheses.map((thesis) => <article key={thesis.id} className="thesis-library-row" aria-label={`${thesis.entityName}: ${thesis.title}`}>
          <div className="thesis-library-row-copy">
            <div className="thesis-library-row-identity">
              <h2>{thesis.entityName}</h2>
              {thesis.ticker ? <span className="thesis-library-ticker">{thesis.ticker}</span> : null}
              <Badge variant={thesis.lifecycle === 'active' ? 'accent' : 'neutral'}>{lifecycleLabels[thesis.lifecycle]}</Badge>
            </div>
            <h3>{thesis.title}</h3>
            <p className="thesis-library-summary">{thesis.summary || 'No summary saved.'}</p>
            <dl className="thesis-library-meta">
              {thesis.theme ? <div><dt>Theme</dt><dd>{thesis.theme}</dd></div> : null}
              <div><dt>Next review</dt><dd>{thesis.nextReviewAt ? <time dateTime={thesis.nextReviewAt}>{formatDate(thesis.nextReviewAt, true)}</time> : 'Not scheduled'}</dd></div>
              <div><dt>Updated</dt><dd><time dateTime={thesis.updatedAt}>{formatDate(thesis.updatedAt)}</time></dd></div>
            </dl>
          </div>
          <div className="thesis-library-row-actions">
            <Button type="button" size="sm" variant="secondary" disabled={stale}
              onClick={() => onOpenThesis({ thesisId: thesis.id })}>Open thesis</Button>
            <Button type="button" size="sm" variant="ghost" disabled={stale}
              onClick={() => onOpenThesis({ thesisId: thesis.id, view: 'history' })}>View history</Button>
          </div>
        </article>)}

        {theses && !loading && !stale && !visibleTheses.length ? <div className="thesis-library-state">
          <h2>{theses.length ? 'No theses match your search.' : 'Your research starts here.'}</h2>
          <p>{theses.length ? 'Try another search or clear your filters to see all saved theses.' : 'Create your first thesis to keep your reasoning and reviews together.'}</p>
          {theses.length ? <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
        </div> : null}
      </div>
    </>}
  </section>;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function formatDate(value: string, calendarDate = false): string {
  const date = new Date(calendarDate ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}
