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
import './watchlist.css';

type WatchlistScreenProps = {
  initialForm?: WatchlistFormState;
  initialItems?: LocalWatchlistItem[];
  initialStorageErrors?: string[];
  initialSelectedItemId?: string;
  storageClient?: WatchlistStorageClient | null;
};

export function WatchlistScreen({
  initialForm,
  initialItems = [],
  initialStorageErrors = [],
  storageClient,
  initialSelectedItemId
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
  const taggedItemCount = items.filter(
    (item) => item.tags && item.tags.length > 0
  ).length;
  const shouldShowValidation =
    saveAttempted || (hasWatchlistFormContent(form) && !formResult.validation.valid);
  const visibleValidationErrors = shouldShowValidation
    ? formResult.validation.errors
    : [];

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
        badge={<Badge variant="accent">Manual entries only</Badge>}
        description="Track user-entered symbols or companies locally. This watchlist is educational and non-advisory, with no live prices, alerts, APIs, brokerage, trading execution, AI, or sync."
        eyebrow="Phase 1 Watchlist"
        title="Watchlist"
      />

      <div className="watchlist-workspace-grid">
        <Card className="watchlist-form-card" title="Add or edit watchlist item">
          <div className="watchlist-disclaimer">
            Items are manually entered by the user. No live prices, external APIs,
            price alerts, brokerage connection, trading execution, AI analysis, or
            cloud sync is used. Ticker, company name, tags, and notes are stored
            locally on this device; thesis reference text is kept only in this
            current app session for now.
          </div>

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
              placeholder="Manual context for why this belongs on the watchlist."
              rows={4}
              value={form.note}
            />
          </label>

          {visibleValidationErrors.length > 0 ? (
            <div className="watchlist-validation" role="alert">
              <h3>Validation</h3>
              <ul>
                {visibleValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {storageErrors.length > 0 ? (
            <div className="watchlist-storage-status" role="alert">
              <h3>Storage</h3>
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

        <Card className="watchlist-summary-card" emphasis title="Watchlist pulse">
          <div className="watchlist-summary-hero">
            <span>Tracked ideas</span>
            <strong>{items.length}</strong>
            <Badge variant={items.length > 0 ? 'accent' : 'neutral'}>
              Manual only
            </Badge>
          </div>

          <div className="watchlist-summary-grid">
            <div>
              <span>Tagged</span>
              <strong>{taggedItemCount}</strong>
            </div>
            <div>
              <span>Selected</span>
              <strong>{selectedItem ? selectedItem.ticker : 'None'}</strong>
            </div>
          </div>

          <div className="watchlist-next-action">
            <h3>Next action</h3>
            <p>
              {selectedItem
                ? 'Review the selected idea detail card below or update its local note.'
                : 'Save or select a watchlist item to populate the detail panel.'}
            </p>
          </div>
        </Card>
      </div>

      <div className="watchlist-layout">
        <Card title="Local watchlist items">
          {isLoading ? (
            <p>Loading persisted watchlist items...</p>
          ) : items.length > 0 ? (
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
          ) : (
            <p>No local watchlist items yet.</p>
          )}
        </Card>

        <Card title="Selected item details">
          {selectedItem ? (
            <article className="watchlist-details">
              <div className="watchlist-details-header">
                <div>
                  <p className="watchlist-details-eyebrow">
                    {selectedItem.ticker}
                  </p>
                  <h3>{selectedItem.companyName ?? 'Company not provided'}</h3>
                </div>
                <Badge variant="neutral">Manual</Badge>
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
            <p>Select or save a local watchlist item to review details.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatTags(tags: string[] | undefined): string {
  return tags && tags.length > 0 ? tags.join(', ') : 'No tags';
}
