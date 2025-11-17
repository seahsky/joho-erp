'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@jimmy-beef/ui';
import type { FinancialInfo } from '../page';

interface FinancialStepProps {
  data: Partial<FinancialInfo>;
  onChange: (data: Partial<FinancialInfo>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function FinancialStep({ data, onChange, onNext, onBack }: FinancialStepProps) {
  const t = useTranslations('onboarding.financial');
  const [formData, setFormData] = useState<Partial<FinancialInfo>>(data);

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const validate = () => {
    return (
      formData.bankName &&
      formData.accountName &&
      formData.bsb &&
      /^\d{6}$/.test(formData.bsb) &&
      formData.accountNumber
    );
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    } else {
      alert(t('validation.allFieldsRequired'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-gray-600">{t('description')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bankName">{t('fields.bankName')}</Label>
          <Input
            id="bankName"
            value={formData.bankName || ''}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            placeholder={t('placeholders.bankName')}
          />
        </div>

        <div>
          <Label htmlFor="accountName">{t('fields.accountName')}</Label>
          <Input
            id="accountName"
            value={formData.accountName || ''}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
            placeholder={t('placeholders.accountName')}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="bsb">{t('fields.bsb')}</Label>
            <Input
              id="bsb"
              maxLength={6}
              value={formData.bsb || ''}
              onChange={(e) => setFormData({ ...formData, bsb: e.target.value.replace(/\D/g, '') })}
              placeholder="123456"
            />
          </div>
          <div>
            <Label htmlFor="accountNumber">{t('fields.accountNumber')}</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber || ''}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder={t('placeholders.accountNumber')}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button onClick={handleNext}>{t('buttons.next')}</Button>
      </div>
    </div>
  );
}
