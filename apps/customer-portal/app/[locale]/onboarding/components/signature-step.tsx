'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, useToast } from '@joho-erp/ui';
import { Loader2 } from 'lucide-react';
import { ApplicantSignature } from './applicant-signature';
import { GuarantorSignature } from './guarantor-signature';

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
  const { toast } = useToast();

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

  // Convert base64 to Blob with error handling
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

  // Upload with timeout helper
  const uploadWithTimeout = async (
    formData: FormData,
    timeoutMs = 30000
  ): Promise<{ publicUrl: string }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('/api/upload/signature', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(t('uploadTimeout', { defaultValue: 'Upload timed out. Please try again.' }));
      }
      throw error;
    }
  };

  // Upload with retry logic
  const uploadWithRetry = async (
    formData: FormData,
    maxRetries = 3
  ): Promise<string> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await uploadWithTimeout(formData);
        return response.publicUrl;
      } catch (error: unknown) {
        if (attempt === maxRetries) throw error;

        // Show retry toast
        toast({
          title: t('retrying', {
            defaultValue: 'Retrying upload... ({{attempt}}/{{maxRetries}})',
            attempt,
            maxRetries
          }),
          variant: 'default',
        });

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('Upload failed after retries');
  };

  // Upload a signature to R2
  const uploadSignature = async (
    base64Data: string,
    signatureType: 'applicant' | 'guarantor' | 'witness',
    directorIndex: number
  ): Promise<string> => {
    const blob = base64ToBlob(base64Data);

    // Create FormData for proxy upload
    const formData = new FormData();
    formData.append('file', blob, `signature-${signatureType}-${directorIndex}.png`);
    formData.append('signatureType', signatureType);
    formData.append('directorIndex', directorIndex.toString());

    // Upload to proxy route with retry logic
    return uploadWithRetry(formData);
  };

  // Validate all signatures
  const validate = (): boolean => {
    let isValid = true;
    const newErrors = directors.map((_, index) => {
      const sig = signatures[index];
      const errs: (typeof errors)[0] = {};

      // Validate applicant signature
      if (!sig.applicantSignature || sig.applicantSignature.length < 200) {
        errs.applicantSignature = t('emptySignature', {
          defaultValue: 'Signature cannot be empty',
        });
        isValid = false;
      } else if (!sig.applicantSignature.startsWith('data:image/png;base64,')) {
        errs.applicantSignature = t('invalidSignature', {
          defaultValue: 'Please draw a valid signature',
        });
        isValid = false;
      }

      // Validate guarantor signature
      if (!sig.guarantorSignature || sig.guarantorSignature.length < 200) {
        errs.guarantorSignature = t('emptySignature', {
          defaultValue: 'Signature cannot be empty',
        });
        isValid = false;
      } else if (!sig.guarantorSignature.startsWith('data:image/png;base64,')) {
        errs.guarantorSignature = t('invalidSignature', {
          defaultValue: 'Please draw a valid signature',
        });
        isValid = false;
      }

      // Validate witness name
      if (!sig.witnessName.trim()) {
        errs.witnessName = t('witness.nameRequired', {
          defaultValue: 'Witness name is required',
        });
        isValid = false;
      }

      // Validate witness signature
      if (!sig.witnessSignature || sig.witnessSignature.length < 200) {
        errs.witnessSignature = t('emptySignature', {
          defaultValue: 'Signature cannot be empty',
        });
        isValid = false;
      } else if (!sig.witnessSignature.startsWith('data:image/png;base64,')) {
        errs.witnessSignature = t('invalidSignature', {
          defaultValue: 'Please draw a valid signature',
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

      // Show success toast
      toast({
        title: t('uploadSuccess', { defaultValue: 'Signatures uploaded successfully' }),
        variant: 'default',
      });

      onComplete(signatureData);
    } catch (error: unknown) {
      console.error('Failed to upload signatures:', error);

      // Show error toast to user
      const errorMessage = error instanceof Error ? error.message : t('uploadErrorDescription', {
        defaultValue: 'Failed to upload signatures. Please check your internet connection and try again.',
      });
      toast({
        title: t('uploadFailed', { defaultValue: 'Upload Failed' }),
        description: errorMessage,
        variant: 'destructive',
      });

      // Don't proceed with form submission
      return;
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

      {/* R2 Availability Warning - Removed: upload route now handles R2 configuration errors */}

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
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('uploading', { defaultValue: 'Uploading signatures...' })}
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('buttons.submitting', { defaultValue: 'Submitting...' })}
            </>
          ) : (
            t('buttons.submit', { defaultValue: 'Submit' })
          )}
        </Button>
      </div>
    </div>
  );
}
