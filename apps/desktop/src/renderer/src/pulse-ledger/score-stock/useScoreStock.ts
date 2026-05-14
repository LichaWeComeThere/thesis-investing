import { useContext } from 'react';
import { ScoreCtx, type Ctx } from './ScoreStockContext';

export function useScoreStock(): Ctx {
  const v = useContext(ScoreCtx);
  if (!v) throw new Error('useScoreStock must be used within ScoreStockProvider');
  return v;
}
