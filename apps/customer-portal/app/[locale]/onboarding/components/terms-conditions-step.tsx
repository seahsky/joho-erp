'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, Checkbox, Label, useToast } from '@joho-erp/ui';

interface TermsConditionsStepProps {
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TermsConditionsStep({
  agreed,
  onChange,
  onNext,
  onBack,
}: TermsConditionsStepProps) {
  const t = useTranslations('onboarding.termsConditions');
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

      {/* Terms Content */}
      <Card>
        <CardContent className="p-6">
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6">
            {/* Intro Section */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium leading-relaxed">
                {t('intro')}
              </p>
            </div>

            {/* Definitions */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('definitions.title')}</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li><strong>{t('definitions.applicant.term')}</strong> {t('definitions.applicant.meaning')}</li>
                <li><strong>{t('definitions.conditions.term')}</strong> {t('definitions.conditions.meaning')}</li>
                <li><strong>{t('definitions.supplier.term')}</strong> {t('definitions.supplier.meaning')}</li>
                <li><strong>{t('definitions.goods.term')}</strong> {t('definitions.goods.meaning')}</li>
              </ul>
            </div>

            {/* Clause 1: Credit Facility */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.1.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.1.a')}</li>
                <li>{t('clauses.1.b')}</li>
                <li>{t('clauses.1.c')}</li>
                <li>{t('clauses.1.d')}</li>
                <li>{t('clauses.1.e')}</li>
                <li>{t('clauses.1.f')}</li>
                <li>{t('clauses.1.g')}</li>
              </ol>
            </div>

            {/* Clause 2: Payment and Default */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.2.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-2 text-sm">
                <li>{t('clauses.2.a')}</li>
                <li>
                  {t('clauses.2.b.intro')}
                  <ol className="list-[lower-roman] pl-6 space-y-1 mt-1">
                    <li>{t('clauses.2.b.i')}</li>
                    <li>{t('clauses.2.b.ii')}</li>
                    <li>{t('clauses.2.b.iii')}</li>
                    <li>{t('clauses.2.b.iv')}</li>
                    <li>{t('clauses.2.b.v')}</li>
                    <li>{t('clauses.2.b.vi')}</li>
                    <li>{t('clauses.2.b.vii')}</li>
                    <li>{t('clauses.2.b.viii')}</li>
                    <li>{t('clauses.2.b.ix')}</li>
                  </ol>
                </li>
                <li>
                  {t('clauses.2.c.intro')}
                  <ol className="list-[lower-roman] pl-6 space-y-1 mt-1">
                    <li>{t('clauses.2.c.i')}</li>
                    <li>{t('clauses.2.c.ii')}</li>
                    <li>{t('clauses.2.c.iii')}</li>
                    <li>{t('clauses.2.c.iv')}</li>
                    <li>{t('clauses.2.c.v')}</li>
                  </ol>
                </li>
                <li>{t('clauses.2.d')}</li>
                <li>{t('clauses.2.e')}</li>
              </ol>
            </div>

            {/* Clause 3: Personal Guarantee */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.3.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.3.a')}</li>
                <li>{t('clauses.3.b')}</li>
              </ol>
            </div>

            {/* Clause 4: Title */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.4.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.4.a')}</li>
                <li>{t('clauses.4.b')}</li>
                <li>{t('clauses.4.c')}</li>
                <li>{t('clauses.4.d')}</li>
              </ol>
            </div>

            {/* Clause 5: Supplier's Rights */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.5.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.5.a')}</li>
                <li>{t('clauses.5.b')}</li>
                <li>{t('clauses.5.c')}</li>
                <li>{t('clauses.5.d')}</li>
                <li>{t('clauses.5.e')}</li>
              </ol>
            </div>

            {/* Clause 6: General Lien */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.6.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.6.a')}</li>
              </ol>
            </div>

            {/* Clause 7: Risk */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.7.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.7.a')}</li>
                <li>{t('clauses.7.b')}</li>
                <li>{t('clauses.7.c')}</li>
              </ol>
            </div>

            {/* Clause 8: Force Majeure */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.8.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.8.a')}</li>
              </ol>
            </div>

            {/* Clause 9: PPSA */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.9.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.9.a')}</li>
                <li>{t('clauses.9.b')}</li>
                <li>{t('clauses.9.c')}</li>
                <li>{t('clauses.9.d')}</li>
                <li>{t('clauses.9.e')}</li>
                <li>{t('clauses.9.f')}</li>
                <li>{t('clauses.9.g')}</li>
                <li>{t('clauses.9.h')}</li>
                <li>{t('clauses.9.i')}</li>
                <li>{t('clauses.9.j')}</li>
                <li>{t('clauses.9.k')}</li>
              </ol>
            </div>

            {/* Clause 10: Severance */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.10.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.10.a')}</li>
              </ol>
            </div>

            {/* Clause 11: Governing Law */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('clauses.11.title')}</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>{t('clauses.11.a')}</li>
              </ol>
            </div>

            {/* Declaration Section */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="text-lg font-semibold">{t('declaration.title')}</h3>
              <p className="text-sm">{t('declaration.intro')}</p>
              <ol className="list-decimal pl-6 space-y-2 text-sm">
                <li>{t('declaration.1')}</li>
                <li>{t('declaration.2')}</li>
                <li>{t('declaration.3')}</li>
                <li>{t('declaration.4')}</li>
                <li>{t('declaration.5')}</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreement Checkbox */}
      <Card className={error ? 'border-destructive' : ''}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-conditions-agreement"
              ref={checkboxRef}
              checked={agreed}
              onCheckedChange={handleCheckboxChange}
              aria-invalid={!!error}
              aria-describedby={error ? 'terms-conditions-error' : undefined}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="terms-conditions-agreement"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                {t('agreement.label')}
                <span className="ml-1 text-destructive" aria-label={t('agreement.required')}>
                  *
                </span>
              </Label>
              {error && (
                <p id="terms-conditions-error" className="text-sm text-destructive">
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
