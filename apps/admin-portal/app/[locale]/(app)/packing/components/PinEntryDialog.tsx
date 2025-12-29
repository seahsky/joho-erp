'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
} from '@joho-erp/ui';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PinEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPinSubmit: (pin: string) => Promise<boolean>; // Returns true if PIN was accepted
  isLoading: boolean;
}

export function PinEntryDialog({
  open,
  onOpenChange,
  onPinSubmit,
  isLoading,
}: PinEntryDialogProps) {
  const t = useTranslations('packing.pinDialog');
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPin(['', '', '', '']);
      setError(null);
      // Focus first input after dialog opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  // Check lockout
  const isLockedOut = lockoutUntil ? new Date() < lockoutUntil : false;

  const handleSubmit = useCallback(async (fullPin: string) => {
    if (isLockedOut || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onPinSubmit(fullPin);

      if (!success) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setError(t('invalidPin'));
        setPin(['', '', '', '']);

        // Focus first input after error
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);

        // Lockout after 5 failed attempts
        if (newAttempts >= 5) {
          const lockoutTime = new Date(Date.now() + 30000); // 30 seconds
          setLockoutUntil(lockoutTime);
          setError(t('tooManyAttempts'));
          setTimeout(() => {
            setLockoutUntil(null);
            setFailedAttempts(0);
            setError(null);
            // Focus first input after lockout ends
            inputRefs.current[0]?.focus();
          }, 30000);
        }
      } else {
        setFailedAttempts(0);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isLockedOut, isSubmitting, onPinSubmit, failedAttempts, t]);

  const handlePinChange = useCallback((index: number, value: string) => {
    if (isLockedOut || isSubmitting) return;

    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Take only last character
    setPin(newPin);
    setError(null);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        handleSubmit(fullPin);
      }
    }
  }, [isLockedOut, isSubmitting, pin, handleSubmit]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  }, [pin, onOpenChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      const newPin = pastedData.split('');
      setPin(newPin);
      handleSubmit(pastedData);
    }
  }, [handleSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* PIN Inputs */}
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {pin.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading || isSubmitting || isLockedOut}
                className="w-14 h-14 text-center text-2xl font-bold"
                autoComplete="off"
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {(isLoading || isSubmitting) && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || isSubmitting}
          >
            {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
