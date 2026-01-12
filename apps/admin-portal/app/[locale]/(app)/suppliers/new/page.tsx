'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@joho-erp/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/trpc/client';
import { parseToCents, validateABN, validateACN } from '@joho-erp/shared';

// Australian states for dropdown
const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const;
type AustralianState = (typeof AUSTRALIAN_STATES)[number];

// Payment methods matching Prisma enum
const PAYMENT_METHODS = [
  'bank_transfer',
  'credit_card',
  'cheque',
  'cash_on_delivery',
  'account_credit',
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export default function NewSupplierPage() {
  const router = useRouter();
  const t = useTranslations('supplierForm');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('business');

  const createSupplierMutation = api.supplier.create.useMutation({
    onSuccess: () => {
      alert(t('messages.createSuccess'));
      router.push('/suppliers');
    },
    onError: (error: { message?: string }) => {
      alert(error.message || t('messages.fixValidationErrors'));
      setIsSubmitting(false);
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    supplierCode: '',
    businessName: '',
    tradingName: '',
    abn: '',
    acn: '',
    primaryCategories: '' as string, // Comma-separated, will be split on submit
    primaryContact: {
      name: '',
      position: '',
      email: '',
      phone: '',
      mobile: '',
    },
    businessAddress: {
      street: '',
      suburb: '',
      state: 'NSW' as AustralianState,
      postcode: '',
      country: 'Australia',
    },
    paymentTerms: '',
    paymentMethod: 'account_credit' as PaymentMethod,
    creditLimit: '', // Dollar string, will be converted to cents
    minimumOrderValue: '', // Dollar string, will be converted to cents
    leadTimeDays: '',
    deliveryDays: '',
    internalNotes: '',
  });

  // Validation error states
  const [businessErrors, setBusinessErrors] = useState<Record<string, string>>({});
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [financialErrors, setFinancialErrors] = useState<Record<string, string>>({});

  // Clear individual field error helpers
  const clearBusinessError = (field: string) => {
    if (businessErrors[field]) {
      const newErrors = { ...businessErrors };
      delete newErrors[field];
      setBusinessErrors(newErrors);
    }
  };

  const clearContactError = (field: string) => {
    if (contactErrors[field]) {
      const newErrors = { ...contactErrors };
      delete newErrors[field];
      setContactErrors(newErrors);
    }
  };

  const clearAddressError = (field: string) => {
    if (addressErrors[field]) {
      const newErrors = { ...addressErrors };
      delete newErrors[field];
      setAddressErrors(newErrors);
    }
  };

  const clearFinancialError = (field: string) => {
    if (financialErrors[field]) {
      const newErrors = { ...financialErrors };
      delete newErrors[field];
      setFinancialErrors(newErrors);
    }
  };

  // Validate Business Info tab
  const validateBusinessTab = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.supplierCode.trim()) {
      errors.supplierCode = t('validation.supplierCodeRequired');
    }

    if (!formData.businessName.trim()) {
      errors.businessName = t('validation.businessNameRequired');
    }

    // Validate ABN if provided
    if (formData.abn && !validateABN(formData.abn)) {
      errors.abn = 'Invalid ABN format';
    }

    // Validate ACN if provided
    if (formData.acn && !validateACN(formData.acn)) {
      errors.acn = 'Invalid ACN format';
    }

    setBusinessErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Contact & Address tab
  const validateContactTab = (): boolean => {
    const contactErrs: Record<string, string> = {};
    const addressErrs: Record<string, string> = {};

    // Primary contact validation
    if (!formData.primaryContact.name.trim()) {
      contactErrs.name = t('validation.contactNameRequired');
    }

    if (!formData.primaryContact.email.trim()) {
      contactErrs.email = t('validation.contactEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContact.email)) {
      contactErrs.email = t('validation.contactEmailInvalid');
    }

    if (!formData.primaryContact.phone.trim()) {
      contactErrs.phone = t('validation.contactPhoneRequired');
    }

    // Business address validation
    if (!formData.businessAddress.street.trim()) {
      addressErrs.street = t('validation.streetRequired');
    }

    if (!formData.businessAddress.suburb.trim()) {
      addressErrs.suburb = t('validation.suburbRequired');
    }

    if (!formData.businessAddress.state) {
      addressErrs.state = t('validation.stateRequired');
    }

    if (!formData.businessAddress.postcode.trim()) {
      addressErrs.postcode = t('validation.postcodeRequired');
    } else if (!/^\d{4}$/.test(formData.businessAddress.postcode)) {
      addressErrs.postcode = t('validation.postcodeInvalid');
    }

    setContactErrors(contactErrs);
    setAddressErrors(addressErrs);
    return Object.keys(contactErrs).length === 0 && Object.keys(addressErrs).length === 0;
  };

  // Validate Financial Terms tab
  const validateFinancialTab = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate credit limit if provided
    if (formData.creditLimit) {
      const cents = parseToCents(formData.creditLimit);
      if (cents === null) {
        errors.creditLimit = t('validation.creditLimitInvalid');
      }
    }

    // Validate minimum order value if provided
    if (formData.minimumOrderValue) {
      const cents = parseToCents(formData.minimumOrderValue);
      if (cents === null) {
        errors.minimumOrderValue = t('validation.creditLimitInvalid');
      }
    }

    // Validate lead time days if provided
    if (formData.leadTimeDays && (isNaN(Number(formData.leadTimeDays)) || Number(formData.leadTimeDays) <= 0)) {
      errors.leadTimeDays = 'Must be a positive number';
    }

    setFinancialErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate all tabs
  const validateAll = (): boolean => {
    const businessValid = validateBusinessTab();
    const contactValid = validateContactTab();
    const financialValid = validateFinancialTab();

    return businessValid && contactValid && financialValid;
  };

  // Handle tab navigation with validation
  const handleTabChange = (newTab: string) => {
    // Validate current tab before moving
    if (activeTab === 'business') {
      validateBusinessTab();
    } else if (activeTab === 'contact') {
      validateContactTab();
    } else if (activeTab === 'financial') {
      validateFinancialTab();
    }

    setActiveTab(newTab);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateAll()) {
      alert(t('messages.fixValidationErrors'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert monetary values to cents
      const creditLimitCents = formData.creditLimit ? parseToCents(formData.creditLimit) : 0;
      const minimumOrderValueCents = formData.minimumOrderValue ? parseToCents(formData.minimumOrderValue) : undefined;

      // Parse categories from comma-separated string
      const categories = formData.primaryCategories
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      await createSupplierMutation.mutateAsync({
        supplierCode: formData.supplierCode.trim(),
        businessName: formData.businessName.trim(),
        tradingName: formData.tradingName.trim() || undefined,
        abn: formData.abn.trim() || undefined,
        acn: formData.acn.trim() || undefined,
        primaryCategories: categories,
        primaryContact: {
          name: formData.primaryContact.name.trim(),
          position: formData.primaryContact.position.trim() || undefined,
          email: formData.primaryContact.email.trim(),
          phone: formData.primaryContact.phone.trim(),
          mobile: formData.primaryContact.mobile.trim() || undefined,
        },
        businessAddress: {
          street: formData.businessAddress.street.trim(),
          suburb: formData.businessAddress.suburb.trim(),
          state: formData.businessAddress.state,
          postcode: formData.businessAddress.postcode.trim(),
          country: 'Australia',
        },
        paymentTerms: formData.paymentTerms.trim() || undefined,
        paymentMethod: formData.paymentMethod,
        creditLimit: creditLimitCents ?? 0,
        minimumOrderValue: minimumOrderValueCents,
        leadTimeDays: formData.leadTimeDays ? Number(formData.leadTimeDays) : undefined,
        deliveryDays: formData.deliveryDays.trim() || undefined,
        internalNotes: formData.internalNotes.trim() || undefined,
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  // Tab button styling
  const tabButtonClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      activeTab === tab
        ? 'bg-background text-foreground border-b-2 border-primary'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`;

  // Check if tab has errors
  const hasBusinessErrors = Object.keys(businessErrors).length > 0;
  const hasContactErrors = Object.keys(contactErrors).length > 0 || Object.keys(addressErrors).length > 0;
  const hasFinancialErrors = Object.keys(financialErrors).length > 0;

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/suppliers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('title.create')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader className="pb-0">
          {/* Tabs */}
          <div className="flex gap-1 border-b -mx-6 px-6">
            <button
              type="button"
              className={tabButtonClass('business')}
              onClick={() => handleTabChange('business')}
            >
              {t('tabs.business')}
              {hasBusinessErrors && <span className="ml-1 text-destructive">•</span>}
            </button>
            <button
              type="button"
              className={tabButtonClass('contact')}
              onClick={() => handleTabChange('contact')}
            >
              {t('tabs.contact')}
              {hasContactErrors && <span className="ml-1 text-destructive">•</span>}
            </button>
            <button
              type="button"
              className={tabButtonClass('financial')}
              onClick={() => handleTabChange('financial')}
            >
              {t('tabs.financial')}
              {hasFinancialErrors && <span className="ml-1 text-destructive">•</span>}
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Supplier Code */}
                <div className="space-y-2">
                  <Label htmlFor="supplierCode">
                    {t('fields.supplierCode')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="supplierCode"
                    placeholder={t('fields.supplierCodePlaceholder')}
                    value={formData.supplierCode}
                    onChange={(e) => {
                      setFormData({ ...formData, supplierCode: e.target.value });
                      clearBusinessError('supplierCode');
                    }}
                    className={businessErrors.supplierCode ? 'border-destructive' : ''}
                  />
                  {businessErrors.supplierCode && (
                    <p className="text-sm text-destructive">{businessErrors.supplierCode}</p>
                  )}
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="businessName">
                    {t('fields.businessName')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    placeholder={t('fields.businessNamePlaceholder')}
                    value={formData.businessName}
                    onChange={(e) => {
                      setFormData({ ...formData, businessName: e.target.value });
                      clearBusinessError('businessName');
                    }}
                    className={businessErrors.businessName ? 'border-destructive' : ''}
                  />
                  {businessErrors.businessName && (
                    <p className="text-sm text-destructive">{businessErrors.businessName}</p>
                  )}
                </div>

                {/* Trading Name */}
                <div className="space-y-2">
                  <Label htmlFor="tradingName">{t('fields.tradingName')}</Label>
                  <Input
                    id="tradingName"
                    placeholder={t('fields.tradingNamePlaceholder')}
                    value={formData.tradingName}
                    onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
                  />
                </div>

                {/* ABN */}
                <div className="space-y-2">
                  <Label htmlFor="abn">{t('fields.abn')}</Label>
                  <Input
                    id="abn"
                    placeholder={t('fields.abnPlaceholder')}
                    value={formData.abn}
                    onChange={(e) => {
                      setFormData({ ...formData, abn: e.target.value });
                      clearBusinessError('abn');
                    }}
                    className={businessErrors.abn ? 'border-destructive' : ''}
                  />
                  {businessErrors.abn && (
                    <p className="text-sm text-destructive">{businessErrors.abn}</p>
                  )}
                </div>

                {/* ACN */}
                <div className="space-y-2">
                  <Label htmlFor="acn">{t('fields.acn')}</Label>
                  <Input
                    id="acn"
                    placeholder={t('fields.acnPlaceholder')}
                    value={formData.acn}
                    onChange={(e) => {
                      setFormData({ ...formData, acn: e.target.value });
                      clearBusinessError('acn');
                    }}
                    className={businessErrors.acn ? 'border-destructive' : ''}
                  />
                  {businessErrors.acn && (
                    <p className="text-sm text-destructive">{businessErrors.acn}</p>
                  )}
                </div>

                {/* Primary Categories */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="primaryCategories">{t('fields.primaryCategories')}</Label>
                  <Input
                    id="primaryCategories"
                    placeholder={t('fields.primaryCategoriesPlaceholder')}
                    value={formData.primaryCategories}
                    onChange={(e) => setFormData({ ...formData, primaryCategories: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Separate multiple categories with commas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact & Address Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              {/* Primary Contact Section */}
              <div>
                <h3 className="text-lg font-medium mb-4">{t('sections.primaryContact')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Contact Name */}
                  <div className="space-y-2">
                    <Label htmlFor="contactName">
                      {t('fields.contactName')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactName"
                      placeholder={t('fields.contactNamePlaceholder')}
                      value={formData.primaryContact.name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          primaryContact: { ...formData.primaryContact, name: e.target.value },
                        });
                        clearContactError('name');
                      }}
                      className={contactErrors.name ? 'border-destructive' : ''}
                    />
                    {contactErrors.name && (
                      <p className="text-sm text-destructive">{contactErrors.name}</p>
                    )}
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label htmlFor="contactPosition">{t('fields.contactPosition')}</Label>
                    <Input
                      id="contactPosition"
                      placeholder={t('fields.contactPositionPlaceholder')}
                      value={formData.primaryContact.position}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          primaryContact: { ...formData.primaryContact, position: e.target.value },
                        })
                      }
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">
                      {t('fields.contactEmail')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder={t('fields.contactEmailPlaceholder')}
                      value={formData.primaryContact.email}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          primaryContact: { ...formData.primaryContact, email: e.target.value },
                        });
                        clearContactError('email');
                      }}
                      className={contactErrors.email ? 'border-destructive' : ''}
                    />
                    {contactErrors.email && (
                      <p className="text-sm text-destructive">{contactErrors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">
                      {t('fields.contactPhone')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactPhone"
                      placeholder={t('fields.contactPhonePlaceholder')}
                      value={formData.primaryContact.phone}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          primaryContact: { ...formData.primaryContact, phone: e.target.value },
                        });
                        clearContactError('phone');
                      }}
                      className={contactErrors.phone ? 'border-destructive' : ''}
                    />
                    {contactErrors.phone && (
                      <p className="text-sm text-destructive">{contactErrors.phone}</p>
                    )}
                  </div>

                  {/* Mobile */}
                  <div className="space-y-2">
                    <Label htmlFor="contactMobile">{t('fields.contactMobile')}</Label>
                    <Input
                      id="contactMobile"
                      placeholder={t('fields.contactMobilePlaceholder')}
                      value={formData.primaryContact.mobile}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          primaryContact: { ...formData.primaryContact, mobile: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Business Address Section */}
              <div>
                <h3 className="text-lg font-medium mb-4">{t('sections.businessAddress')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Street */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">
                      {t('fields.street')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="street"
                      placeholder={t('fields.streetPlaceholder')}
                      value={formData.businessAddress.street}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          businessAddress: { ...formData.businessAddress, street: e.target.value },
                        });
                        clearAddressError('street');
                      }}
                      className={addressErrors.street ? 'border-destructive' : ''}
                    />
                    {addressErrors.street && (
                      <p className="text-sm text-destructive">{addressErrors.street}</p>
                    )}
                  </div>

                  {/* Suburb */}
                  <div className="space-y-2">
                    <Label htmlFor="suburb">
                      {t('fields.suburb')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="suburb"
                      placeholder={t('fields.suburbPlaceholder')}
                      value={formData.businessAddress.suburb}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          businessAddress: { ...formData.businessAddress, suburb: e.target.value },
                        });
                        clearAddressError('suburb');
                      }}
                      className={addressErrors.suburb ? 'border-destructive' : ''}
                    />
                    {addressErrors.suburb && (
                      <p className="text-sm text-destructive">{addressErrors.suburb}</p>
                    )}
                  </div>

                  {/* State */}
                  <div className="space-y-2">
                    <Label htmlFor="state">
                      {t('fields.state')} <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="state"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.businessAddress.state}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          businessAddress: {
                            ...formData.businessAddress,
                            state: e.target.value as AustralianState,
                          },
                        });
                        clearAddressError('state');
                      }}
                    >
                      {AUSTRALIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {addressErrors.state && (
                      <p className="text-sm text-destructive">{addressErrors.state}</p>
                    )}
                  </div>

                  {/* Postcode */}
                  <div className="space-y-2">
                    <Label htmlFor="postcode">
                      {t('fields.postcode')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="postcode"
                      placeholder={t('fields.postcodePlaceholder')}
                      maxLength={4}
                      value={formData.businessAddress.postcode}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          businessAddress: { ...formData.businessAddress, postcode: e.target.value },
                        });
                        clearAddressError('postcode');
                      }}
                      className={addressErrors.postcode ? 'border-destructive' : ''}
                    />
                    {addressErrors.postcode && (
                      <p className="text-sm text-destructive">{addressErrors.postcode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Terms Tab */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Payment Method */}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">{t('fields.paymentMethod')}</Label>
                  <select
                    id="paymentMethod"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })
                    }
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash_on_delivery">Cash on Delivery</option>
                    <option value="account_credit">Account Credit</option>
                  </select>
                </div>

                {/* Payment Terms */}
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">{t('fields.paymentTerms')}</Label>
                  <Input
                    id="paymentTerms"
                    placeholder={t('fields.paymentTermsPlaceholder')}
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  />
                </div>

                {/* Credit Limit */}
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">{t('fields.creditLimit')}</Label>
                  <Input
                    id="creditLimit"
                    placeholder={t('fields.creditLimitPlaceholder')}
                    value={formData.creditLimit}
                    onChange={(e) => {
                      setFormData({ ...formData, creditLimit: e.target.value });
                      clearFinancialError('creditLimit');
                    }}
                    className={financialErrors.creditLimit ? 'border-destructive' : ''}
                  />
                  {financialErrors.creditLimit && (
                    <p className="text-sm text-destructive">{financialErrors.creditLimit}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{t('hints.enterDollars')}</p>
                </div>

                {/* Minimum Order Value */}
                <div className="space-y-2">
                  <Label htmlFor="minimumOrderValue">{t('fields.minimumOrderValue')}</Label>
                  <Input
                    id="minimumOrderValue"
                    placeholder={t('fields.minimumOrderValuePlaceholder')}
                    value={formData.minimumOrderValue}
                    onChange={(e) => {
                      setFormData({ ...formData, minimumOrderValue: e.target.value });
                      clearFinancialError('minimumOrderValue');
                    }}
                    className={financialErrors.minimumOrderValue ? 'border-destructive' : ''}
                  />
                  {financialErrors.minimumOrderValue && (
                    <p className="text-sm text-destructive">{financialErrors.minimumOrderValue}</p>
                  )}
                </div>

                {/* Lead Time Days */}
                <div className="space-y-2">
                  <Label htmlFor="leadTimeDays">{t('fields.leadTimeDays')}</Label>
                  <Input
                    id="leadTimeDays"
                    type="number"
                    min="1"
                    placeholder={t('fields.leadTimeDaysPlaceholder')}
                    value={formData.leadTimeDays}
                    onChange={(e) => {
                      setFormData({ ...formData, leadTimeDays: e.target.value });
                      clearFinancialError('leadTimeDays');
                    }}
                    className={financialErrors.leadTimeDays ? 'border-destructive' : ''}
                  />
                  {financialErrors.leadTimeDays && (
                    <p className="text-sm text-destructive">{financialErrors.leadTimeDays}</p>
                  )}
                </div>

                {/* Delivery Days */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryDays">{t('fields.deliveryDays')}</Label>
                  <Input
                    id="deliveryDays"
                    placeholder={t('fields.deliveryDaysPlaceholder')}
                    value={formData.deliveryDays}
                    onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                  />
                </div>

                {/* Internal Notes */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="internalNotes">Internal Notes</Label>
                  <textarea
                    id="internalNotes"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Internal notes about this supplier..."
                    value={formData.internalNotes}
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t">
          <Link href="/suppliers">
            <Button variant="outline" type="button">
              {t('buttons.cancel')}
            </Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? t('buttons.creating') : t('buttons.createSupplier')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
