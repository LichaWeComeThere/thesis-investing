import type { LivingThesisHistory, LivingThesisHistoryItem, LivingThesisHistoryScore, ManualBusinessScoreCategory } from '@thesis-investing/core';
import { Button, Card } from '@thesis-investing/ui';
import { useEffect, useState } from 'react';
import type { DecisionsStorageApi } from '../../shared/decisionsStorage';
import type { ThesisHistoryStorageApi } from '../../shared/thesisHistoryStorage';
import { DecisionLogPanel, type DecisionNavigationRequest } from './DecisionLogPanel';

const factorLabels: Record<ManualBusinessScoreCategory, string> = {
  businessQuality: 'Business quality', moat: 'Competitive advantage', management: 'Management',
  balanceSheet: 'Balance sheet', growth: 'Growth', valuation: 'Valuation', risk: 'Risk resilience'
};

export function ThesisHistoryPanel({ thesisId, thesisVersion, entityName, client, decisionClient, disabled, navigationRequest, onGuardChange }: {
  thesisId: string;
  thesisVersion: number;
  entityName: string;
  client: ThesisHistoryStorageApi;
  decisionClient: DecisionsStorageApi | null;
  disabled?: boolean;
  navigationRequest?: DecisionNavigationRequest;
  onGuardChange: (guarded: boolean) => void;
}): JSX.Element {
  const [history, setHistory] = useState<LivingThesisHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [reload, setReload] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true); setErrors([]);
    void client.get(thesisId).then((result) => {
      if (!current) return;
      if (result.ok) setHistory(result.value);
      else { setHistory(null); setErrors(result.errors); }
    }).catch(() => {
      if (current) { setHistory(null); setErrors(['Your history could not be loaded. Try again.']); }
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [client, thesisId, thesisVersion, reload]);

  const visible = history ? showAll ? history.items : history.items.slice(0, 5) : [];
  const hasResearchHistory = history?.items.some((item) => ['review', 'decision', 'score'].includes(item.kind));
  return <Card className="thesis-history-card" aria-label={`History for ${entityName}`}>
    <DecisionLogPanel thesisId={thesisId} entityName={entityName} client={decisionClient} disabled={disabled}
      navigationRequest={navigationRequest} onGuardChange={onGuardChange} embedded showEntries={false}
      onDecisionSaved={() => setReload((value) => value + 1)}
      heading={<div><h2>History</h2><p>Reviews, decisions and business scores for {entityName}.</p></div>} />
    <p className="thesis-history-coverage">Completed reviews and decisions are preserved here. Direct edits on the Board may not appear.</p>
    {loading ? <p role="status">Loading history…</p> : null}
    {errors.length > 0 ? <div className="thesis-history-error" role="alert"><p>{errors.join(' ')}</p><Button type="button" variant="secondary" onClick={() => setReload((value) => value + 1)}>Try history again</Button></div> : null}
    {!loading && history ? <>
      {history.scores.length === 0 ? <p className="thesis-history-score-status">No review-linked scores yet. Add a business score when you complete a review.</p> : <p className="thesis-history-score-status">Latest business score: <strong>{scoreValue(history.scores[0])}</strong><span>{scoreChange(history.scores[0])}</span></p>}
      {!hasResearchHistory ? <p className="thesis-history-empty">No completed reviews or decisions yet. Start a review or add a decision to build this history.</p> : null}
      <ol className="thesis-history-list" aria-label="Thesis history">{visible.map((item) => <li key={item.id}><HistoryEntry item={item} /></li>)}</ol>
      {history.items.length > 5 ? <Button type="button" variant="ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show recent history' : `Show all history (${history.items.length})`}</Button> : null}
    </> : null}
  </Card>;
}

function HistoryEntry({ item }: { item: LivingThesisHistoryItem }): JSX.Element {
  if (item.kind === 'created' || item.kind === 'archived') return <div className="thesis-history-marker"><div><strong>{item.kind === 'created' ? 'Thesis created' : 'Currently archived'}</strong><time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time></div>{item.kind === 'archived' ? <p>This marker reflects the current saved status; earlier archive changes may not be recorded.</p> : null}</div>;
  const title = item.kind === 'review' ? 'Review completed' : item.kind === 'decision' ? `Decision: ${item.decision.title}` : `Business score: ${scoreValue(item.score)}`;
  const subtitle = item.kind === 'review' ? item.session.workflow.reviewReason : item.kind === 'score' ? scoreChange(item.score) : 'Decision and reasoning';
  return <details className="thesis-history-entry">
    <summary><span className="thesis-history-summary"><strong>{title}</strong><span>{subtitle}</span><time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time></span><span className="thesis-history-expand" aria-hidden="true">Details</span></summary>
    <div className="thesis-history-details">
      {item.kind === 'review' ? <>
        <p className="thesis-history-version">Thesis version {item.revision.before.version} → {item.revision.after.version}</p>
        {item.session.workflow.notes ? <section aria-label="Review notes"><h3>Review notes</h3><p className="thesis-history-text">{item.session.workflow.notes}</p></section> : null}
        {item.changes.length === 0 ? <p>No thesis changes in this review.</p> : <div className="thesis-history-changes">{item.changes.map((change, index) => <section key={`${change.label}-${index}`} aria-label={change.label}><h3>{change.label}</h3><dl><div><dt>Before</dt><dd>{change.before ?? 'Not set'}</dd></div><div><dt>After</dt><dd>{change.after ?? 'Not set'}</dd></div></dl></section>)}</div>}
        <p>{item.revision.scoreSnapshotId ? 'A business score was recorded with this review.' : 'No new business score recorded.'}</p>
      </> : item.kind === 'decision' ? <><h3>Reason</h3><p className="thesis-history-text">{item.decision.rationale}</p>{item.reviewReason ? <section aria-label="Linked review"><h3>Linked review</h3><p className="thesis-history-text">{item.reviewReason}</p></section> : null}</> : <ScoreDetails score={item.score} />}
    </div>
  </details>;
}

function ScoreDetails({ score }: { score: LivingThesisHistoryScore }): JSX.Element {
  return <><p>{scoreChange(score)}</p><table className="thesis-history-score-table"><caption>Ratings recorded with this score</caption><thead><tr><th scope="col">Factor</th><th scope="col">Rating</th></tr></thead><tbody>{Object.entries(factorLabels).map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{score.snapshot.input[key as ManualBusinessScoreCategory]} / 10</td></tr>)}</tbody></table>{score.snapshot.input.notes ? <section aria-label="Score notes"><h3>Score notes</h3><p className="thesis-history-text">{score.snapshot.input.notes}</p></section> : null}</>;
}

function scoreValue(score: LivingThesisHistoryScore): string { return `${score.snapshot.score} / ${score.snapshot.maxScore}`; }
function scoreChange(score: LivingThesisHistoryScore): string {
  if (score.change === undefined) return 'First recorded review score';
  if (score.change === 0) return 'No change from the previous score';
  return `${score.change > 0 ? '+' : '−'}${Math.abs(score.change)} points from the previous score`;
}
function formatDate(value: string): string { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
