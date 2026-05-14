import { HelpCircle } from 'lucide-react';

export function TermTip({ text }: { text: string }): JSX.Element {
  return (
    <span className="inline-flex shrink-0 cursor-help text-pl-mist" title={text}>
      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  );
}
