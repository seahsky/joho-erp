'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@joho-erp/ui';
import type { TradeReferenceInfo } from '../page';

// Maximum number of trade references allowed (PDF template limit)
const MAX_TRADE_REFERENCES = 1;

interface TradeReferencesStepProps {
  data: TradeReferenceInfo[];
  onChange: (data: TradeReferenceInfo[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TradeReferencesStep({ data, onChange, onNext, onBack }: TradeReferencesStepProps) {
  const t = useTranslations('onboarding.tradeReferences');
  const [references, setReferences] = useState<TradeReferenceInfo[]>(data);

  function createEmptyReference(): TradeReferenceInfo {
    return { companyName: '', contactPerson: '', phone: '', email: '' };
  }

  const updateReference = (index: number, field: keyof TradeReferenceInfo, value: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    setReferences(updated);
    onChange(updated);
  };

  const addReference = () => {
    if (references.length >= MAX_TRADE_REFERENCES) {
      return;
    }
    const updated = [...references, createEmptyReference()];
    setReferences(updated);
    onChange(updated);
  };

  const canAddMoreReferences = references.length < MAX_TRADE_REFERENCES;

  const removeReference = (index: number) => {
    const updated = references.filter((_, i) => i !== index);
    setReferences(updated);
    onChange(updated);
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-gray-600">{t('description')}</p>
      </div>

      {references.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-gray-600">{t('noReferences')}</p>
          <Button onClick={addReference}>{t('buttons.addFirst')}</Button>
        </div>
      ) : (
        <>
          {references.map((ref, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">
                  {t('referenceNumber', { number: index + 1 })}
                </h3>
                <Button variant="destructive" size="sm" onClick={() => removeReference(index)}>
                  {t('buttons.remove')}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('fields.companyName')}</Label>
                  <Input
                    value={ref.companyName}
                    onChange={(e) => updateReference(index, 'companyName', e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('fields.contactPerson')}</Label>
                  <Input
                    value={ref.contactPerson}
                    onChange={(e) => updateReference(index, 'contactPerson', e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('fields.phone')}</Label>
                  <Input
                    value={ref.phone}
                    onChange={(e) => updateReference(index, 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('fields.email')}</Label>
                  <Input
                    type="email"
                    value={ref.email}
                    onChange={(e) => updateReference(index, 'email', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          {canAddMoreReferences && (
            <Button variant="outline" onClick={addReference}>
              {t('buttons.addAnother')}
            </Button>
          )}
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button onClick={handleNext}>{t('buttons.next')}</Button>
      </div>
    </div>
  );
}
