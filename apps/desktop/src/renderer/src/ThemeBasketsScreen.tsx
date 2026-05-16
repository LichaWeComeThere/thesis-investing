import { Badge, Card, PageHeader } from '@thesis-investing/ui';
import { useMemo, useState } from 'react';
import {
  STATIC_THEME_BASKETS,
  getStaticThemeBasketById
} from './themeBasketData';
import './themeBaskets.css';

type ThemeBasketsScreenProps = {
  initialSelectedBasketId?: string;
};

export function ThemeBasketsScreen({
  initialSelectedBasketId
}: ThemeBasketsScreenProps): JSX.Element {
  const [selectedBasketId, setSelectedBasketId] = useState(
    initialSelectedBasketId ?? STATIC_THEME_BASKETS[0].id
  );
  const selectedBasket = useMemo(
    () =>
      getStaticThemeBasketById(selectedBasketId) ?? STATIC_THEME_BASKETS[0],
    [selectedBasketId]
  );

  return (
    <div className="theme-baskets-screen">
      <PageHeader
        badge={<Badge variant="accent">Static education only</Badge>}
        description="Browse fixed educational groupings for organizing research ideas by theme. These baskets are not personalized recommendations, model portfolios, allocation advice, or buy/sell/hold lists."
        eyebrow="Phase 1 Theme Baskets"
        title="Theme Baskets"
      />

      <Card className="theme-baskets-library-card" title="Static basket library">
        <div className="theme-baskets-disclaimer">
          Baskets are static educational organization aids. No live updates,
          stock APIs, brokerage connection, trading execution, AI analysis, or
          cloud sync is used.
        </div>

        <div className="theme-baskets-layout">
          <div
            aria-label="Static theme basket list"
            className="theme-baskets-list"
          >
            {STATIC_THEME_BASKETS.map((basket) => {
              const isSelected = basket.id === selectedBasket.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`theme-basket-list-item${
                    isSelected ? ' selected' : ''
                  }`}
                  key={basket.id}
                  onClick={() => setSelectedBasketId(basket.id)}
                  type="button"
                >
                  <span>{basket.name}</span>
                  <small>{basket.description}</small>
                </button>
              );
            })}
          </div>

          <article className="theme-basket-details">
            <div className="theme-basket-details-header">
              <div>
                <p className="theme-basket-details-eyebrow">
                  Educational theme
                </p>
                <h2>{selectedBasket.name}</h2>
              </div>
              <Badge variant="neutral">Static</Badge>
            </div>

            <p className="theme-basket-description">
              {selectedBasket.description}
            </p>

            <section className="theme-basket-section">
              <h3>Educational rationale</h3>
              <p>{selectedBasket.educationalRationale}</p>
            </section>

            <section className="theme-basket-section">
              <h3>Tags</h3>
              <div className="theme-basket-tags">
                {selectedBasket.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="theme-basket-section">
              <h3>Example companies</h3>
              <div className="theme-basket-example-table-wrap">
                <table className="theme-basket-example-table">
                  <thead>
                    <tr>
                      <th scope="col">Ticker</th>
                      <th scope="col">Company</th>
                      <th scope="col">Example context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBasket.examples.map((example) => (
                      <tr key={`${selectedBasket.id}-${example.companyName}`}>
                        <td>{example.ticker ?? 'N/A'}</td>
                        <td>{example.companyName}</td>
                        <td>{example.note ?? 'Static educational example.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="theme-basket-safety-note">
              {selectedBasket.nonAdvisoryNote} Examples are not ranked, weighted,
              or tied to allocation guidance.
            </div>
          </article>
        </div>
      </Card>
    </div>
  );
}
