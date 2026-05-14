import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className = '' }: Props): JSX.Element {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[24px] border border-dashed border-pl-border-strong bg-pl-muted/20 px-6 py-12 text-center sm:rounded-[28px] ${className}`.trim()}
    >
      <p className="text-base font-semibold text-pl-ink">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-pl-slate">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
