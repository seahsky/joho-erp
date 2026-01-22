'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import { Button, Input, Label, useToast } from '@joho-erp/ui';
import type { DirectorInfo } from '../page';
import { IdentityDocumentUpload, type IdDocumentData } from './identity-document-upload';

interface DirectorsStepProps {
  data: DirectorInfo[];
  onChange: (data: DirectorInfo[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DirectorsStep({ data, onChange, onNext, onBack }: DirectorsStepProps) {
  const t = useTranslations('onboarding.directors');
  const { toast } = useToast();
  const { user } = useUser();
  const [directors, setDirectors] = useState<DirectorInfo[]>(
    data.length > 0 ? data : [createEmptyDirector()]
  );
  const [directorErrors, setDirectorErrors] = useState<Record<number, Record<string, string>>>({});

  // Use clerk user ID as the customer ID for file uploads (before actual customer is created)
  const customerId = user?.id || 'temp-' + Date.now();

  function createEmptyDirector(): DirectorInfo {
    return {
      familyName: '',
      givenNames: '',
      residentialAddress: { street: '', suburb: '', state: '', postcode: '' },
      dateOfBirth: '',
      driverLicenseNumber: '',
      licenseState: 'NSW',
      licenseExpiry: '',
      position: '',
      // ID Document defaults
      idDocumentType: 'DRIVER_LICENSE',
      idDocumentFrontUrl: undefined,
      idDocumentBackUrl: undefined,
      idDocumentUploadedAt: undefined,
    };
  }

  // Helper to convert director data to IdDocumentData
  const getIdDocumentData = (director: DirectorInfo): IdDocumentData => ({
    documentType: director.idDocumentType || 'DRIVER_LICENSE',
    frontUrl: director.idDocumentFrontUrl || null,
    backUrl: director.idDocumentBackUrl || null,
    uploadedAt: director.idDocumentUploadedAt || null,
  });

  // Handle ID document data change
  const handleIdDocumentChange = (index: number, data: IdDocumentData) => {
    const updated = [...directors];
    updated[index] = {
      ...updated[index],
      idDocumentType: data.documentType,
      idDocumentFrontUrl: data.frontUrl || undefined,
      idDocumentBackUrl: data.backUrl || undefined,
      idDocumentUploadedAt: data.uploadedAt || undefined,
    };
    setDirectors(updated);
    onChange(updated);
    // Clear ID document error if any
    clearFieldError(index, 'idDocument');
  };

  const clearFieldError = (index: number, field: string) => {
    if (directorErrors[index]?.[field]) {
      const newErrors = { ...directorErrors };
      if (newErrors[index]) {
        delete newErrors[index][field];
        if (Object.keys(newErrors[index]).length === 0) {
          delete newErrors[index];
        }
      }
      setDirectorErrors(newErrors);
    }
  };

  const updateDirector = (index: number, field: keyof DirectorInfo, value: string | DirectorInfo['residentialAddress']) => {
    const updated = [...directors];
    updated[index] = { ...updated[index], [field]: value };
    setDirectors(updated);
    onChange(updated);
    clearFieldError(index, field);
  };

  const updateDirectorAddress = (index: number, field: string, value: string) => {
    const updated = [...directors];
    updated[index] = {
      ...updated[index],
      residentialAddress: { ...updated[index].residentialAddress, [field]: value },
    };
    setDirectors(updated);
    onChange(updated);
    clearFieldError(index, field);
  };

  const addDirector = () => {
    const updated = [...directors, createEmptyDirector()];
    setDirectors(updated);
    onChange(updated);
  };

  const removeDirector = (index: number) => {
    if (directors.length > 1) {
      const updated = directors.filter((_, i) => i !== index);
      setDirectors(updated);
      onChange(updated);
    }
  };

  const validateDirectors = (): boolean => {
    const errors: Record<number, Record<string, string>> = {};
    let isValid = true;

    directors.forEach((director, index) => {
      const directorErrors: Record<string, string> = {};

      if (!director.familyName?.trim()) {
        directorErrors.familyName = t('validation.familyNameRequired');
        isValid = false;
      }

      if (!director.givenNames?.trim()) {
        directorErrors.givenNames = t('validation.givenNamesRequired');
        isValid = false;
      }

      if (!director.dateOfBirth) {
        directorErrors.dateOfBirth = t('validation.dateOfBirthRequired');
        isValid = false;
      }

      if (!director.residentialAddress.street?.trim()) {
        directorErrors.street = t('validation.streetRequired');
        isValid = false;
      }

      if (!director.residentialAddress.suburb?.trim()) {
        directorErrors.suburb = t('validation.suburbRequired');
        isValid = false;
      }

      if (!director.residentialAddress.state?.trim()) {
        directorErrors.state = t('validation.stateRequired');
        isValid = false;
      }

      if (!director.residentialAddress.postcode?.trim()) {
        directorErrors.postcode = t('validation.postcodeRequired');
        isValid = false;
      } else if (!/^\d{4}$/.test(director.residentialAddress.postcode)) {
        directorErrors.postcode = t('validation.postcodeInvalid');
        isValid = false;
      }

      if (!director.driverLicenseNumber?.trim()) {
        directorErrors.driverLicenseNumber = t('validation.driverLicenseRequired');
        isValid = false;
      }

      if (!director.licenseExpiry) {
        directorErrors.licenseExpiry = t('validation.licenseExpiryRequired');
        isValid = false;
      }

      // ID Document validation
      if (!director.idDocumentFrontUrl) {
        directorErrors.idDocument = t('validation.idDocumentRequired');
        isValid = false;
      } else if (director.idDocumentType === 'DRIVER_LICENSE' && !director.idDocumentBackUrl) {
        directorErrors.idDocument = t('validation.idDocumentBackRequired');
        isValid = false;
      }

      if (Object.keys(directorErrors).length > 0) {
        errors[index] = directorErrors;
      }
    });

    setDirectorErrors(errors);
    return isValid;
  };

  const handleNext = () => {
    if (validateDirectors()) {
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

      {directors.map((director, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {t('directorNumber', { number: index + 1 })}
            </h3>
            {directors.length > 1 && (
              <Button variant="destructive" size="sm" onClick={() => removeDirector(index)}>
                {t('buttons.remove')}
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('fields.familyName')}</Label>
              <Input
                value={director.familyName}
                onChange={(e) => updateDirector(index, 'familyName', e.target.value)}
              />
              {directorErrors[index]?.familyName && (
                <p className="text-sm text-destructive">{directorErrors[index].familyName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('fields.givenNames')}</Label>
              <Input
                value={director.givenNames}
                onChange={(e) => updateDirector(index, 'givenNames', e.target.value)}
              />
              {directorErrors[index]?.givenNames && (
                <p className="text-sm text-destructive">{directorErrors[index].givenNames}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('fields.dateOfBirth')}</Label>
              <Input
                type="date"
                value={director.dateOfBirth}
                onChange={(e) => updateDirector(index, 'dateOfBirth', e.target.value)}
              />
              {directorErrors[index]?.dateOfBirth && (
                <p className="text-sm text-destructive">{directorErrors[index].dateOfBirth}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('fields.position')}</Label>
              <Input
                value={director.position}
                onChange={(e) => updateDirector(index, 'position', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <h4 className="font-medium">{t('sections.residentialAddress')}</h4>
            <div className="space-y-2">
              <Label>{t('fields.street')}</Label>
              <Input
                value={director.residentialAddress.street}
                onChange={(e) => updateDirectorAddress(index, 'street', e.target.value)}
              />
              {directorErrors[index]?.street && (
                <p className="text-sm text-destructive">{directorErrors[index].street}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('fields.suburb')}</Label>
                <Input
                  value={director.residentialAddress.suburb}
                  onChange={(e) => updateDirectorAddress(index, 'suburb', e.target.value)}
                />
                {directorErrors[index]?.suburb && (
                  <p className="text-sm text-destructive">{directorErrors[index].suburb}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('fields.state')}</Label>
                <Input
                  value={director.residentialAddress.state}
                  onChange={(e) => updateDirectorAddress(index, 'state', e.target.value)}
                />
                {directorErrors[index]?.state && (
                  <p className="text-sm text-destructive">{directorErrors[index].state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('fields.postcode')}</Label>
                <Input
                  maxLength={4}
                  value={director.residentialAddress.postcode}
                  onChange={(e) =>
                    updateDirectorAddress(index, 'postcode', e.target.value.replace(/\D/g, ''))
                  }
                />
                {directorErrors[index]?.postcode && (
                  <p className="text-sm text-destructive">{directorErrors[index].postcode}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('fields.driverLicenseNumber')}</Label>
              <Input
                value={director.driverLicenseNumber}
                onChange={(e) => updateDirector(index, 'driverLicenseNumber', e.target.value)}
              />
              {directorErrors[index]?.driverLicenseNumber && (
                <p className="text-sm text-destructive">{directorErrors[index].driverLicenseNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('fields.licenseState')}</Label>
              <select
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
                value={director.licenseState}
                onChange={(e) => updateDirector(index, 'licenseState', e.target.value)}
              >
                {['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('fields.licenseExpiry')}</Label>
              <Input
                type="date"
                value={director.licenseExpiry}
                onChange={(e) => updateDirector(index, 'licenseExpiry', e.target.value)}
              />
              {directorErrors[index]?.licenseExpiry && (
                <p className="text-sm text-destructive">{directorErrors[index].licenseExpiry}</p>
              )}
            </div>
          </div>

          {/* ID Document Upload */}
          <div className="mt-6">
            <IdentityDocumentUpload
              directorIndex={index}
              customerId={customerId}
              value={getIdDocumentData(director)}
              onChange={(data) => handleIdDocumentChange(index, data)}
              error={directorErrors[index]?.idDocument}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addDirector}>
        {t('buttons.addDirector')}
      </Button>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button onClick={handleNext}>{t('buttons.next')}</Button>
      </div>
    </div>
  );
}
