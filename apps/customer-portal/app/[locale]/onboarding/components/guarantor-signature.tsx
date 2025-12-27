'use client';

import { useTranslations } from 'next-intl';
import { SignaturePadComponent } from './signature-pad';
import { Input } from '@joho-erp/ui';

interface DirectorInfo {
  familyName: string;
  givenNames: string;
  position?: string;
}

interface GuarantorSignatureProps {
  director: DirectorInfo;
  index: number;
  guarantorSignature: string | null;
  witnessName: string;
  witnessSignature: string | null;
  onGuarantorSignatureChange: (sig: string | null) => void;
  onWitnessNameChange: (name: string) => void;
  onWitnessSignatureChange: (sig: string | null) => void;
  errors?: {
    guarantorSignature?: string;
    witnessName?: string;
    witnessSignature?: string;
  };
}

export function GuarantorSignature({
  director,
  index,
  guarantorSignature,
  witnessName,
  witnessSignature,
  onGuarantorSignatureChange,
  onWitnessNameChange,
  onWitnessSignatureChange,
  errors,
}: GuarantorSignatureProps) {
  const t = useTranslations('onboarding.signatures');

  const guarantorName = `${director.givenNames} ${director.familyName}`;

  return (
    <div className="space-y-6 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
      {/* Guarantor Section */}
      <div>
        <h4 className="mb-3 font-medium text-gray-900">
          {t('guarantor', { number: index + 1, name: guarantorName })}
        </h4>
        <SignaturePadComponent
          id={`guarantor-signature-${index}`}
          label={t('signaturePad.label')}
          onSignatureChange={onGuarantorSignatureChange}
          required
          error={errors?.guarantorSignature}
        />
        {guarantorSignature && (
          <p className="mt-2 text-sm text-green-600">
            {t('signatureComplete', { defaultValue: 'Signature captured' })}
          </p>
        )}
      </div>

      {/* Witness Section */}
      <div className="ml-4 border-l-2 border-gray-200 pl-4">
        <h5 className="mb-3 text-sm font-medium text-gray-700">
          {t('witness.label')}
        </h5>

        <div className="mb-4">
          <label
            htmlFor={`witness-name-${index}`}
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            {t('witness.namePlaceholder')}
            <span className="ml-1 text-red-500">*</span>
          </label>
          <Input
            id={`witness-name-${index}`}
            type="text"
            value={witnessName}
            onChange={(e) => onWitnessNameChange(e.target.value)}
            placeholder={t('witness.namePlaceholder')}
            className={errors?.witnessName ? 'border-red-300' : ''}
          />
          {errors?.witnessName && (
            <p className="mt-1 text-sm text-red-600">{errors.witnessName}</p>
          )}
        </div>

        <SignaturePadComponent
          id={`witness-signature-${index}`}
          label={t('signaturePad.label')}
          description={t('witnessSignatureDescription', {
            defaultValue: 'Witness signature',
          })}
          onSignatureChange={onWitnessSignatureChange}
          required
          error={errors?.witnessSignature}
        />
        {witnessSignature && (
          <p className="mt-2 text-sm text-green-600">
            {t('signatureComplete', { defaultValue: 'Signature captured' })}
          </p>
        )}
      </div>
    </div>
  );
}
