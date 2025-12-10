'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@joho-erp/ui';
import type { BusinessInfo, DirectorInfo, FinancialInfo, TradeReferenceInfo } from '../page';

interface ReviewStepProps {
  businessInfo: BusinessInfo;
  directors: DirectorInfo[];
  financialInfo: FinancialInfo;
  tradeReferences: TradeReferenceInfo[];
  agreedToTerms: boolean;
  onAgreementChange: (agreed: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ReviewStep({
  businessInfo,
  directors,
  financialInfo,
  tradeReferences,
  agreedToTerms,
  onAgreementChange,
  onSubmit,
  onBack,
  isSubmitting,
}: ReviewStepProps) {
  const t = useTranslations('onboarding.review');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-gray-600">{t('description')}</p>
      </div>

      {/* Business Info */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">{t('sections.businessInfo')}</h3>
        <dl className="grid gap-2 text-sm">
          <div className="grid grid-cols-3">
            <dt className="font-medium text-gray-600">{t('fields.accountType')}:</dt>
            <dd className="col-span-2">{businessInfo.accountType}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-gray-600">{t('fields.businessName')}:</dt>
            <dd className="col-span-2">{businessInfo.businessName}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-gray-600">{t('fields.abn')}:</dt>
            <dd className="col-span-2">{businessInfo.abn}</dd>
          </div>
          {businessInfo.acn && (
            <div className="grid grid-cols-3">
              <dt className="font-medium text-gray-600">{t('fields.acn')}:</dt>
              <dd className="col-span-2">{businessInfo.acn}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Directors */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">{t('sections.directors')}</h3>
        {directors.map((director, index) => (
          <div key={index} className="mb-3 border-l-2 border-blue-500 pl-3">
            <p className="font-medium">
              {director.givenNames} {director.familyName}
            </p>
            <p className="text-sm text-gray-600">{director.position || t('noPosition')}</p>
          </div>
        ))}
      </div>

      {/* Financial Info */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">{t('sections.financialInfo')}</h3>
        <dl className="grid gap-2 text-sm">
          <div className="grid grid-cols-3">
            <dt className="font-medium text-gray-600">{t('fields.bankName')}:</dt>
            <dd className="col-span-2">{financialInfo.bankName}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-gray-600">{t('fields.accountName')}:</dt>
            <dd className="col-span-2">{financialInfo.accountName}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-gray-600">{t('fields.bsb')}:</dt>
            <dd className="col-span-2">{financialInfo.bsb}</dd>
          </div>
        </dl>
      </div>

      {/* Trade References */}
      {tradeReferences.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">{t('sections.tradeReferences')}</h3>
          {tradeReferences.map((ref, index) => (
            <div key={index} className="mb-2">
              <p className="font-medium">{ref.companyName}</p>
              <p className="text-sm text-gray-600">
                {ref.contactPerson} - {ref.email}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Terms and Conditions */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => onAgreementChange(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            {t('termsAgreement')}{' '}
            <a href="/terms" target="_blank" className="text-blue-600 underline">
              {t('termsLink')}
            </a>
          </span>
        </label>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          {t('buttons.back')}
        </Button>
        <Button onClick={onSubmit} disabled={!agreedToTerms || isSubmitting}>
          {isSubmitting ? t('buttons.submitting') : t('buttons.submit')}
        </Button>
      </div>
    </div>
  );
}
