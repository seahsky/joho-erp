'use client';

import { Check } from 'lucide-react';
import { cn } from '@joho-erp/ui';

export interface Step {
  id: string;
  label: string;
  shortLabel?: string;
}

interface StepperProps {
  steps: Step[];
  currentStepIndex: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStepIndex,
  onStepClick,
  className,
}: StepperProps) {
  const handleStepClick = (index: number) => {
    // Only allow clicking on completed steps or current step
    if (onStepClick && index <= currentStepIndex) {
      onStepClick(index);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;
          const isClickable = index <= currentStepIndex && onStepClick;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200',
                    isCompleted && 'bg-green-500 border-green-500 text-white',
                    isCurrent && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20',
                    isPending && 'bg-muted border-border text-muted-foreground',
                    isClickable && 'cursor-pointer hover:scale-105 hover:shadow-md',
                    !isClickable && isPending && 'cursor-not-allowed',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>

                {/* Step label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center max-w-[80px] leading-tight',
                    isCompleted && 'text-green-600 dark:text-green-500',
                    isCurrent && 'text-primary font-semibold',
                    isPending && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors duration-200',
                    index < currentStepIndex ? 'bg-green-500' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view - compact dots */}
      <div className="flex sm:hidden flex-col items-center gap-3">
        {/* Current step label */}
        <div className="text-center">
          <span className="text-sm font-medium text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <h3 className="text-base font-semibold text-foreground mt-0.5">
            {steps[currentStepIndex]?.shortLabel || steps[currentStepIndex]?.label}
          </h3>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;
            const isClickable = index <= currentStepIndex && onStepClick;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'transition-all duration-200 rounded-full',
                  isCompleted && 'h-2.5 w-2.5 bg-green-500',
                  isCurrent && 'h-3 w-3 bg-primary ring-4 ring-primary/20',
                  isPending && 'h-2.5 w-2.5 bg-border',
                  isClickable && 'cursor-pointer hover:scale-125',
                  !isClickable && isPending && 'cursor-not-allowed',
                )}
                aria-label={`Go to ${step.label}`}
                aria-current={isCurrent ? 'step' : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
