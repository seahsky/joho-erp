'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/nextjs';
import { Button, Input, Label, useToast } from '@joho-erp/ui';
import type { DirectorInfo } from '../page';
import { IdentityDocumentUpload, type IdDocumentData } from './identity-document-upload';
import { AddressSearch, type AddressResult } from '@/components/address-search';

// Maximum number of directors allowed (PDF template limit)
const MAX_DIRECTORS = 3;

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

  // Handle full address selection from AddressSearch component
  const handleDirectorAddressSelect = (index: number, result: AddressResult) => {
    const updated = [...directors];
    updated[index] = {
      ...updated[index],
      residentialAddress: {
        street: result.street,
        suburb: result.suburb,
        state: result.state,
        postcode: result.postcode,
      },
    };
    setDirectors(updated);
    onChange(updated);
    // Clear any address-related errors
    clearFieldError(index, 'street');
    clearFieldError(index, 'suburb');
    clearFieldError(index, 'state');
    clearFieldError(index, 'postcode');
  };

  const addDirector = () => {
    if (directors.length >= MAX_DIRECTORS) {
      toast({
        title: t('validation.maxDirectorsReached'),
        variant: 'destructive',
      });
      return;
    }
    const updated = [...directors, createEmptyDirector()];
    setDirectors(updated);
    onChange(updated);
  };

  const canAddMoreDirectors = directors.length < MAX_DIRECTORS;

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
            <AddressSearch
              onAddressSelect={(result) => handleDirectorAddressSelect(index, result)}
              defaultValues={{
                street: director.residentialAddress.street,
                suburb: director.residentialAddress.suburb,
                state: director.residentialAddress.state,
                postcode: director.residentialAddress.postcode,
              }}
            />
            {(directorErrors[index]?.street ||
              directorErrors[index]?.suburb ||
              directorErrors[index]?.state ||
              directorErrors[index]?.postcode) && (
              <p className="text-sm text-destructive">
                {directorErrors[index]?.street ||
                 directorErrors[index]?.suburb ||
                 directorErrors[index]?.state ||
                 directorErrors[index]?.postcode}
              </p>
            )}
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

      {canAddMoreDirectors ? (
        <Button variant="outline" onClick={addDirector}>
          {t('buttons.addDirector')}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('validation.maxDirectorsInfo', { max: MAX_DIRECTORS })}
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button onClick={handleNext}>{t('buttons.next')}</Button>
      </div>
    </div>
  );
}
