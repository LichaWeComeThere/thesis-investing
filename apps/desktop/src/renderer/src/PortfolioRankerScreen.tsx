import {
  PORTFOLIO_RANKER_MAX_SCORE,
  PORTFOLIO_RANKER_MIN_SCORE,
  rankManualPortfolioItems,
  type ManualPortfolioRankedItem
} from '@thesis-investing/core';
import {
  Badge,
  type BadgeVariant,
  Button,
  Card,
  DraftLeaveDialog,
  PageHeader
} from '@thesis-investing/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildPortfolioRankerInput,
  createEmptyPortfolioRankerRow,
  getNextPortfolioRankerRowNumber,
  portfolioRankerItemToRow,
  type PortfolioRankerRowState
} from './portfolioRankerInput';
import {
  getDefaultPortfolioRankerStorageClient,
  toPersistedPortfolioRankerItem,
  type PortfolioRankerStorageClient
} from './portfolioRankerStorageClient';
import {
  formatScoreChange,
  mockTheses,
  type MockThesisIdeaStatus,
  type MockThesisStatus,
  type MockThesis
} from './data/mockTheses';

type PortfolioRankerScreenProps = {
  initialRows?: PortfolioRankerRowState[];
  initialPersistedRowIds?: string[];
  initialStorageErrors?: string[];
  onOpenWorkspace?: (workspaceId: string) => void;
  navigationRequest?: {
    destination: string;
    onLeave: () => void;
    onStay: () => void;
  };
  storageClient?: PortfolioRankerStorageClient | null;
  theses?: MockThesis[];
};

type ThesisStatusDisplay = {
  label: string;
  variant: BadgeVariant;
};

const DEFAULT_VISIBLE_DEMO_IDEA_COUNT = 4;

type ThesisFilterValue = 'all' | MockThesisStatus;
type IdeaStatusFilterValue = 'all' | MockThesisIdeaStatus;

const THESIS_FILTER_OPTIONS: ReadonlyArray<{
  label: string;
  value: ThesisFilterValue;
}> = [
  { label: 'All ideas', value: 'all' },
  { label: 'Strong thesis', value: 'Strong' },
  { label: 'Stable thesis', value: 'Stable' },
  { label: 'Improving thesis', value: 'Improving' },
  { label: 'Weakening thesis', value: 'Weakening' },
  { label: 'Broken thesis', value: 'Broken' }
];

const IDEA_STATUS_OPTIONS: ReadonlyArray<{
  label: string;
  value: IdeaStatusFilterValue;
}> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'Active' },
  { label: 'Watchlist', value: 'Watchlist' },
  { label: 'Researching', value: 'Researching' },
  { label: 'Needs review', value: 'Needs Review' },
  { label: 'Caution', value: 'Caution' },
  { label: 'Archived', value: 'Archived' }
];

export function PortfolioRankerScreen({
  initialRows,
  initialPersistedRowIds = [],
  initialStorageErrors = [],
  onOpenWorkspace,
  navigationRequest,
  storageClient,
  theses = mockTheses
}: PortfolioRankerScreenProps): JSX.Element {
  const defaultRows = useMemo(
    () => theses.map(mockThesisToPortfolioRankerRow),
    [theses]
  );
  const startingRows = initialRows ?? defaultRows;
  const mockThesesById = useMemo(
    () => new Map(theses.map((thesis) => [thesis.id, thesis])),
    [theses]
  );
  const resolvedStorageClient =
    storageClient === undefined
      ? getDefaultPortfolioRankerStorageClient()
      : storageClient;
  const [rows, setRows] = useState<PortfolioRankerRowState[]>(() =>
    startingRows.map((row) => ({ ...row }))
  );
  const [showAllDemoIdeas, setShowAllDemoIdeas] = useState(
    () => initialRows !== undefined
  );
  const [nextRowNumber, setNextRowNumber] = useState(() =>
    getNextPortfolioRankerRowNumber(startingRows, startingRows.length + 1)
  );
  const [persistedRowIds, setPersistedRowIds] = useState<Set<string>>(
    () => new Set(initialPersistedRowIds)
  );
  const [storageErrors, setStorageErrors] =
    useState<string[]>(initialStorageErrors);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedStorageClient));
  const [isWriting, setIsWriting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [thesisFilter, setThesisFilter] =
    useState<ThesisFilterValue>('all');
  const [ideaStatusFilter, setIdeaStatusFilter] =
    useState<IdeaStatusFilterValue>('all');
  const [editingRow, setEditingRow] =
    useState<PortfolioRankerRowState | null>(null);
  const [editorErrors, setEditorErrors] = useState<string[]>([]);
  const writeInFlight = useRef(false);
  const editorRef = useRef<HTMLElement>(null);
  const [openActionMenuRowId, setOpenActionMenuRowId] =
    useState<string | null>(null);
  const savedEditingRow = rows.find((row) => row.id === editingRow?.id);
  const hasUnsavedChanges = Boolean(editingRow && (
    !savedEditingRow ||
    editingRow.ticker !== savedEditingRow.ticker ||
    editingRow.companyName !== savedEditingRow.companyName ||
    editingRow.manualScore !== savedEditingRow.manualScore ||
    editingRow.notes !== savedEditingRow.notes
  ));
  const guardedDraft = hasUnsavedChanges || Boolean(editingRow && editorErrors.length > 0);

  useEffect(() => {
    if (navigationRequest && !guardedDraft && !isWriting) navigationRequest.onLeave();
  }, [navigationRequest, guardedDraft, isWriting]);

  useEffect(() => {
    if (!guardedDraft && !isWriting) return;
    const protectDraft = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [guardedDraft, isWriting]);

  useEffect(() => {
    editorRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [editingRow?.id]);

  useEffect(() => {
    const client = resolvedStorageClient;

    if (!client) {
      setIsLoading(false);
      return;
    }

    const activeClient = client;
    let isMounted = true;

    async function loadPersistedRows(): Promise<void> {
      setIsLoading(true);
      setStorageErrors([]);

      try {
        const result = await activeClient.list();

        if (!isMounted) {
          return;
        }

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }

        if (result.value.length === 0) {
          // No persisted rows yet — leave the demo default rows visible until
          // the user edits/persists. Editing a default row will persist it.
          setPersistedRowIds(new Set());
          setShowAllDemoIdeas(false);
          return;
        }

        const persistedRows = result.value.map(portfolioRankerItemToRow);
        setRows(persistedRows);
        setShowAllDemoIdeas(true);
        setPersistedRowIds(
          new Set(result.value.map((item) => item.id))
        );
        setNextRowNumber(
          getNextPortfolioRankerRowNumber(
            persistedRows,
            persistedRows.length + 1
          )
        );
      } catch (error) {
        if (isMounted) {
          setStorageErrors([
            error instanceof Error
              ? error.message
              : 'Unable to load persisted portfolio ranker rows.'
          ]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPersistedRows();

    return () => {
      isMounted = false;
    };
  }, [resolvedStorageClient]);

  async function removePersistedRow(rowId: string): Promise<boolean> {
    if (!resolvedStorageClient) {
      return true;
    }
    if (!persistedRowIds.has(rowId)) {
      return true;
    }

    writeInFlight.current = true;
    setIsWriting(true);
    setStorageErrors([]);

    try {
      const result = await resolvedStorageClient.remove(rowId);
      if (!result.ok) {
        setStorageErrors(result.errors);
        return false;
      }

      setPersistedRowIds((current) => {
        if (!current.has(rowId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(rowId);
        return next;
      });

      return true;
    } catch (error) {
      setStorageErrors([
        error instanceof Error
          ? error.message
          : 'Unable to remove portfolio ranker row.'
      ]);
      return false;
    } finally {
      writeInFlight.current = false;
      setIsWriting(false);
    }
  }

  const shouldLimitDemoIdeas =
    initialRows === undefined && persistedRowIds.size === 0 && !showAllDemoIdeas;
  const visibleRows = shouldLimitDemoIdeas
    ? rows.slice(0, DEFAULT_VISIBLE_DEMO_IDEA_COUNT)
    : rows;
  const hiddenDemoIdeaCount = Math.max(rows.length - visibleRows.length, 0);
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    thesisFilter !== 'all' ||
    ideaStatusFilter !== 'all';
  const displayedRows = (hasActiveFilters ? rows : visibleRows).filter((row) =>
    portfolioRankerRowMatchesFilters(
      row,
      mockThesesById.get(row.id),
      searchQuery,
      thesisFilter,
      ideaStatusFilter
    )
  );
  const rankerInput = useMemo(
    () => buildPortfolioRankerInput(displayedRows),
    [displayedRows]
  );
  const rankedItems = useMemo(
    () => rankManualPortfolioItems(rankerInput),
    [rankerInput]
  );
  const rankedItemsById = useMemo(
    () => new Map(rankedItems.map((item) => [item.id, item])),
    [rankedItems]
  );
  const validRankedItems = useMemo(
    () =>
      rankedItems.filter(
        (
          item
        ): item is ManualPortfolioRankedItem & { manualScore: number } =>
          item.status === 'ranked' && typeof item.manualScore === 'number'
      ),
    [rankedItems]
  );
  const rankedCount = rankedItems.filter((item) => item.status === 'ranked').length;
  const topRankedItem =
    rankedItems.find((item) => item.status === 'ranked') ?? null;
  const weakestIdea =
    validRankedItems.length > 1
      ? validRankedItems.reduce((lowest, item) =>
          item.manualScore < lowest.manualScore ? item : lowest
        )
      : null;
  const weakestIdeaReason = weakestIdea
    ? getWeakestIdeaReason()
    : null;
  const hasIncompleteRankerItems = rankedItems.some(
    (item) => item.status !== 'ranked'
  );

  function updateEditingRow(
    field: keyof Omit<PortfolioRankerRowState, 'id'>,
    value: string
  ): void {
    if (writeInFlight.current) return;
    setEditorErrors([]);
    setEditingRow((currentRow) =>
      currentRow
        ? {
            ...currentRow,
            [field]: value
          }
        : currentRow
    );
  }

  function startEditingRow(row: PortfolioRankerRowState): void {
    if (writeInFlight.current || isLoading || guardedDraft) return;
    setEditorErrors([]);
    setOpenActionMenuRowId(null);
    setEditingRow({ ...row });
  }

  function cancelEditingRow(): void {
    if (writeInFlight.current) return;
    setEditorErrors([]);
    setOpenActionMenuRowId(null);
    setEditingRow(null);
  }

  async function saveEditingRow(): Promise<void> {
    if (!editingRow || writeInFlight.current || isLoading) return;
    const rowToSave = { ...editingRow };
    // Validate the raw text before conversion can omit a nonnumeric score.
    const inputs = buildPortfolioRankerInput([rowToSave]);
    const [validated] = rankManualPortfolioItems(
      inputs.length ? inputs : [{ id: rowToSave.id, ticker: rowToSave.ticker }]
    );
    if (validated.errors.length > 0) {
      setEditorErrors(validated.errors);
      return;
    }

    writeInFlight.current = true;
    setIsWriting(true);
    setEditorErrors([]);
    setStorageErrors([]);
    try {
      let savedRow = rowToSave;
      if (resolvedStorageClient) {
        const result = await resolvedStorageClient.save(toPersistedPortfolioRankerItem(rowToSave));
        if (!result.ok) {
          setEditorErrors(result.errors.length ? result.errors : ['Unable to save this idea. Please try again.']);
          return;
        }
        savedRow = portfolioRankerItemToRow(result.value);
        setPersistedRowIds((current) => new Set([...current, rowToSave.id]));
      }
      setRows((current) => current.map((row) => row.id === savedRow.id ? savedRow : row));
      setOpenActionMenuRowId(null);
      setEditingRow(null);
    } catch (error) {
      setEditorErrors([error instanceof Error ? error.message : 'Unable to save this idea. Please try again.']);
    } finally {
      writeInFlight.current = false;
      setIsWriting(false);
    }
  }

  function addRow(): void {
    if (writeInFlight.current || isLoading || guardedDraft) return;
    const newRow = createEmptyPortfolioRankerRow(`idea-${nextRowNumber}`);
    setSearchQuery('');
    setThesisFilter('all');
    setIdeaStatusFilter('all');
    setEditorErrors([]);
    setOpenActionMenuRowId(null);
    setShowAllDemoIdeas(true);
    setRows((currentRows) => [...currentRows, newRow]);
    setEditingRow(newRow);
    setNextRowNumber((currentNumber) => currentNumber + 1);
  }

  async function removeRow(rowId: string): Promise<void> {
    if (writeInFlight.current || isLoading || guardedDraft) return;
    const removed = await removePersistedRow(rowId);
    if (!removed) {
      return;
    }
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [createEmptyPortfolioRankerRow(currentRows[0].id)];
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
    setEditingRow((currentRow) =>
      currentRow?.id === rowId ? null : currentRow
    );
    setOpenActionMenuRowId(null);
  }

  async function clearRows(): Promise<void> {
    if (writeInFlight.current || isLoading || guardedDraft) return;
    if (resolvedStorageClient && persistedRowIds.size > 0) {
      writeInFlight.current = true;
      setIsWriting(true);
      setStorageErrors([]);
      try {
        for (const id of Array.from(persistedRowIds)) {
          const result = await resolvedStorageClient.remove(id);
          if (!result.ok) {
            setStorageErrors(result.errors);
            return;
          }
        }
        setPersistedRowIds(new Set());
      } catch (error) {
        setStorageErrors([
          error instanceof Error
            ? error.message
            : 'Unable to clear portfolio ranker rows.'
        ]);
        return;
      } finally {
        writeInFlight.current = false;
        setIsWriting(false);
      }
    }

    setRows(defaultRows.map((row) => ({ ...row })));
    setEditingRow(null);
    setEditorErrors([]);
    setShowAllDemoIdeas(false);
    setNextRowNumber(getNextPortfolioRankerRowNumber(defaultRows, defaultRows.length + 1));
  }

  return (
    <div className="portfolio-ranker-screen">
      <PageHeader
        badge={<Badge variant="accent">Idea ranking</Badge>}
        description="Rank investment ideas by thesis score, status, conviction, risk, and review priority."
        eyebrow="Idea Ranking Board"
        title="Thesis Board"
      />

      <div className="portfolio-ranker-layout">
        <Card className="portfolio-ranker-workspace-card" title="Thesis Board">
          <div className="portfolio-ranker-toolbar">
            <div>
              <h2>Investment ideas</h2>
              <p>
                Compact ranking cards keep score, thesis context, and review
                status visible while you compare ideas.
              </p>
            </div>
            <Button
              disabled={isWriting || isLoading || guardedDraft}
              onClick={addRow}
              type="button"
            >
              + Add idea
            </Button>
          </div>

          <div className="portfolio-ranker-filter-row">
            <label className="portfolio-ranker-search">
              <span>Search</span>
              <input
                aria-label="Search ideas"
                disabled={isWriting || isLoading || Boolean(editingRow)}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Ticker, company, theme, status..."
                type="search"
                value={searchQuery}
              />
            </label>
            <label className="portfolio-ranker-filter">
              <span>Filter</span>
              <select
                aria-label="Filter ideas"
                disabled={isWriting || isLoading || Boolean(editingRow)}
                onChange={(event) =>
                  setThesisFilter(event.currentTarget.value as ThesisFilterValue)
                }
                value={thesisFilter}
              >
                {THESIS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="portfolio-ranker-filter">
              <span>Status</span>
              <select
                aria-label="Filter idea status"
                disabled={isWriting || isLoading || Boolean(editingRow)}
                onChange={(event) =>
                  setIdeaStatusFilter(
                    event.currentTarget.value as IdeaStatusFilterValue
                  )
                }
                value={ideaStatusFilter}
              >
                {IDEA_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section
            aria-label="Investment ideas"
            className="portfolio-ranker-rows"
          >
            {displayedRows.map((row) => {
              const rankedItem = rankedItemsById.get(row.id);
              const thesis = mockThesesById.get(row.id);
              const thesisStatus = getThesisStatus(thesis);
              const rowNumber = rows.findIndex((item) => item.id === row.id) + 1;
              const isEditing = editingRow?.id === row.id;

              return (
                <article
                  className={`portfolio-ranker-row${isEditing ? ' portfolio-ranker-row--expanded' : ''}`}
                  key={row.id}
                >
                  <div className="portfolio-ranker-row-header">
                    <div className="portfolio-ranker-rank-badge">
                      {rankedItem?.rank ?? rowNumber}
                    </div>
                    <div className="portfolio-ranker-row-summary">
                      <span className="portfolio-ranker-entry-number">
                        Idea {rowNumber}
                      </span>
                      <h3>{formatTickerPreview(row)}</h3>
                      <p>{formatCompanyPreview(row)}</p>
                    </div>
                    <div className="portfolio-ranker-row-controls">
                      <Badge
                        className={`portfolio-ranker-score-badge ${getScoreToneClass(rankedItem)}`}
                        variant={getScoreBadgeVariant(rankedItem)}
                      >
                        MBS {formatRowScorePreview(row)}
                      </Badge>
                      <details
                        className="portfolio-ranker-overflow-menu"
                        onToggle={(event) => {
                          const isOpen = event.currentTarget.open;
                          setOpenActionMenuRowId((currentRowId) =>
                            isOpen
                              ? row.id
                              : currentRowId === row.id
                                ? null
                                : currentRowId
                          );
                        }}
                        open={openActionMenuRowId === row.id}
                      >
                        <summary
                          aria-label={`More actions for ${formatTickerPreview(row)}`}
                          title="More actions"
                        >
                          <span aria-hidden="true">...</span>
                        </summary>
                        <div className="portfolio-ranker-overflow-popover">
                          <button
                            disabled={isWriting || isLoading || guardedDraft}
                            onClick={() => {
                              void removeRow(row.id);
                            }}
                            type="button"
                          >
                            Remove idea
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>

                  {isEditing && editingRow ? (
                    <section
                      aria-label={`Edit ${formatTickerPreview(row)} details`}
                      className="portfolio-ranker-expanded-editor"
                      ref={editorRef}
                    >
                      <h4>Edit details</h4>
                      <p className="portfolio-ranker-editor-help">
                        Save or cancel before switching ideas or changing filters.
                      </p>
                      {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
                      {editorErrors.length > 0 ? (
                        <div className="portfolio-ranker-editor-errors" role="alert">
                          {editorErrors.map((error) => <p key={error}>{error}</p>)}
                          <p>Your edits are still open. Correct the details or try saving again.</p>
                        </div>
                      ) : null}
                      <div className="portfolio-ranker-expanded-grid">
                        <label className="portfolio-ranker-field">
                          <span>Ticker</span>
                          <input
                            aria-label={`Ticker ${rowNumber}`}
                            disabled={isWriting}
                            onChange={(event) =>
                              updateEditingRow(
                                'ticker',
                                event.currentTarget.value
                              )
                            }
                            placeholder="MSFT"
                            type="text"
                            value={editingRow.ticker}
                          />
                        </label>

                        <label className="portfolio-ranker-field">
                          <span>Company name</span>
                          <input
                            aria-label={`Company name ${rowNumber}`}
                            disabled={isWriting}
                            onChange={(event) =>
                              updateEditingRow(
                                'companyName',
                                event.currentTarget.value
                              )
                            }
                            placeholder="Optional"
                            type="text"
                            value={editingRow.companyName}
                          />
                        </label>

                        <label className="portfolio-ranker-field">
                          <span>Manual score</span>
                          <input
                            aria-label={`Manual score ${rowNumber}`}
                            disabled={isWriting}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateEditingRow(
                                'manualScore',
                                event.currentTarget.value
                              )
                            }
                            placeholder={`${PORTFOLIO_RANKER_MIN_SCORE}-${PORTFOLIO_RANKER_MAX_SCORE}`}
                            type="text"
                            value={editingRow.manualScore}
                          />
                        </label>
                      </div>

                      <label className="portfolio-ranker-field portfolio-ranker-expanded-notes">
                        <span>Optional notes</span>
                        <textarea
                          aria-label={`Notes ${rowNumber}`}
                          disabled={isWriting}
                          onChange={(event) =>
                            updateEditingRow('notes', event.currentTarget.value)
                          }
                          placeholder="User-entered context for this score."
                          rows={3}
                          value={editingRow.notes}
                        />
                      </label>

                      <div className="portfolio-ranker-editor-actions">
                        <Button
                          disabled={isWriting}
                          onClick={cancelEditingRow}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={isWriting || isLoading}
                          onClick={() => {
                            void saveEditingRow();
                          }}
                          size="sm"
                          type="button"
                        >
                          {isWriting ? 'Saving…' : 'Save changes'}
                        </Button>
                      </div>
                    </section>
                  ) : (
                    <>
                      <div className="portfolio-ranker-thesis-meta">
                        <Badge variant={thesisStatus.variant}>
                          {thesisStatus.label}
                        </Badge>
                        <span className="portfolio-ranker-meta-chip">
                          Change:{' '}
                          {thesis ? formatScoreChange(thesis) : 'Not set'}
                        </span>
                        <span className="portfolio-ranker-meta-chip">
                          Conviction: {thesis?.conviction ?? 'Not set'}
                        </span>
                        <span className="portfolio-ranker-meta-chip portfolio-ranker-meta-chip--risk">
                          Risk: {thesis?.riskLevel ?? 'Not set'}
                        </span>
                        <span className="portfolio-ranker-meta-chip">
                          Theme: {thesis?.theme ?? 'Not set'}
                        </span>
                      </div>
                      <div className="portfolio-ranker-card-footer">
                        <div className="portfolio-ranker-review-dates">
                          <span>
                            Last reviewed{' '}
                            <strong>
                              {thesis?.lastReviewedDate ?? 'Not set'}
                            </strong>
                          </span>
                          <span>
                            Next review{' '}
                            <strong>
                              {thesis?.nextReviewDate ?? 'Not set'}
                            </strong>
                          </span>
                        </div>
                        <Button
                          disabled={isWriting || isLoading || guardedDraft}
                          onClick={() => startEditingRow(row)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Edit details
                        </Button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
            {displayedRows.length === 0 ? (
              <div className="portfolio-ranker-filter-empty" role="status">
                <h3>Nothing found</h3>
                <p>
                  No matching ideas. Try another ticker, company, theme, or
                  status.
                </p>
              </div>
            ) : null}
          </section>

          {hiddenDemoIdeaCount > 0 && !hasActiveFilters ? (
            <div className="portfolio-ranker-show-more">
              <p>
                Showing {visibleRows.length} focused sample ideas.{' '}
                {hiddenDemoIdeaCount} more remain available.
              </p>
              <Button
                onClick={() => setShowAllDemoIdeas(true)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Show more ideas
              </Button>
            </div>
          ) : null}

          <div className="portfolio-ranker-actions">
            <Button
              disabled={isWriting || isLoading || guardedDraft}
              onClick={addRow}
              type="button"
              variant="secondary"
            >
              + Add another idea
            </Button>
            <Button
              disabled={isWriting || isLoading || guardedDraft}
              onClick={() => {
                void clearRows();
              }}
              type="button"
              variant="secondary"
            >
              Clear entries
            </Button>
          </div>

          {storageErrors.length > 0 ? (
            <div className="portfolio-ranker-storage-status" role="alert">
              <h3>Storage</h3>
              <ul>
                {storageErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card
          className="portfolio-ranker-output-card"
          emphasis
          title="Thesis ranking output"
        >
          <div className="portfolio-ranker-output-hero">
            <div>
              <span>Ranked ideas</span>
              <strong>
                {rankedCount} / {displayedRows.length}
              </strong>
            </div>
            <div>
              <span>Current leader</span>
              <strong>
                {topRankedItem
                  ? topRankedItem.normalizedTicker
                  : 'None yet'}
              </strong>
            </div>
          </div>

          {rankedItems.length > 0 ? (
            <div className="portfolio-ranker-results">
              <div className="portfolio-ranker-preview-list">
                <div className="portfolio-ranker-preview-heading">
                  <span>Rank</span>
                  <span>Ticker</span>
                  <span>Company</span>
                  <span>Score</span>
                </div>
                {rankedItems.map((item) => (
                  <div className="portfolio-ranker-preview-row" key={item.id}>
                    <strong>{formatRank(item)}</strong>
                    <span>{formatPreviewTicker(item)}</span>
                    <span>{item.companyName ?? 'Not set'}</span>
                    <span>{formatScore(item)}</span>
                  </div>
                ))}
              </div>

              {rankedItems.some((item) => item.errors.length > 0) ? (
                <div className="portfolio-ranker-feedback">
                    <h3>Items needing attention</h3>
                    <ul>
                      {rankedItems
                        .filter((item) => item.errors.length > 0)
                        .map((item) => (
                          <li key={item.id}>
                            {formatPreviewTicker(item)}:{' '}
                            {item.errors.join(' ')}
                          </li>
                        ))}
                    </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="portfolio-ranker-empty-state">
              <h3>No ideas ranked yet</h3>
              <p>
                Add your first idea with a ticker and manual score to generate
                a deterministic ranking.
              </p>
            </div>
          )}

          <div className="portfolio-ranker-score-guide">
            <h3>Scoring guide</h3>
            <div>
              <span className="portfolio-ranker-guide-dot portfolio-ranker-guide-dot--risk" />
              <p>
                <strong>0</strong> Weak thesis / high risk
              </p>
            </div>
            <div>
              <span className="portfolio-ranker-guide-dot portfolio-ranker-guide-dot--warning" />
              <p>
                <strong>50</strong> Average thesis / mixed factors
              </p>
            </div>
            <div>
              <span className="portfolio-ranker-guide-dot portfolio-ranker-guide-dot--growth" />
              <p>
                <strong>100</strong> Strong thesis / high conviction
              </p>
            </div>
          </div>

          <div
            className={`portfolio-ranker-weakest-card ${weakestIdea ? weakestIdeaToneClass(weakestIdea.manualScore) : ''}`}
          >
            <div className="portfolio-ranker-weakest-header">
              <div>
                <span>Review priority</span>
                <h3>Weakest idea</h3>
              </div>
              {weakestIdea || validRankedItems.length === 0 ? (
                <button
                  className="portfolio-ranker-weakest-action"
                  disabled={isWriting || isLoading}
                  onClick={() => onOpenWorkspace?.('mbs-scorer')}
                  type="button"
                >
                  Re-evaluate thesis
                  <span className="portfolio-ranker-weakest-action-arrow" aria-hidden="true">
                    <svg
                      fill="none"
                      height="16"
                      viewBox="0 0 24 24"
                      width="16"
                    >
                      <path
                        d="M9 14 4 9l5-5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.25"
                      />
                      <path
                        d="M4 9h9.5a6.5 6.5 0 1 1 0 13H11"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.25"
                      />
                    </svg>
                  </span>
                </button>
              ) : null}
            </div>

            {weakestIdea ? (
              <>
                <div className="portfolio-ranker-weakest-score">
                  <span>{weakestIdea.normalizedTicker}</span>
                  <strong>
                    {weakestIdea.manualScore} / {PORTFOLIO_RANKER_MAX_SCORE}
                  </strong>
                </div>
                <dl className="portfolio-ranker-weakest-detail-list">
                  <div>
                    <dt>Reason</dt>
                    <dd>{weakestIdeaReason}</dd>
                  </div>
                  <div>
                    <dt>Action</dt>
                    <dd>Re-evaluate thesis</dd>
                  </div>
                </dl>
                <p>
                  {weakestIdea.normalizedTicker} is the lowest valid scored idea
                  on the current board.
                </p>
              </>
            ) : validRankedItems.length === 1 ? (
              <p>
                Add more ideas to compare weakest thesis.
              </p>
            ) : (
              <p>Add scores to identify the weakest idea.</p>
            )}

            {hasIncompleteRankerItems ? (
              <small>
                Incomplete ideas are excluded until they have a valid score.
              </small>
            ) : null}
          </div>
        </Card>
      </div>
      {navigationRequest && (guardedDraft || isWriting) ? (
        <DraftLeaveDialog
          title="Unsaved ranking changes"
          description={`Save your changes before opening ${navigationRequest.destination}, discard them, or continue editing.`}
          errors={editorErrors}
          busy={isWriting}
          onSave={() => { void saveEditingRow(); }}
          onDiscard={() => {
            if (writeInFlight.current) return;
            setEditingRow(null);
            setEditorErrors([]);
            navigationRequest.onLeave();
          }}
          onStay={navigationRequest.onStay}
        />
      ) : null}
    </div>
  );
}

function formatTickerPreview(row: PortfolioRankerRowState): string {
  const ticker = row.ticker.trim();
  return ticker ? ticker.toUpperCase() : 'Add ticker';
}

function formatCompanyPreview(row: PortfolioRankerRowState): string {
  const companyName = row.companyName.trim();
  return companyName || 'New idea';
}

function formatRowScorePreview(row: PortfolioRankerRowState): string {
  return row.manualScore.trim()
    ? `${row.manualScore.trim()} / ${PORTFOLIO_RANKER_MAX_SCORE}`
    : 'Not set';
}

function formatRank(item: ManualPortfolioRankedItem): string {
  return item.rank === null ? formatStatus(item) : String(item.rank);
}

function formatScore(item: ManualPortfolioRankedItem): string {
  return item.manualScore === undefined
    ? 'Not set'
    : `${item.manualScore} / ${PORTFOLIO_RANKER_MAX_SCORE}`;
}

function formatPreviewTicker(item: ManualPortfolioRankedItem): string {
  return item.normalizedTicker || 'Add ticker';
}

function mockThesisToPortfolioRankerRow(
  thesis: MockThesis
): PortfolioRankerRowState {
  return {
    companyName: thesis.companyName,
    id: thesis.id,
    manualScore: String(thesis.mbsScore),
    notes: thesis.thesisSummary,
    ticker: thesis.ticker
  };
}

function portfolioRankerRowMatchesFilters(
  row: PortfolioRankerRowState,
  thesis: MockThesis | undefined,
  searchQuery: string,
  thesisFilter: ThesisFilterValue,
  ideaStatusFilter: IdeaStatusFilterValue
): boolean {
  if (thesisFilter !== 'all' && thesis?.thesisStatus !== thesisFilter) {
    return false;
  }

  if (ideaStatusFilter !== 'all' && thesis?.ideaStatus !== ideaStatusFilter) {
    return false;
  }

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const searchableValues = [
    row.ticker,
    row.companyName,
    thesis?.theme,
    thesis?.thesisStatus,
    thesis ? `${thesis.thesisStatus} thesis` : undefined,
    thesis?.ideaStatus,
    thesis?.conviction,
    thesis ? `${thesis.conviction} conviction` : undefined,
    thesis?.riskLevel,
    thesis ? `${thesis.riskLevel} risk` : undefined
  ];

  return searchableValues.some((value) =>
    value?.toLocaleLowerCase().includes(normalizedQuery)
  );
}

function getThesisStatus(thesis: MockThesis | undefined): ThesisStatusDisplay {
  if (!thesis) {
    return {
      label: 'Thesis: Not set',
      variant: 'neutral'
    };
  }

  if (thesis.thesisStatus === 'Strong' || thesis.thesisStatus === 'Improving') {
    return {
      label: `Thesis: ${thesis.thesisStatus}`,
      variant: 'success'
    };
  }

  if (thesis.thesisStatus === 'Weakening') {
    return {
      label: `Thesis: ${thesis.thesisStatus}`,
      variant: 'warning'
    };
  }

  if (thesis.thesisStatus === 'Broken') {
    return {
      label: `Thesis: ${thesis.thesisStatus}`,
      variant: 'risk'
    };
  }

  return {
    label: `Thesis: ${thesis.thesisStatus}`,
    variant: 'neutral'
  };
}

function getScoreBadgeVariant(
  item: ManualPortfolioRankedItem | undefined
): BadgeVariant {
  if (!item || item.status === 'incomplete') {
    return 'warning';
  }

  if (item.status === 'invalid') {
    return 'risk';
  }

  if ((item.manualScore ?? 0) >= 70) {
    return 'success';
  }

  if ((item.manualScore ?? 0) >= 50) {
    return 'accent';
  }

  return 'risk';
}

function getScoreToneClass(item: ManualPortfolioRankedItem | undefined): string {
  if (!item || item.status === 'incomplete') {
    return 'portfolio-ranker-score-badge--warning';
  }

  if (item.status === 'invalid') {
    return 'portfolio-ranker-score-badge--risk';
  }

  if ((item.manualScore ?? 0) >= 70) {
    return 'portfolio-ranker-score-badge--strong';
  }

  if ((item.manualScore ?? 0) >= 50) {
    return 'portfolio-ranker-score-badge--mixed';
  }

  return 'portfolio-ranker-score-badge--risk';
}

function getWeakestIdeaReason(): string {
  return 'Lowest current thesis score.';
}

function formatStatus(item: ManualPortfolioRankedItem | undefined): string {
  if (!item) {
    return 'Incomplete';
  }

  if (item.status === 'ranked') {
    return 'Ranked';
  }

  if (item.status === 'invalid') {
    return 'Invalid';
  }

  return 'Incomplete';
}

function weakestIdeaToneClass(score: number): string {
  if (score <= 39) {
    return 'portfolio-ranker-weakest-card--risk';
  }

  if (score <= 69) {
    return 'portfolio-ranker-weakest-card--warning';
  }

  return 'portfolio-ranker-weakest-card--steady';
}
