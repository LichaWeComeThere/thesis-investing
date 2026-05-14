import { Badge, Button, Card, PageHeader } from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  buildWatchlistItemFromForm,
  createEmptyWatchlistForm,
  hasWatchlistFormContent,
  removeLocalWatchlistItem,
  upsertLocalWatchlistItem,
  watchlistItemToForm,
  type LocalWatchlistItem,
  type WatchlistFormState
} from './watchlistInput';
import './watchlist.css';

type WatchlistScreenProps = {
  initialForm?: WatchlistFormState;
  initialItems?: LocalWatchlistItem[];
  initialSelectedItemId?: string;
};

export function WatchlistScreen({
  initialForm,
  initialItems = [],
  initialSelectedItemId
}: WatchlistScreenProps): JSX.Element {
  const [items, setItems] = useState<LocalWatchlistItem[]>(() =>
    initialItems.map((item) => ({ ...item }))
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialSelectedItemId ?? initialItems[0]?.id ?? null
  );
  const [nextItemNumber, setNextItemNumber] = useState(initialItems.length + 1);
  const [saveAttempted, setSaveAttempted] = useState(false);
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
    saveAttempted || (hasWatchlistFormContent(form) && !formResult.validation.valid);
  const visibleValidationErrors = shouldShowValidation
    ? formResult.validation.errors
    : [];

  function updateForm(
    field: keyof Omit<WatchlistFormState, 'id'>,
    value: string
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function saveItem(): void {
    setSaveAttempted(true);

    if (!formResult.validation.valid) {
      return;
    }

    const nextItem = formResult.item;
    const isNewItem = !items.some((item) => item.id === nextItem.id);

    setItems((currentItems) =>
      upsertLocalWatchlistItem(currentItems, nextItem)
    );
    setSelectedItemId(nextItem.id);
    setForm(watchlistItemToForm(nextItem));
    setSaveAttempted(false);

    if (isNewItem) {
      setNextItemNumber((currentNumber) => currentNumber + 1);
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

  function removeItem(itemId: string): void {
    setItems((currentItems) => removeLocalWatchlistItem(currentItems, itemId));

    if (selectedItemId === itemId) {
      setSelectedItemId(null);
      setForm(createEmptyWatchlistForm(nextItemNumber));
      setSaveAttempted(false);
    }
  }

  return (
    <div className="watchlist-screen">
      <PageHeader
        badge={<Badge variant="accent">Manual entries only</Badge>}
        description="Track user-entered symbols or companies locally. This watchlist is educational and non-advisory, with no live prices, alerts, APIs, brokerage, trading execution, AI, or sync."
        eyebrow="Phase 1 Watchlist"
        title="Watchlist"
      />

      <Card title="Add or edit watchlist item">
        <div className="watchlist-disclaimer">
          Items are manually entered by the user. No live prices, external APIs,
          price alerts, brokerage connection, trading execution, AI analysis, or
          cloud sync is used.
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

        <div className="watchlist-actions">
          <Button onClick={saveItem} type="button">
            Save item
          </Button>
          <Button onClick={startNewItem} type="button" variant="secondary">
            New item
          </Button>
        </div>
      </Card>

      <div className="watchlist-layout">
        <Card title="Local watchlist items">
          {items.length > 0 ? (
            <div className="ti-table-panel watchlist-table-wrap">
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
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => removeItem(item.id)}
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
