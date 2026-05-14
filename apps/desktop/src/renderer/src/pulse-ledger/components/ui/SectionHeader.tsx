import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ eyebrow, title, description, action, className = '' }: Props): JSX.Element {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`.trim()}>
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-mist">{eyebrow}</p>
        ) : null}
        <h2 className={`text-xl font-semibold tracking-tight text-pl-ink sm:text-2xl ${eyebrow ? 'mt-2' : ''}`}>
          {title}
        </h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-pl-slate">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
