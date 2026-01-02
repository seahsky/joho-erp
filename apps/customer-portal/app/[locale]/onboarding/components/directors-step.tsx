'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, useToast } from '@joho-erp/ui';
import type { DirectorInfo } from '../page';

interface DirectorsStepProps {
  data: DirectorInfo[];
  onChange: (data: DirectorInfo[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DirectorsStep({ data, onChange, onNext, onBack }: DirectorsStepProps) {
  const t = useTranslations('onboarding.directors');
  const { toast } = useToast();
  const [directors, setDirectors] = useState<DirectorInfo[]>(
    data.length > 0 ? data : [createEmptyDirector()]
  );

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
    };
  }

  const updateDirector = (index: number, field: keyof DirectorInfo, value: string | DirectorInfo['residentialAddress']) => {
    const updated = [...directors];
    updated[index] = { ...updated[index], [field]: value };
    setDirectors(updated);
    onChange(updated);
  };

  const updateDirectorAddress = (index: number, field: string, value: string) => {
    const updated = [...directors];
    updated[index] = {
      ...updated[index],
      residentialAddress: { ...updated[index].residentialAddress, [field]: value },
    };
    setDirectors(updated);
    onChange(updated);
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

  const validate = () => {
    return directors.every(
      (d) =>
        d.familyName &&
        d.givenNames &&
        d.residentialAddress.street &&
        d.residentialAddress.suburb &&
        d.residentialAddress.state &&
        d.residentialAddress.postcode &&
        d.dateOfBirth &&
        d.driverLicenseNumber &&
        d.licenseExpiry
    );
  };

  const handleNext = () => {
    if (validate()) {
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
            <div>
              <Label>{t('fields.familyName')}</Label>
              <Input
                value={director.familyName}
                onChange={(e) => updateDirector(index, 'familyName', e.target.value)}
              />
            </div>
            <div>
              <Label>{t('fields.givenNames')}</Label>
              <Input
                value={director.givenNames}
                onChange={(e) => updateDirector(index, 'givenNames', e.target.value)}
              />
            </div>
            <div>
              <Label>{t('fields.dateOfBirth')}</Label>
              <Input
                type="date"
                value={director.dateOfBirth}
                onChange={(e) => updateDirector(index, 'dateOfBirth', e.target.value)}
              />
            </div>
            <div>
              <Label>{t('fields.position')}</Label>
              <Input
                value={director.position}
                onChange={(e) => updateDirector(index, 'position', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <h4 className="font-medium">{t('sections.residentialAddress')}</h4>
            <div>
              <Label>{t('fields.street')}</Label>
              <Input
                value={director.residentialAddress.street}
                onChange={(e) => updateDirectorAddress(index, 'street', e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>{t('fields.suburb')}</Label>
                <Input
                  value={director.residentialAddress.suburb}
                  onChange={(e) => updateDirectorAddress(index, 'suburb', e.target.value)}
                />
              </div>
              <div>
                <Label>{t('fields.state')}</Label>
                <Input
                  value={director.residentialAddress.state}
                  onChange={(e) => updateDirectorAddress(index, 'state', e.target.value)}
                />
              </div>
              <div>
                <Label>{t('fields.postcode')}</Label>
                <Input
                  maxLength={4}
                  value={director.residentialAddress.postcode}
                  onChange={(e) =>
                    updateDirectorAddress(index, 'postcode', e.target.value.replace(/\D/g, ''))
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>{t('fields.driverLicenseNumber')}</Label>
              <Input
                value={director.driverLicenseNumber}
                onChange={(e) => updateDirector(index, 'driverLicenseNumber', e.target.value)}
              />
            </div>
            <div>
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
            <div>
              <Label>{t('fields.licenseExpiry')}</Label>
              <Input
                type="date"
                value={director.licenseExpiry}
                onChange={(e) => updateDirector(index, 'licenseExpiry', e.target.value)}
              />
            </div>
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
