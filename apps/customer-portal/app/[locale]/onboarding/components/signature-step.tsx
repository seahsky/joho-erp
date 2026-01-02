'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@joho-erp/ui';
import { ApplicantSignature } from './applicant-signature';
import { GuarantorSignature } from './guarantor-signature';
import { api } from '@/trpc/client';

interface DirectorInfo {
  familyName: string;
  givenNames: string;
  position?: string;
}

export interface SignatureData {
  directorIndex: number;
  applicantSignatureUrl: string;
  applicantSignedAt: Date;
  guarantorSignatureUrl: string;
  guarantorSignedAt: Date;
  witnessName: string;
  witnessSignatureUrl: string;
  witnessSignedAt: Date;
}

interface SignatureState {
  applicantSignature: string | null; // Base64 data
  guarantorSignature: string | null; // Base64 data
  witnessName: string;
  witnessSignature: string | null; // Base64 data
}

interface SignatureStepProps {
  directors: DirectorInfo[];
  businessName: string;
  onComplete: (signatures: SignatureData[]) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function SignatureStep({
  directors,
  businessName,
  onComplete,
  onBack,
  isSubmitting,
}: SignatureStepProps) {
  const t = useTranslations('onboarding.signatures');
  const uploadMutation = api.upload.getSignatureUploadUrl.useMutation();

  // Initialize state for each director
  const [signatures, setSignatures] = useState<SignatureState[]>(
    directors.map(() => ({
      applicantSignature: null,
      guarantorSignature: null,
      witnessName: '',
      witnessSignature: null,
    }))
  );

  const [errors, setErrors] = useState<
    Array<{
      applicantSignature?: string;
      guarantorSignature?: string;
      witnessName?: string;
      witnessSignature?: string;
    }>
  >(directors.map(() => ({})));

  const [isUploading, setIsUploading] = useState(false);

  // Update signature for a specific director
  const updateSignature = useCallback(
    (
      directorIndex: number,
      field: keyof SignatureState,
      value: string | null
    ) => {
      setSignatures((prev) => {
        const updated = [...prev];
        updated[directorIndex] = {
          ...updated[directorIndex],
          [field]: value,
        };
        return updated;
      });
      // Clear error when user provides input
      setErrors((prev) => {
        const updated = [...prev];
        updated[directorIndex] = {
          ...updated[directorIndex],
          [field]: undefined,
        };
        return updated;
      });
    },
    []
  );

  // Convert base64 to Blob
  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Upload a signature to R2
  const uploadSignature = async (
    base64Data: string,
    signatureType: 'applicant' | 'guarantor' | 'witness',
    directorIndex: number
  ): Promise<string> => {
    const blob = base64ToBlob(base64Data);

    // Get presigned URL
    const { uploadUrl, publicUrl } = await uploadMutation.mutateAsync({
      signatureType,
      directorIndex,
      contentLength: blob.size,
    });

    // Upload to R2
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/png',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload signature');
    }

    return publicUrl;
  };

  // Validate all signatures
  const validate = (): boolean => {
    let isValid = true;
    const newErrors = directors.map((_, index) => {
      const sig = signatures[index];
      const errs: (typeof errors)[0] = {};

      if (!sig.applicantSignature) {
        errs.applicantSignature = t('validation.signatureRequired', {
          defaultValue: 'Signature is required',
        });
        isValid = false;
      }

      if (!sig.guarantorSignature) {
        errs.guarantorSignature = t('validation.signatureRequired', {
          defaultValue: 'Signature is required',
        });
        isValid = false;
      }

      if (!sig.witnessName.trim()) {
        errs.witnessName = t('witness.nameRequired');
        isValid = false;
      }

      if (!sig.witnessSignature) {
        errs.witnessSignature = t('validation.signatureRequired', {
          defaultValue: 'Signature is required',
        });
        isValid = false;
      }

      return errs;
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsUploading(true);

    try {
      // Upload all signatures and collect URLs
      const signatureDataPromises = signatures.map(async (sig, index) => {
        const [applicantUrl, guarantorUrl, witnessUrl] = await Promise.all([
          uploadSignature(sig.applicantSignature!, 'applicant', index),
          uploadSignature(sig.guarantorSignature!, 'guarantor', index),
          uploadSignature(sig.witnessSignature!, 'witness', index),
        ]);

        const now = new Date();

        return {
          directorIndex: index,
          applicantSignatureUrl: applicantUrl,
          applicantSignedAt: now,
          guarantorSignatureUrl: guarantorUrl,
          guarantorSignedAt: now,
          witnessName: sig.witnessName.trim(),
          witnessSignatureUrl: witnessUrl,
          witnessSignedAt: now,
        };
      });

      const signatureData = await Promise.all(signatureDataPromises);
      onComplete(signatureData);
    } catch (error) {
      console.error('Failed to upload signatures:', error);
      // Show error toast or message
    } finally {
      setIsUploading(false);
    }
  };

  const isProcessing = isSubmitting || isUploading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-gray-600">{t('description')}</p>
      </div>

      {/* Terms & Conditions Section */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-2 text-lg font-semibold">
          {t('sections.termsAndConditions')}
        </h3>
        <div className="mb-6 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          <p className="mb-3 font-medium">{t('termsAgreementIntro')}</p>
          <ul className="list-inside list-disc space-y-2">
            <li>{t('termsDeclarations.readAndUnderstood')}</li>
            <li>{t('termsDeclarations.informationAccurate')}</li>
            <li>{t('termsDeclarations.consentCreditReport')}</li>
          </ul>
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-primary underline hover:text-primary/80"
          >
            {t('viewFullTerms')}
          </a>
        </div>

        <div className="space-y-6">
          {directors.map((director, index) => (
            <ApplicantSignature
              key={index}
              director={director}
              index={index}
              signature={signatures[index].applicantSignature}
              onSignatureChange={(sig) =>
                updateSignature(index, 'applicantSignature', sig)
              }
              error={errors[index].applicantSignature}
            />
          ))}
        </div>
      </div>

      {/* Guarantee & Indemnity Section */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-2 text-lg font-semibold">
          {t('sections.guaranteeAndIndemnity')}
        </h3>
        <div className="mb-6 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          <p>{t('guaranteeIntro', { businessName })}</p>
          <a
            href="/terms#guarantee"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-primary underline hover:text-primary/80"
          >
            {t('viewFullGuarantee')}
          </a>
        </div>

        <div className="space-y-8">
          {directors.map((director, index) => (
            <GuarantorSignature
              key={index}
              director={director}
              index={index}
              guarantorSignature={signatures[index].guarantorSignature}
              witnessName={signatures[index].witnessName}
              witnessSignature={signatures[index].witnessSignature}
              onGuarantorSignatureChange={(sig) =>
                updateSignature(index, 'guarantorSignature', sig)
              }
              onWitnessNameChange={(name) =>
                updateSignature(index, 'witnessName', name)
              }
              onWitnessSignatureChange={(sig) =>
                updateSignature(index, 'witnessSignature', sig)
              }
              errors={errors[index]}
            />
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          {t('buttons.back')}
        </Button>
        <Button onClick={handleSubmit} disabled={isProcessing}>
          {isProcessing ? t('buttons.submitting') : t('buttons.submit')}
        </Button>
      </div>
    </div>
  );
}
