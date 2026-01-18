'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@joho-erp/ui';
import { Building2, User, MapPin, CreditCard } from 'lucide-react';
import { parseToCents, validateABN } from '@joho-erp/shared';
import type { BusinessInfo } from '../page';

interface BusinessInfoStepProps {
  data: Partial<BusinessInfo>;
  onChange: (data: Partial<BusinessInfo>) => void;
  onNext: () => void;
}

export function BusinessInfoStep({ data, onChange, onNext }: BusinessInfoStepProps) {
  const t = useTranslations('onboarding.businessInfo');
  const [formData, setFormData] = useState<Partial<BusinessInfo>>(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountType) newErrors.accountType = t('validation.accountTypeRequired');
    if (!formData.businessName) newErrors.businessName = t('validation.businessNameRequired');
    if (!formData.abn || !validateABN(formData.abn)) {
      newErrors.abn = t('validation.abnInvalid');
    }
    if (formData.accountType === 'company' && (!formData.acn || formData.acn.length !== 9)) {
      newErrors.acn = t('validation.acnInvalid');
    }
    if (!formData.contactPerson?.firstName) {
      newErrors.contactFirstName = t('validation.firstNameRequired');
    }
    if (!formData.contactPerson?.lastName) {
      newErrors.contactLastName = t('validation.lastNameRequired');
    }
    if (!formData.contactPerson?.email) {
      newErrors.contactEmail = t('validation.emailRequired');
    }
    if (!formData.contactPerson?.phone) {
      newErrors.contactPhone = t('validation.phoneRequired');
    }
    if (!formData.deliveryAddress?.street) {
      newErrors.deliveryStreet = t('validation.streetRequired');
    }
    if (!formData.deliveryAddress?.suburb) {
      newErrors.deliverySuburb = t('validation.suburbRequired');
    }
    if (!formData.deliveryAddress?.state) {
      newErrors.deliveryState = t('validation.stateRequired');
    }
    if (!formData.deliveryAddress?.postcode || !/^\d{4}$/.test(formData.deliveryAddress.postcode)) {
      newErrors.deliveryPostcode = t('validation.postcodeInvalid');
    }
    // areaTag validation removed - area is auto-assigned by backend based on suburb

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Business Details Card */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {t('sections.businessDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Type */}
          <div>
            <Label htmlFor="accountType">{t('fields.accountType')}</Label>
            <select
              id="accountType"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              value={formData.accountType || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accountType: e.target.value as BusinessInfo['accountType'],
                })
              }
            >
              <option value="">{t('fields.accountTypePlaceholder')}</option>
              <option value="sole_trader">{t('accountTypes.soleTrader')}</option>
              <option value="partnership">{t('accountTypes.partnership')}</option>
              <option value="company">{t('accountTypes.company')}</option>
              <option value="other">{t('accountTypes.other')}</option>
            </select>
            {errors.accountType && <p className="mt-1 text-sm text-destructive">{errors.accountType}</p>}
          </div>

          {/* Business Name */}
          <div>
            <Label htmlFor="businessName">{t('fields.businessName')}</Label>
            <Input
              id="businessName"
              value={formData.businessName || ''}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
            {errors.businessName && <p className="mt-1 text-sm text-destructive">{errors.businessName}</p>}
          </div>

          {/* Trading Name */}
          <div>
            <Label htmlFor="tradingName">{t('fields.tradingName')}</Label>
            <Input
              id="tradingName"
              value={formData.tradingName || ''}
              onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
            />
          </div>

          {/* ABN */}
          <div>
            <Label htmlFor="abn">{t('fields.abn')}</Label>
            <Input
              id="abn"
              maxLength={11}
              placeholder={t('placeholders.abnFormat')}
              value={formData.abn || ''}
              onChange={(e) =>
                setFormData({ ...formData, abn: e.target.value.replace(/\D/g, '') })
              }
            />
            {errors.abn && <p className="mt-1 text-sm text-destructive">{errors.abn}</p>}
          </div>

          {/* ACN (only for companies) */}
          {formData.accountType === 'company' && (
            <div>
              <Label htmlFor="acn">{t('fields.acn')}</Label>
              <Input
                id="acn"
                maxLength={9}
                placeholder={t('placeholders.acnFormat')}
                value={formData.acn || ''}
                onChange={(e) =>
                  setFormData({ ...formData, acn: e.target.value.replace(/\D/g, '') })
                }
              />
              {errors.acn && <p className="mt-1 text-sm text-destructive">{errors.acn}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Person Card */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            {t('sections.contactPerson')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="contactFirstName">{t('fields.firstName')}</Label>
              <Input
                id="contactFirstName"
                value={formData.contactPerson?.firstName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPerson: { ...formData.contactPerson!, firstName: e.target.value },
                  })
                }
              />
              {errors.contactFirstName && (
                <p className="mt-1 text-sm text-destructive">{errors.contactFirstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="contactLastName">{t('fields.lastName')}</Label>
              <Input
                id="contactLastName"
                value={formData.contactPerson?.lastName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPerson: { ...formData.contactPerson!, lastName: e.target.value },
                  })
                }
              />
              {errors.contactLastName && (
                <p className="mt-1 text-sm text-destructive">{errors.contactLastName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="contactEmail">{t('fields.email')}</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactPerson?.email || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPerson: { ...formData.contactPerson!, email: e.target.value },
                  })
                }
              />
              {errors.contactEmail && (
                <p className="mt-1 text-sm text-destructive">{errors.contactEmail}</p>
              )}
            </div>
            <div>
              <Label htmlFor="contactPhone">{t('fields.phone')}</Label>
              <Input
                id="contactPhone"
                value={formData.contactPerson?.phone || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPerson: { ...formData.contactPerson!, phone: e.target.value },
                  })
                }
              />
              {errors.contactPhone && (
                <p className="mt-1 text-sm text-destructive">{errors.contactPhone}</p>
              )}
            </div>
            <div>
              <Label htmlFor="contactMobile">{t('fields.mobile')}</Label>
              <Input
                id="contactMobile"
                value={formData.contactPerson?.mobile || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPerson: { ...formData.contactPerson!, mobile: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address Card */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            {t('sections.deliveryAddress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="deliveryStreet">{t('fields.street')}</Label>
            <Input
              id="deliveryStreet"
              value={formData.deliveryAddress?.street || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  deliveryAddress: { ...formData.deliveryAddress!, street: e.target.value },
                })
              }
            />
            {errors.deliveryStreet && (
              <p className="mt-1 text-sm text-destructive">{errors.deliveryStreet}</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="deliverySuburb">{t('fields.suburb')}</Label>
              <Input
                id="deliverySuburb"
                value={formData.deliveryAddress?.suburb || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deliveryAddress: { ...formData.deliveryAddress!, suburb: e.target.value },
                  })
                }
              />
              {errors.deliverySuburb && (
                <p className="mt-1 text-sm text-destructive">{errors.deliverySuburb}</p>
              )}
            </div>
            <div>
              <Label htmlFor="deliveryState">{t('fields.state')}</Label>
              <Input
                id="deliveryState"
                value={formData.deliveryAddress?.state || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deliveryAddress: { ...formData.deliveryAddress!, state: e.target.value },
                  })
                }
              />
              {errors.deliveryState && (
                <p className="mt-1 text-sm text-destructive">{errors.deliveryState}</p>
              )}
            </div>
            <div>
              <Label htmlFor="deliveryPostcode">{t('fields.postcode')}</Label>
              <Input
                id="deliveryPostcode"
                maxLength={4}
                value={formData.deliveryAddress?.postcode || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deliveryAddress: {
                      ...formData.deliveryAddress!,
                      postcode: e.target.value.replace(/\D/g, ''),
                    },
                  })
                }
              />
              {errors.deliveryPostcode && (
                <p className="mt-1 text-sm text-destructive">{errors.deliveryPostcode}</p>
              )}
            </div>
          </div>
          {/* Area selection removed - area is auto-assigned by backend based on suburb */}
          <div>
            <Label htmlFor="deliveryInstructions">{t('fields.deliveryInstructions')}</Label>
            <textarea
              id="deliveryInstructions"
              rows={3}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              value={formData.deliveryAddress?.deliveryInstructions || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  deliveryAddress: {
                    ...formData.deliveryAddress!,
                    deliveryInstructions: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Credit Request Card */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            {t('sections.creditRequest')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="requestedCreditLimit">{t('fields.requestedCreditLimit')}</Label>
              <Input
                id="requestedCreditLimit"
                type="number"
                min="0"
                step="100"
                value={formData.requestedCreditLimit ? (formData.requestedCreditLimit / 100).toFixed(0) : ''}
                onChange={(e) => {
                  const cents = parseToCents(e.target.value) || 0;
                  setFormData({ ...formData, requestedCreditLimit: cents });
                }}
                placeholder={t('placeholders.creditLimitExample')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('enterAmountHint')}</p>
            </div>
            <div>
              <Label htmlFor="forecastPurchase">{t('fields.forecastPurchase')}</Label>
              <Input
                id="forecastPurchase"
                type="number"
                min="0"
                step="100"
                value={formData.forecastPurchase ? (formData.forecastPurchase / 100).toFixed(0) : ''}
                onChange={(e) => {
                  const cents = parseToCents(e.target.value) || 0;
                  setFormData({ ...formData, forecastPurchase: cents });
                }}
                placeholder={t('placeholders.forecastPurchaseExample')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('enterAmountHint')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext}>{t('buttons.next')}</Button>
      </div>
    </div>
  );
}
