import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  buildWatchlistItemFromForm,
  createEmptyWatchlistForm,
  ensureWatchlistFormHasAvailableId,
  getNextWatchlistItemNumber,
  hasWatchlistFormContent,
  removeLocalWatchlistItem,
  upsertLocalWatchlistItem,
  watchlistItemToForm,
  type LocalWatchlistItem,
  type WatchlistFormState
} from './watchlistInput';
import {
  getDefaultWatchlistStorageClient,
  toPersistedWatchlistItem,
  type WatchlistStorageClient
} from './watchlistStorageClient';
import {
  getWatchlistTheses,
  mockTheses,
  type MockThesis
} from './data/mockTheses';
import './watchlist.css';

type WatchlistScreenProps = {
  initialForm?: WatchlistFormState;
  initialItems?: LocalWatchlistItem[];
  initialStorageErrors?: string[];
  initialSelectedItemId?: string;
  storageClient?: WatchlistStorageClient | null;
  theses?: MockThesis[];
};

export function WatchlistScreen({
  initialForm,
  initialItems = [],
  initialStorageErrors = [],
  storageClient,
  initialSelectedItemId,
  theses = mockTheses
}: WatchlistScreenProps): JSX.Element {
  const resolvedStorageClient =
    storageClient === undefined
      ? getDefaultWatchlistStorageClient()
      : storageClient;
  const [items, setItems] = useState<LocalWatchlistItem[]>(() =>
    initialItems.map((item) => ({ ...item }))
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialSelectedItemId ?? initialItems[0]?.id ?? null
  );
  const [nextItemNumber, setNextItemNumber] = useState(() =>
    getNextWatchlistItemNumber(initialItems)
  );
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [storageErrors, setStorageErrors] = useState(initialStorageErrors);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedStorageClient));
  const [isWriting, setIsWriting] = useState(false);
  const [form, setForm] = useState<WatchlistFormState>(() =>
    initialForm
      ? { ...initialForm }
      : createEmptyWatchlistForm(initialItems.length + 1)
  );

  const formResult = useMemo(() => buildWatchlistItemFromForm(form), [form]);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const shouldShowValidation =
    saveAttempted ||
    (hasWatchlistFormContent(form) && !formResult.validation.valid);
  const visibleValidationErrors = shouldShowValidation
    ? formResult.validation.errors
    : [];
  const watchlistTheses = useMemo(() => getWatchlistTheses(theses), [theses]);
  const [selectedMockThesisId, setSelectedMockThesisId] = useState(
    () => watchlistTheses[0]?.id ?? ''
  );
  const selectedMockThesis = useMemo(
    () =>
      watchlistTheses.find((thesis) => thesis.id === selectedMockThesisId) ??
      watchlistTheses[0] ??
      null,
    [selectedMockThesisId, watchlistTheses]
  );

  useEffect(() => {
    const client = resolvedStorageClient;

    if (!client) {
      setIsLoading(false);
      return;
    }

    const activeClient = client;
    let isMounted = true;

    async function loadPersistedItems(): Promise<void> {
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

        const persistedItems = result.value.map((item) => ({ ...item }));
        const nextAvailableItemNumber =
          getNextWatchlistItemNumber(persistedItems);

        setItems(persistedItems);
        setSelectedItemId((currentSelectedItemId) => {
          if (
            currentSelectedItemId &&
            persistedItems.some((item) => item.id === currentSelectedItemId)
          ) {
            return currentSelectedItemId;
          }

          return persistedItems[0]?.id ?? null;
        });
        setNextItemNumber(nextAvailableItemNumber);

        if (!initialForm) {
          setForm((currentForm) =>
            ensureWatchlistFormHasAvailableId(
              currentForm,
              persistedItems,
              nextAvailableItemNumber
            )
          );
        }
      } catch (error) {
        if (isMounted) {
          setStorageErrors([
            error instanceof Error
              ? error.message
              : 'Unable to load persisted watchlist items.'
          ]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPersistedItems();

    return () => {
      isMounted = false;
    };
  }, [initialForm, resolvedStorageClient]);

  function updateForm(
    field: keyof Omit<WatchlistFormState, 'id'>,
    value: string
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  async function saveItem(): Promise<void> {
    setSaveAttempted(true);
    setStorageErrors([]);

    if (!formResult.validation.valid) {
      return;
    }

    const nextItem = formResult.item;
    const isNewItem = !items.some((item) => item.id === nextItem.id);

    if (resolvedStorageClient) {
      setIsWriting(true);

      try {
        const result = await resolvedStorageClient.save(
          toPersistedWatchlistItem(nextItem)
        );

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }

        nextItem.ticker = result.value.ticker;
        nextItem.companyName = result.value.companyName;
        nextItem.tags = result.value.tags;
        nextItem.note = result.value.note;
      } catch (error) {
        setStorageErrors([
          error instanceof Error
            ? error.message
            : 'Unable to save watchlist item.'
        ]);
        return;
      } finally {
        setIsWriting(false);
      }
    }

    const updatedItems = upsertLocalWatchlistItem(items, nextItem);

    setItems(updatedItems);
    setSelectedItemId(nextItem.id);
    setForm(watchlistItemToForm(nextItem));
    setSaveAttempted(false);

    if (isNewItem) {
      setNextItemNumber(
        getNextWatchlistItemNumber(updatedItems, nextItemNumber + 1)
      );
    }
  }

  function startNewItem(): void {
    setForm(createEmptyWatchlistForm(nextItemNumber));
    setSelectedItemId(null);
    setSaveAttempted(false);
  }

  function selectItem(item: LocalWatchlistItem): void {
    setSelectedItemId(item.id);
    setForm(watchlistItemToForm(item));
    setSaveAttempted(false);
  }

  async function removeItem(itemId: string): Promise<void> {
    setStorageErrors([]);

    if (resolvedStorageClient) {
      setIsWriting(true);

      try {
        const result = await resolvedStorageClient.remove(itemId);

        if (!result.ok) {
          setStorageErrors(result.errors);
          return;
        }
      } catch (error) {
        setStorageErrors([
          error instanceof Error
            ? error.message
            : 'Unable to remove watchlist item.'
        ]);
        return;
      } finally {
        setIsWriting(false);
      }
    }

    const updatedItems = removeLocalWatchlistItem(items, itemId);

    setItems(updatedItems);

    if (selectedItemId === itemId) {
      setSelectedItemId(null);
      setForm(createEmptyWatchlistForm(getNextWatchlistItemNumber(updatedItems)));
      setSaveAttempted(false);
    }

    setNextItemNumber(getNextWatchlistItemNumber(updatedItems, nextItemNumber));
  }

  return (
    <div className="watchlist-screen">
      <PageHeader
        description="Keep a short list of companies you want to research."
        title="Watchlist"
      />

      <div className="watchlist-workspace-grid">
        <Card className="watchlist-form-card" title={selectedItem?.id === form.id ? "Edit company" : "Add a company"}>
          <div className="watchlist-form-grid">
            <label className="watchlist-field">
              <span>Ticker</span>
              <input
                aria-label="Watchlist ticker"
                onChange={(event) => updateForm('ticker', event.currentTarget.value)}
                placeholder="MSFT"
                type="text"
                value={form.ticker}
              />
            </label>

            <label className="watchlist-field">
              <span>Company name</span>
              <input
                aria-label="Watchlist company name"
                onChange={(event) =>
                  updateForm('companyName', event.currentTarget.value)
                }
                placeholder="Optional"
                type="text"
                value={form.companyName}
              />
            </label>

            <label className="watchlist-field">
              <span>Tags</span>
              <input
                aria-label="Watchlist tags"
                onChange={(event) => updateForm('tags', event.currentTarget.value)}
                placeholder="quality, software, review"
                type="text"
                value={form.tags}
              />
            </label>

            <label className="watchlist-field">
              <span>Thesis reference</span>
              <input
                aria-label="Watchlist thesis reference"
                onChange={(event) =>
                  updateForm('thesisReference', event.currentTarget.value)
                }
                placeholder="Optional local note reference"
                type="text"
                value={form.thesisReference}
              />
            </label>
          </div>

          <label className="watchlist-field watchlist-note-field">
            <span>Optional note</span>
            <textarea
              aria-label="Watchlist note"
              onChange={(event) => updateForm('note', event.currentTarget.value)}
              placeholder="Context for why this belongs on the watchlist."
              rows={4}
              value={form.note}
            />
          </label>

          {visibleValidationErrors.length > 0 ? (
            <div className="watchlist-validation" role="alert">
              <h3>Check these details</h3>
              <ul>
                {visibleValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {storageErrors.length > 0 ? (
            <div className="watchlist-storage-status" role="alert">
              <h3>Could not update your watchlist</h3>
              <ul>
                {storageErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="watchlist-actions">
            <Button disabled={isWriting || isLoading} onClick={saveItem} type="button">
              {isWriting ? 'Saving...' : 'Save item'}
            </Button>
            <Button
              disabled={isWriting || isLoading}
              onClick={startNewItem}
              type="button"
              variant="secondary"
            >
              New item
            </Button>
          </div>
        </Card>

        <Card className="watchlist-saved-card" title="Saved companies">
          {isLoading ? <p>Loading watchlist...</p> : items.length > 0 ? (
            <>
              <p className="data-provenance-note" role="note">
                <span>These watchlist items persist on this device.</span>
              </p>
              <div className="watchlist-table-wrap">
                <table className="watchlist-table">
                  <thead>
                    <tr>
                      <th scope="col">Ticker</th>
                      <th scope="col">Company</th>
                      <th scope="col">Tags</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.ticker}</td>
                        <td>{item.companyName ?? 'Not provided'}</td>
                        <td>{formatTags(item.tags)}</td>
                        <td>
                          <div className="watchlist-row-actions">
                            <Button
                              onClick={() => selectItem(item)}
                              disabled={isWriting}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => removeItem(item.id)}
                              disabled={isWriting}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="watchlist-empty-state">
              <h3>No companies saved yet</h3>
              <p>Add a ticker and a note about why it interests you.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="watchlist-layout">
        <Card className="watchlist-details-card" title="Company details">
          {selectedItem ? (
            <article className="watchlist-details">
              <div className="watchlist-details-header">
                <div>
                  <p className="watchlist-details-eyebrow">
                    {selectedItem.ticker}
                  </p>
                  <h3>{selectedItem.companyName ?? 'Company not provided'}</h3>
                </div>
                <Badge variant="neutral">Local</Badge>
              </div>

              <dl className="watchlist-meta-grid">
                <div>
                  <dt>Tags</dt>
                  <dd>{formatTags(selectedItem.tags)}</dd>
                </div>
                <div>
                  <dt>Thesis reference</dt>
                  <dd>{selectedItem.thesisReference ?? 'Not set'}</dd>
                </div>
              </dl>

              <div className="watchlist-detail-section">
                <h4>Note</h4>
                <p>{selectedItem.note ?? 'No note provided.'}</p>
              </div>
            </article>
          ) : (
            <div className="watchlist-empty-state">
              <h3>No item selected</h3>
              <p>
                Select a saved company to see its details, or add a company above.
              </p>
            </div>
          )}
        </Card>
        <details className="tool-about watchlist-examples">
          <summary>Explore example companies</summary>
          <p className="data-provenance-note" role="note">
            <Badge variant="neutral">Demo thesis data</Badge>
            <span>Example thesis context is not part of your saved watchlist.</span>
          </p>
          {watchlistTheses.length > 0 ? (
            <div className="watchlist-table-wrap">
              <table className="watchlist-table">
                <thead>
                  <tr>
                    <th scope="col">Ticker</th>
                    <th scope="col">Company</th>
                    <th scope="col">Theme</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlistTheses.map((thesis) => (
                    <tr key={thesis.id}>
                      <td>{thesis.ticker}</td>
                      <td>{thesis.companyName}</td>
                      <td>{thesis.theme}</td>
                      <td>
                        <Badge variant={watchlistBadgeVariant(thesis)}>
                          {thesis.ideaStatus}
                        </Badge>
                      </td>
                      <td>
                        <div className="watchlist-row-actions">
                          <Button
                            onClick={() => {
                              setSelectedMockThesisId(thesis.id);
                              setSelectedItemId(null);
                            }}
                            disabled={isWriting}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            View example
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="watchlist-empty-state">
              <h3>No examples available</h3>
              <p>
                Add a company above to start your own watchlist.
              </p>
            </div>
          )}
          {selectedMockThesis ? (
            <article className="watchlist-details">
              <p className="data-provenance-note" role="note">
                <Badge variant="neutral">Demo thesis data</Badge>
                <span>This example thesis is not a saved watchlist record.</span>
              </p>
              <div className="watchlist-details-header">
                <div>
                  <p className="watchlist-details-eyebrow">
                    {selectedMockThesis.ticker}
                  </p>
                  <h3>{selectedMockThesis.companyName}</h3>
                </div>
                <Badge variant={watchlistBadgeVariant(selectedMockThesis)}>
                  {selectedMockThesis.ideaStatus}
                </Badge>
              </div>

              <dl className="watchlist-meta-grid">
                <div>
                  <dt>Theme</dt>
                  <dd>{selectedMockThesis.theme}</dd>
                </div>
                <div>
                  <dt>Next review</dt>
                  <dd>{selectedMockThesis.nextReviewDate}</dd>
                </div>
              </dl>

              <div className="watchlist-detail-section">
                <h4>Thesis</h4>
                <p>{selectedMockThesis.thesisSummary}</p>
              </div>

              <div className="watchlist-detail-section">
                <h4>Triggers</h4>
                <p>{selectedMockThesis.reviewTriggers.join(', ')}</p>
              </div>
            </article>
          ) : null}
        </details>
      </div>
    </div>
  );
}

function formatTags(tags: string[] | undefined): string {
  return tags && tags.length > 0 ? tags.join(', ') : 'No tags';
}

function watchlistBadgeVariant(
  thesis: MockThesis
): 'accent' | 'neutral' | 'success' | 'warning' | 'risk' {
  if (thesis.ideaStatus === 'Caution') {
    return 'risk';
  }

  if (thesis.ideaStatus === 'Needs Review') {
    return 'warning';
  }

  if (thesis.ideaStatus === 'Researching') {
    return 'accent';
  }

  if (thesis.thesisStatus === 'Weakening' || thesis.riskLevel === 'High') {
    return 'warning';
  }

  return 'neutral';
}
