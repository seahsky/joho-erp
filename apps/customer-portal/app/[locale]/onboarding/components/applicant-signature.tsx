'use client';

import { useTranslations } from 'next-intl';
import { SignaturePadComponent } from './signature-pad';

interface DirectorInfo {
  familyName: string;
  givenNames: string;
  position?: string;
}

interface ApplicantSignatureProps {
  director: DirectorInfo;
  index: number;
  signature: string | null;
  onSignatureChange: (signature: string | null) => void;
  error?: string;
}

export function ApplicantSignature({
  director,
  index,
  signature,
  onSignatureChange,
  error,
}: ApplicantSignatureProps) {
  const t = useTranslations('onboarding.signatures');

  const directorName = `${director.givenNames} ${director.familyName}`;
  const label = director.position
    ? t('directorWithPosition', {
        number: index + 1,
        name: directorName,
        position: director.position,
      })
    : t('director', { number: index + 1, name: directorName });

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
      <div className="mb-3">
        <h4 className="font-medium text-gray-900">{label}</h4>
      </div>
      <SignaturePadComponent
        id={`applicant-signature-${index}`}
        label={t('signaturePad.label')}
        onSignatureChange={onSignatureChange}
        required
        error={error}
      />
      {signature && (
        <p className="mt-2 text-sm text-green-600">
          {t('signatureComplete', { defaultValue: 'Signature captured' })}
        </p>
      )}
    </div>
  );
}
