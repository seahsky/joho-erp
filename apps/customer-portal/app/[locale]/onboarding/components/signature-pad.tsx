'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import SignaturePad from 'signature_pad';
import { Button } from '@joho-erp/ui';

interface SignaturePadComponentProps {
  id: string;
  label: string;
  description?: string;
  onSignatureChange: (data: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function SignaturePadComponent({
  id,
  label,
  description,
  onSignatureChange,
  disabled = false,
  required = false,
  error,
}: SignaturePadComponentProps) {
  const t = useTranslations('onboarding.signatures.signaturePad');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  // Initialize signature pad once on mount.
  // The initialization creates event listeners that use onSignatureChange via closure,
  // so re-running this effect is unnecessary and causes signature loss.
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });

    signaturePadRef.current = signaturePad;

    // Handle resize
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const container = canvas.parentElement;
      if (!container) return;

      // Save existing signature data before resizing
      const signatureData = signaturePad.isEmpty()
        ? null
        : signaturePad.toData();

      const width = container.clientWidth;
      const height = 150; // Fixed height

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
      }

      // Restore signature data after resizing
      if (signatureData) {
        signaturePad.fromData(signatureData);
      } else {
        // Only clear if there was no signature
        signaturePad.clear();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Handle signature end event
    signaturePad.addEventListener('endStroke', () => {
      if (!signaturePad.isEmpty()) {
        const dataUrl = signaturePad.toDataURL('image/png');
        onSignatureChange(dataUrl);
      }
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      signaturePad.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  // Note: onSignatureChange is intentionally excluded from dependencies.
  // It's a stable callback that doesn't need to trigger reinitialization.
  // Including it causes signatures to clear when parent re-renders with
  // new inline function references.

  // Handle disabled state
  useEffect(() => {
    if (signaturePadRef.current) {
      if (disabled) {
        signaturePadRef.current.off();
      } else {
        signaturePadRef.current.on();
      }
    }
  }, [disabled]);

  const handleClear = useCallback(() => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onSignatureChange(null);
    }
  }, [onSignatureChange]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      <div
        className={`relative rounded-lg border-2 ${
          error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 bg-white'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <canvas
          ref={canvasRef}
          id={id}
          className="w-full touch-none rounded-lg"
          aria-label={t('accessibility', { name: label })}
        />
        {!disabled && (
          <div className="absolute bottom-2 right-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs"
            >
              {t('clear')}
            </Button>
          </div>
        )}
        {!disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="select-none text-sm text-gray-400">
              {t('tapToSign')}
            </span>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
