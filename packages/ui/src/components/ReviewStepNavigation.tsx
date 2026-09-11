export type ReviewStep = { id: string; label: string; description: string };

export function ReviewStepNavigation({ steps, currentIndex, disabled, onSelect }: {
  steps: readonly ReviewStep[];
  currentIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
}): JSX.Element {
  return (
    <nav className="review-steps" aria-label="Review sections">
      <p className="review-step-count">Step {currentIndex + 1} of {steps.length}</p>
      <ol>
        {steps.map((step, index) => (
          <li key={step.id}>
            <button type="button" aria-current={index === currentIndex ? 'step' : undefined}
              disabled={disabled || index > currentIndex} onClick={() => onSelect(index)}>
              <span className="review-step-number" aria-hidden="true">{index + 1}</span>
              <span><strong>{step.label}</strong><small>{index < currentIndex ? 'Reviewed · Edit again' : step.description}</small></span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
