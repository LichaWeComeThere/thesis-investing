import { Badge } from '@thesis-investing/ui';

type MarketPulseItem = {
  headline: string;
  source: string;
  timeAgo: string;
  tickers: string[];
  move?: string;
  moveTone?: 'positive' | 'negative';
  tone: string;
};

const marketPulseItems: MarketPulseItem[] = [
  {
    headline: 'Google, Blackstone to create new AI cloud company, WSJ reports',
    source: 'Market Desk',
    timeAgo: '12 min ago',
    tickers: ['GOOGL', 'BX'],
    move: '+1.8%',
    moveTone: 'positive',
    tone: 'AI infrastructure'
  },
  {
    headline: "Japan's economy grew more than expected in Q1",
    source: 'Macro Wire',
    timeAgo: '24 min ago',
    tickers: ['EWJ'],
    tone: 'Macro'
  },
  {
    headline: 'Gold extends gains as inflation fears ease',
    source: 'Commodities Desk',
    timeAgo: '41 min ago',
    tickers: ['GLD'],
    move: '+0.9%',
    moveTone: 'positive',
    tone: 'Defensive'
  },
  {
    headline: 'Cybersecurity stocks remain resilient after earnings',
    source: 'Sector Notes',
    timeAgo: '1 hr ago',
    tickers: ['CRWD', 'PANW'],
    move: '+2.4%',
    moveTone: 'positive',
    tone: 'Relative strength'
  },
  {
    headline: 'Semiconductor leaders continue showing relative strength',
    source: 'Research Brief',
    timeAgo: '2 hr ago',
    tickers: ['NVDA', 'AVGO'],
    move: '+1.2%',
    moveTone: 'positive',
    tone: 'Momentum'
  },
  {
    headline: 'Software multiples cool as investors rotate toward cash flow',
    source: 'Strategy Desk',
    timeAgo: '3 hr ago',
    tickers: ['IGV'],
    move: '-0.6%',
    moveTone: 'negative',
    tone: 'Valuation watch'
  },
  {
    headline: 'Healthcare equipment names firm as defensive demand improves',
    source: 'Sector Notes',
    timeAgo: '4 hr ago',
    tickers: ['IHI'],
    tone: 'Quality'
  }
];

export function MarketPulseFeed(): JSX.Element {
  return (
    <aside className="market-pulse-feed" aria-label="Example market pulse">
      <div className="market-pulse-header">
        <div>
          <p>Market Pulse</p>
          <h2>Example Feed</h2>
          <small className="market-pulse-provenance">
            Static example headlines and moves, not a live feed.
          </small>
        </div>
        <Badge variant="neutral">Demo data</Badge>
      </div>

      <div className="market-pulse-list">
        {marketPulseItems.map((item) => (
          <article className="market-pulse-item" key={item.headline}>
            <div className="market-pulse-item-topline">
              <h3>{item.headline}</h3>
              <button
                aria-label={`Bookmark ${item.headline}`}
                className="market-pulse-bookmark"
                type="button"
              >
                ☆
              </button>
            </div>

            <div className="market-pulse-meta">
              <span>{item.source}</span>
              <span aria-hidden="true">·</span>
              <span>{item.timeAgo}</span>
            </div>

            <div className="market-pulse-chips" aria-label="Related market tags">
              {item.tickers.map((ticker) => (
                <span className="market-pulse-chip" key={ticker}>
                  {ticker}
                </span>
              ))}
              {item.move ? (
                <span
                  className={`market-pulse-chip market-pulse-chip--${item.moveTone}`}
                >
                  {item.move}
                </span>
              ) : null}
              <span className="market-pulse-chip market-pulse-chip--tone">
                {item.tone}
              </span>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
