'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, Input, useToast } from '@joho-erp/ui';
import { Loader2 } from 'lucide-react';
import { SignaturePadComponent } from './signature-pad';
import type { DirectorInfo, DirectorSignature, WitnessData } from '../page';

interface WitnessStepProps {
  directors: DirectorInfo[];
  directorSignatures: DirectorSignature[];
  witnessData: WitnessData;
  onWitnessDataChange: (data: WitnessData) => void;
  onSubmit: (witnessData: WitnessData, directorSignatures: DirectorSignature[]) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function WitnessStep({
  directors,
  directorSignatures,
  witnessData,
  onWitnessDataChange,
  onSubmit,
  onBack,
  isSubmitting,
}: WitnessStepProps) {
  const t = useTranslations('onboarding.witness');
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    signature?: string;
  }>({});

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

  // Upload with retry logic (3 attempts, exponential backoff)
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
            defaultValue: 'Retrying upload... ({attempt}/{maxRetries})',
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
    index: number
  ): Promise<string> => {
    const blob = base64ToBlob(base64Data);

    const formData = new FormData();
    formData.append('file', blob, `signature-${signatureType}-${index}.png`);
    formData.append('signatureType', signatureType);
    formData.append('directorIndex', index.toString());

    return uploadWithRetry(formData);
  };

  const handleNameChange = (name: string) => {
    onWitnessDataChange({
      ...witnessData,
      name,
    });
    if (name.trim()) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleSignatureChange = (signature: string | null) => {
    onWitnessDataChange({
      ...witnessData,
      signature,
      signedAt: signature ? new Date() : null,
    });
    if (signature) {
      setErrors(prev => ({ ...prev, signature: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    if (!witnessData.name.trim()) {
      newErrors.name = t('validation.nameRequired', { defaultValue: 'Witness name is required' });
      isValid = false;
    }

    if (!witnessData.signature || witnessData.signature.length < 200) {
      newErrors.signature = t('validation.signatureRequired', { defaultValue: 'Witness signature is required' });
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      return;
    }

    setIsUploading(true);

    try {
      // Upload witness signature
      const witnessSignatureUrl = await uploadSignature(
        witnessData.signature!,
        'witness',
        0 // Single witness, index 0
      );

      // Upload all director signatures (applicant and guarantor)
      const uploadedDirectorSignatures = await Promise.all(
        directorSignatures.map(async (sig) => {
          const [applicantUrl, guarantorUrl] = await Promise.all([
            uploadSignature(sig.applicantSignature!, 'applicant', sig.directorIndex),
            uploadSignature(sig.guarantorSignature!, 'guarantor', sig.directorIndex),
          ]);

          return {
            ...sig,
            applicantSignatureUrl: applicantUrl,
            guarantorSignatureUrl: guarantorUrl,
          };
        })
      );

      // Create final witness data with URL
      const finalWitnessData: WitnessData = {
        name: witnessData.name.trim(),
        signature: witnessData.signature,
        signedAt: witnessData.signedAt || new Date(),
        signatureUrl: witnessSignatureUrl,
      };

      // Show success toast
      toast({
        title: t('uploadSuccess', { defaultValue: 'Signatures uploaded successfully' }),
        variant: 'default',
      });

      // Call parent submit handler
      onSubmit(finalWitnessData, uploadedDirectorSignatures);
    } catch (error: unknown) {
      console.error('Failed to upload signatures:', error);

      const errorMessage = error instanceof Error ? error.message : t('uploadErrorDescription', {
        defaultValue: 'Failed to upload signatures. Please check your internet connection and try again.',
      });
      toast({
        title: t('uploadFailed', { defaultValue: 'Upload Failed' }),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [witnessData, directorSignatures, onSubmit, toast, t]);

  const isProcessing = isSubmitting || isUploading;

  // Get list of directors who signed the guarantee
  const signedDirectors = directors.map((director, index) => {
    const sig = directorSignatures.find(s => s.directorIndex === index);
    return {
      name: `${director.givenNames} ${director.familyName}`,
      position: director.position,
      hasSigned: !!sig?.guarantorSignature,
    };
  });

  const canSubmit = witnessData.name.trim() && witnessData.signature && witnessData.signature.length >= 200;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('title', { defaultValue: 'Witness' })}</h2>
        <p className="text-muted-foreground">
          {t('description', { defaultValue: 'A witness is required to verify the guarantor signatures.' })}
        </p>
      </div>

      {/* Introduction - List of Guarantors */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('guarantorsList.title', { defaultValue: 'Guarantors Requiring Witness' })}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('guarantorsList.description', { defaultValue: 'The following directors have signed the Guarantee & Indemnity and require a witness signature:' })}
          </p>
          <ul className="space-y-2">
            {signedDirectors.map((director, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className={director.hasSigned ? 'text-green-600' : 'text-yellow-600'}>
                  {director.hasSigned ? '✓' : '○'}
                </span>
                <span className="font-medium">{director.name}</span>
                {director.position && (
                  <span className="text-muted-foreground">({director.position})</span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Witness Information */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {t('witnessDetails.title', { defaultValue: 'Witness Details' })}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('witnessDetails.description', { defaultValue: 'The witness must be an adult who is not a party to this agreement.' })}
            </p>
          </div>

          {/* Witness Name */}
          <div className="space-y-2">
            <label htmlFor="witness-name" className="block text-sm font-medium text-gray-700">
              {t('witnessDetails.nameLabel', { defaultValue: 'Witness Full Name' })}
              <span className="ml-1 text-red-500">*</span>
            </label>
            <Input
              id="witness-name"
              type="text"
              value={witnessData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('witnessDetails.namePlaceholder', { defaultValue: 'Enter witness full name' })}
              className={errors.name ? 'border-red-300' : ''}
              disabled={isProcessing}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Witness Signature */}
          <div>
            <SignaturePadComponent
              id="witness-signature"
              label={t('witnessDetails.signatureLabel', { defaultValue: 'Witness Signature' })}
              description={t('witnessDetails.signatureDescription', { defaultValue: 'Sign in the box below to witness the guarantor signatures.' })}
              onSignatureChange={handleSignatureChange}
              required
              error={errors.signature}
              disabled={isProcessing}
            />
            {witnessData.signature && (
              <p className="mt-2 text-sm text-green-600">
                {t('witnessDetails.signatureComplete', { defaultValue: 'Signature captured' })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          {t('buttons.back', { defaultValue: 'Back' })}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isUploading
                ? t('buttons.uploading', { defaultValue: 'Uploading...' })
                : t('buttons.submitting', { defaultValue: 'Submitting...' })}
            </>
          ) : (
            t('buttons.submit', { defaultValue: 'Submit Application' })
          )}
        </Button>
      </div>
    </div>
  );
}
