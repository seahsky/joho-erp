'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@joho-erp/ui';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FloatingSaveBarProps {
  /** Called when save button is clicked */
  onSave: () => void;
  /** Called when cancel button is clicked */
  onCancel: () => void;
  /** Whether save operation is in progress */
  isSaving: boolean;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Custom label for save button */
  saveLabel?: string;
  /** Custom label for cancel button */
  cancelLabel?: string;
  /** Custom label shown while saving */
  savingLabel?: string;
}

export function FloatingSaveBar({
  onSave,
  onCancel,
  isSaving,
  hasChanges,
  saveLabel,
  cancelLabel,
  savingLabel,
}: FloatingSaveBarProps) {
  const t = useTranslations('common');
  const inlineRef = useRef<HTMLDivElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  // Resolve labels with translations as fallback
  const resolvedSaveLabel = saveLabel || t('save');
  const resolvedCancelLabel = cancelLabel || t('cancel');
  const resolvedSavingLabel = savingLabel || t('saving');

  useEffect(() => {
    const inlineElement = inlineRef.current;
    if (!inlineElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show floating bar when inline version is not fully visible
        setShowFloating(!entry.isIntersecting);
      },
      {
        // Trigger when the element leaves the viewport
        threshold: 0,
        rootMargin: '0px',
      }
    );

    observer.observe(inlineElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  const renderButtons = () => (
    <>
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={!hasChanges || isSaving}
      >
        {resolvedCancelLabel}
      </Button>
      <Button
        onClick={onSave}
        disabled={!hasChanges || isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {resolvedSavingLabel}
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {resolvedSaveLabel}
          </>
        )}
      </Button>
    </>
  );

  return (
    <>
      {/* Inline button group at natural DOM position */}
      <div ref={inlineRef} className="flex items-center gap-2">
        {renderButtons()}
      </div>

      {/* Floating bar that appears when inline version scrolls out of view */}
      <div
        className={`
          fixed bottom-6 right-6 z-50
          flex items-center gap-2
          bg-background/95 backdrop-blur-sm
          border rounded-lg shadow-lg
          px-4 py-3
          transition-all duration-200 ease-out
          ${showFloating && hasChanges
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
      >
        {renderButtons()}
      </div>
    </>
  );
}
