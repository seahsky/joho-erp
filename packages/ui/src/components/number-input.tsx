'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

const numberInputVariants = cva(
  'flex w-full items-center rounded-md border border-input bg-background ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-10 text-sm',
        default: 'h-11 text-sm',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const stepperButtonVariants = cva(
  'flex items-center justify-center shrink-0 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50 focus:outline-none',
  {
    variants: {
      size: {
        sm: 'h-full w-9',
        default: 'h-full w-10',
        lg: 'h-full w-11',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange' | 'prefix'>,
    VariantProps<typeof numberInputVariants> {
  /** Content to display before the input (e.g., $ icon or text) */
  prefix?: React.ReactNode;
  /** Content to display after the input (e.g., "kg" or "units") */
  suffix?: React.ReactNode;
  /** Show increment/decrement stepper buttons */
  showStepper?: boolean;
  /** Callback when value changes - provides both string and parsed numeric value */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback with parsed numeric value (null if invalid) */
  onValueChange?: (value: number | null) => void;
  /** Additional className for the container */
  containerClassName?: string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      containerClassName,
      size,
      prefix,
      suffix,
      showStepper = false,
      disabled,
      min,
      max,
      step = 1,
      value,
      onChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = useCombinedRefs(ref, inputRef);

    const parseValue = (val: string | number | readonly string[] | undefined): number | null => {
      if (val === undefined || val === '' || val === null) return null;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return isNaN(num) ? null : num;
    };

    const clampValue = (num: number): number => {
      let result = num;
      const minNum = min !== undefined ? (typeof min === 'number' ? min : parseFloat(min)) : undefined;
      const maxNum = max !== undefined ? (typeof max === 'number' ? max : parseFloat(max)) : undefined;
      if (minNum !== undefined && !isNaN(minNum)) result = Math.max(minNum, result);
      if (maxNum !== undefined && !isNaN(maxNum)) result = Math.min(maxNum, result);
      return result;
    };

    const handleStep = (direction: 'up' | 'down') => {
      if (disabled) return;

      const currentValue = parseValue(value ?? inputRef.current?.value) ?? 0;
      const stepValue = typeof step === 'number' ? step : parseFloat(step) || 1;
      const newValue = direction === 'up' ? currentValue + stepValue : currentValue - stepValue;
      const clampedValue = clampValue(newValue);

      // Round to avoid floating point issues
      const decimals = String(stepValue).split('.')[1]?.length ?? 0;
      const roundedValue = Number(clampedValue.toFixed(decimals));

      // Trigger a synthetic change event
      if (inputRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(inputRef.current, String(roundedValue));
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
      }

      onValueChange?.(roundedValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      const numValue = parseValue(e.target.value);
      onValueChange?.(numValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleStep('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleStep('down');
      }
    };

    const currentNumValue = parseValue(value ?? inputRef.current?.value);
    const minNum = min !== undefined ? (typeof min === 'number' ? min : parseFloat(String(min))) : undefined;
    const maxNum = max !== undefined ? (typeof max === 'number' ? max : parseFloat(String(max))) : undefined;
    const isAtMin = minNum !== undefined && !isNaN(minNum) && currentNumValue !== null && currentNumValue <= minNum;
    const isAtMax = maxNum !== undefined && !isNaN(maxNum) && currentNumValue !== null && currentNumValue >= maxNum;

    return (
      <div
        className={cn(
          numberInputVariants({ size }),
          disabled && 'cursor-not-allowed opacity-50',
          containerClassName
        )}
      >
        {/* Decrement button */}
        {showStepper && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || isAtMin}
            onClick={() => handleStep('down')}
            className={cn(
              stepperButtonVariants({ size }),
              'rounded-l-md border-r border-input'
            )}
            aria-label="Decrease value"
          >
            <Minus className="h-4 w-4" />
          </button>
        )}

        {/* Prefix */}
        {prefix && (
          <span
            className={cn(
              'flex items-center text-muted-foreground shrink-0',
              showStepper ? 'pl-3' : 'pl-3'
            )}
          >
            {prefix}
          </span>
        )}

        {/* Input */}
        <input
          type="number"
          ref={combinedRef}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            !prefix && !showStepper && 'pl-3',
            !suffix && !showStepper && 'pr-3',
            prefix && 'pl-1',
            suffix && 'pr-1',
            className
          )}
          {...props}
        />

        {/* Suffix */}
        {suffix && (
          <span
            className={cn(
              'flex items-center text-muted-foreground shrink-0',
              showStepper ? 'pr-3' : 'pr-3'
            )}
          >
            {suffix}
          </span>
        )}

        {/* Increment button */}
        {showStepper && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || isAtMax}
            onClick={() => handleStep('up')}
            className={cn(
              stepperButtonVariants({ size }),
              'rounded-r-md border-l border-input'
            )}
            aria-label="Increase value"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';

// Helper hook to combine refs
function useCombinedRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return React.useCallback(
    (element: T) => {
      refs.forEach((ref) => {
        if (!ref) return;
        if (typeof ref === 'function') {
          ref(element);
        } else {
          (ref as React.MutableRefObject<T>).current = element;
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs
  );
}

export { NumberInput, numberInputVariants };
