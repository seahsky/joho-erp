'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, Checkbox, Label, useToast } from '@joho-erp/ui';

interface GuaranteeIndemnityStepProps {
  businessName: string;
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export function GuaranteeIndemnityStep({
  businessName,
  agreed,
  onChange,
  onNext,
  onBack,
}: GuaranteeIndemnityStepProps) {
  const t = useTranslations('onboarding.guaranteeIndemnity');
  const { toast } = useToast();
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckboxChange = (checked: boolean) => {
    onChange(checked);
    if (checked) {
      setError(null);
    }
  };

  const handleNext = () => {
    if (!agreed) {
      const errorMsg = t('validation.mustAgree');
      setError(errorMsg);
      toast({
        title: errorMsg,
        variant: 'destructive',
      });
      checkboxRef.current?.focus();
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Guarantee Content */}
      <Card>
        <CardContent className="p-6">
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6">
            {/* Header Section */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium leading-relaxed">
                {t('header')}
              </p>
            </div>

            {/* Recitals */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('recitals.title')}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>A.</strong> {t('recitals.a', { businessName: businessName || '[Business Name]' })}</p>
                <p><strong>B.</strong> {t('recitals.b')}</p>
              </div>
            </div>

            {/* Operative Part */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('operativePart.title')}</h3>

              {/* Clause 1: Guarantor Obligations */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.1.title')}</h4>
                <p className="text-sm">{t('clauses.1.intro')}</p>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                  <li>{t('clauses.1.a')}</li>
                  <li>{t('clauses.1.b')}</li>
                  <li>{t('clauses.1.c')}</li>
                </ol>
              </div>

              {/* Clause 2: Principal Obligation */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.2.title')}</h4>
                <p className="text-sm">{t('clauses.2.content')}</p>
              </div>

              {/* Clause 3: Enforceability Conditions */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.3.title')}</h4>
                <p className="text-sm">{t('clauses.3.intro')}</p>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                  <li>{t('clauses.3.a')}</li>
                  <li>{t('clauses.3.b')}</li>
                  <li>{t('clauses.3.c')}</li>
                  <li>{t('clauses.3.d')}</li>
                  <li>{t('clauses.3.e')}</li>
                  <li>{t('clauses.3.f')}</li>
                  <li>{t('clauses.3.g')}</li>
                  <li>{t('clauses.3.h')}</li>
                </ol>
              </div>

              {/* Clause 4: Continuing Guarantee */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.4.title')}</h4>
                <p className="text-sm">{t('clauses.4.content')}</p>
              </div>

              {/* Clause 5: Joint and Several Liability */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.5.title')}</h4>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                  <li>{t('clauses.5.a')}</li>
                  <li>{t('clauses.5.b')}</li>
                  <li>{t('clauses.5.c')}</li>
                </ol>
              </div>

              {/* Clause 6: Waiver of Rights */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.6.title')}</h4>
                <p className="text-sm">{t('clauses.6.content')}</p>
              </div>

              {/* Clause 7: Property Charge */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.7.title')}</h4>
                <p className="text-sm">{t('clauses.7.content')}</p>
              </div>

              {/* Clause 8: Credit Reporting Consent */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.8.title')}</h4>
                <p className="text-sm">{t('clauses.8.content')}</p>
              </div>

              {/* Clause 9: Trust Authority Warrant */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.9.title')}</h4>
                <p className="text-sm">{t('clauses.9.content')}</p>
              </div>

              {/* Clause 10: Notice Provisions */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.10.title')}</h4>
                <p className="text-sm">{t('clauses.10.content')}</p>
              </div>

              {/* Clause 11: Definitions */}
              <div className="space-y-2">
                <h4 className="font-semibold">{t('clauses.11.title')}</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>{t('clauses.11.supplier.term')}</strong> {t('clauses.11.supplier.meaning')}</li>
                  <li><strong>{t('clauses.11.applicant.term')}</strong> {t('clauses.11.applicant.meaning')}</li>
                  <li><strong>{t('clauses.11.guarantors.term')}</strong> {t('clauses.11.guarantors.meaning')}</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreement Checkbox */}
      <Card className={error ? 'border-destructive' : ''}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="guarantee-indemnity-agreement"
              ref={checkboxRef}
              checked={agreed}
              onCheckedChange={handleCheckboxChange}
              aria-invalid={!!error}
              aria-describedby={error ? 'guarantee-indemnity-error' : undefined}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="guarantee-indemnity-agreement"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                {t('agreement.label')}
                <span className="ml-1 text-destructive" aria-label={t('agreement.required')}>
                  *
                </span>
              </Label>
              {error && (
                <p id="guarantee-indemnity-error" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button onClick={handleNext}>
          {t('buttons.next')}
        </Button>
      </div>
    </div>
  );
}
