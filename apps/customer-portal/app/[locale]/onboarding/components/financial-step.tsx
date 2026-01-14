'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, useToast } from '@joho-erp/ui';
import type { FinancialInfo } from '../page';

interface FinancialStepProps {
  data: Partial<FinancialInfo>;
  onChange: (data: Partial<FinancialInfo>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function FinancialStep({ data, onChange, onNext, onBack }: FinancialStepProps) {
  const t = useTranslations('onboarding.financial');
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<FinancialInfo>>(data);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  const updateField = (field: keyof FinancialInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
    clearFieldError(field);
  };

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.bankName?.trim()) {
      errors.bankName = t('validation.bankNameRequired');
      isValid = false;
    }

    if (!formData.accountName?.trim()) {
      errors.accountName = t('validation.accountNameRequired');
      isValid = false;
    }

    if (!formData.bsb?.trim()) {
      errors.bsb = t('validation.bsbRequired');
      isValid = false;
    } else if (!/^\d{6}$/.test(formData.bsb)) {
      errors.bsb = t('validation.bsbInvalid');
      isValid = false;
    }

    if (!formData.accountNumber?.trim()) {
      errors.accountNumber = t('validation.accountNumberRequired');
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleNext = () => {
    if (validateFields()) {
      onNext();
    } else {
      toast({
        title: t('validation.allFieldsRequired'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-gray-600">{t('description')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bankName">{t('fields.bankName')}</Label>
          <Input
            id="bankName"
            value={formData.bankName || ''}
            onChange={(e) => updateField('bankName', e.target.value)}
            placeholder={t('placeholders.bankName')}
          />
          {fieldErrors.bankName && (
            <p className="text-sm text-destructive">{fieldErrors.bankName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountName">{t('fields.accountName')}</Label>
          <Input
            id="accountName"
            value={formData.accountName || ''}
            onChange={(e) => updateField('accountName', e.target.value)}
            placeholder={t('placeholders.accountName')}
          />
          {fieldErrors.accountName && (
            <p className="text-sm text-destructive">{fieldErrors.accountName}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bsb">{t('fields.bsb')}</Label>
            <Input
              id="bsb"
              maxLength={6}
              value={formData.bsb || ''}
              onChange={(e) => updateField('bsb', e.target.value.replace(/\D/g, ''))}
              placeholder={t('placeholders.bsb')}
            />
            {fieldErrors.bsb && (
              <p className="text-sm text-destructive">{fieldErrors.bsb}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">{t('fields.accountNumber')}</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber || ''}
              onChange={(e) => updateField('accountNumber', e.target.value)}
              placeholder={t('placeholders.accountNumber')}
            />
            {fieldErrors.accountNumber && (
              <p className="text-sm text-destructive">{fieldErrors.accountNumber}</p>
            )}
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
