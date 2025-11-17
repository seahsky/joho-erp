'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@jimmy-beef/ui';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/trpc/client';

// Type definitions
type DirectorInfo = {
  familyName: string;
  givenNames: string;
  residentialAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  dateOfBirth: string;
  driverLicenseNumber: string;
  licenseState: 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  licenseExpiry: string;
  position?: string;
};

type TradeReferenceInfo = {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
};

export default function NewCustomerPage() {
  const router = useRouter();
  const t = useTranslations('customerForm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('business');

  const createCustomerMutation = api.customer.createCustomer.useMutation({
    onSuccess: () => {
      alert(t('messages.createSuccess'));
      router.push('/customers');
    },
    onError: (error: { message?: string }) => {
      alert(error.message || t('messages.createError'));
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    accountType: 'company' as 'sole_trader' | 'partnership' | 'company' | 'other',
    businessName: '',
    tradingName: '',
    abn: '',
    acn: '',
    contactPerson: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
    },
    deliveryAddress: {
      street: '',
      suburb: '',
      state: 'NSW',
      postcode: '',
      areaTag: 'north' as 'north' | 'south' | 'east' | 'west',
      deliveryInstructions: '',
    },
    billingAddress: {
      street: '',
      suburb: '',
      state: 'NSW',
      postcode: '',
    },
    postalAddress: {
      street: '',
      suburb: '',
      state: 'NSW',
      postcode: '',
    },
    requestedCreditLimit: undefined as number | undefined,
    forecastPurchase: undefined as number | undefined,
    creditLimit: 0,
    paymentTerms: '',
    notes: '',
    directors: [] as DirectorInfo[],
    financialDetails: {
      bankName: '',
      accountName: '',
      bsb: '',
      accountNumber: '',
    },
    tradeReferences: [] as TradeReferenceInfo[],
  });

  const [sameAsDelivery, setSameAsDelivery] = useState(true);
  const [postalSameAsBilling, setPostalSameAsBilling] = useState(true);
  const [includeFinancial, setIncludeFinancial] = useState(false);

  // Helper functions for directors
  const addDirector = () => {
    setFormData({
      ...formData,
      directors: [
        ...formData.directors,
        {
          familyName: '',
          givenNames: '',
          residentialAddress: { street: '', suburb: '', state: 'NSW', postcode: '' },
          dateOfBirth: '',
          driverLicenseNumber: '',
          licenseState: 'NSW',
          licenseExpiry: '',
          position: '',
        },
      ],
    });
  };

  const removeDirector = (index: number) => {
    setFormData({
      ...formData,
      directors: formData.directors.filter((_, i) => i !== index),
    });
  };

  const updateDirector = (index: number, field: string, value: string) => {
    const updated = [...formData.directors];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'residentialAddress') {
        updated[index] = {
          ...updated[index],
          residentialAddress: { ...updated[index].residentialAddress, [child]: value },
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormData({ ...formData, directors: updated });
  };

  // Helper functions for trade references
  const addTradeReference = () => {
    setFormData({
      ...formData,
      tradeReferences: [
        ...formData.tradeReferences,
        { companyName: '', contactPerson: '', phone: '', email: '' },
      ],
    });
  };

  const removeTradeReference = (index: number) => {
    setFormData({
      ...formData,
      tradeReferences: formData.tradeReferences.filter((_, i) => i !== index),
    });
  };

  const updateTradeReference = (index: number, field: string, value: string) => {
    const updated = [...formData.tradeReferences];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, tradeReferences: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createCustomerMutation.mutateAsync({
        accountType: formData.accountType,
        businessName: formData.businessName,
        tradingName: formData.tradingName || undefined,
        abn: formData.abn,
        acn: formData.acn || undefined,
        contactPerson: formData.contactPerson,
        deliveryAddress: formData.deliveryAddress,
        billingAddress: sameAsDelivery ? undefined : formData.billingAddress,
        postalAddress: postalSameAsBilling ? undefined : formData.postalAddress,
        requestedCreditLimit: formData.requestedCreditLimit,
        forecastPurchase: formData.forecastPurchase,
        creditLimit: formData.creditLimit,
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes || undefined,
        directors: formData.directors.length > 0 ? formData.directors : undefined,
        financialDetails: includeFinancial ? formData.financialDetails : undefined,
        tradeReferences: formData.tradeReferences.length > 0 ? formData.tradeReferences : undefined,
      });
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToCustomers')}
          </Button>
        </Link>
        <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Custom Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 border-b">
            {[
              { value: 'business', label: t('tabs.business') },
              { value: 'contact', label: t('tabs.contact') },
              { value: 'addresses', label: t('tabs.addresses') },
              { value: 'credit', label: t('tabs.credit') },
              { value: 'directors', label: t('tabs.directors') },
              { value: 'financial', label: t('tabs.financial') },
              { value: 'references', label: t('tabs.references') },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Business Information Tab */}
        {activeTab === 'business' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('businessInfo.title')}</CardTitle>
                <CardDescription>{t('businessInfo.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountType">{t('businessInfo.accountType')} *</Label>
                  <select
                    id="accountType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.accountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountType: e.target.value as 'sole_trader' | 'partnership' | 'company' | 'other',
                      })
                    }
                    required
                  >
                    <option value="sole_trader">{t('businessInfo.accountTypes.soleTrader')}</option>
                    <option value="partnership">{t('businessInfo.accountTypes.partnership')}</option>
                    <option value="company">{t('businessInfo.accountTypes.company')}</option>
                    <option value="other">{t('businessInfo.accountTypes.other')}</option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">{t('businessInfo.businessName')} *</Label>
                    <Input
                      id="businessName"
                      placeholder={t('businessInfo.businessNamePlaceholder')}
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tradingName">{t('businessInfo.tradingName')}</Label>
                    <Input
                      id="tradingName"
                      placeholder={t('businessInfo.tradingNamePlaceholder')}
                      value={formData.tradingName}
                      onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="abn">{t('businessInfo.abn')} *</Label>
                    <Input
                      id="abn"
                      placeholder={t('businessInfo.abnPlaceholder')}
                      required
                      maxLength={11}
                      value={formData.abn}
                      onChange={(e) => setFormData({ ...formData, abn: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acn">{t('businessInfo.acn')}</Label>
                    <Input
                      id="acn"
                      placeholder={t('businessInfo.acnPlaceholder')}
                      maxLength={9}
                      value={formData.acn}
                      onChange={(e) => setFormData({ ...formData, acn: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contact Person Tab */}
        {activeTab === 'contact' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('contactPerson.title')}</CardTitle>
                <CardDescription>{t('contactPerson.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('contactPerson.firstName')} *</Label>
                    <Input
                      id="firstName"
                      placeholder={t('contactPerson.firstNamePlaceholder')}
                      required
                      value={formData.contactPerson.firstName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPerson: { ...formData.contactPerson, firstName: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('contactPerson.lastName')} *</Label>
                    <Input
                      id="lastName"
                      placeholder={t('contactPerson.lastNamePlaceholder')}
                      required
                      value={formData.contactPerson.lastName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPerson: { ...formData.contactPerson, lastName: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('contactPerson.email')} *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('contactPerson.emailPlaceholder')}
                      required
                      value={formData.contactPerson.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPerson: { ...formData.contactPerson, email: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('contactPerson.phone')} *</Label>
                    <Input
                      id="phone"
                      placeholder={t('contactPerson.phonePlaceholder')}
                      required
                      value={formData.contactPerson.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPerson: { ...formData.contactPerson, phone: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">{t('contactPerson.mobile')}</Label>
                  <Input
                    id="mobile"
                    placeholder={t('contactPerson.mobilePlaceholder')}
                    value={formData.contactPerson.mobile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPerson: { ...formData.contactPerson, mobile: e.target.value },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="mt-6 space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle>{t('addresses.deliveryTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryStreet">{t('addresses.street')} *</Label>
                  <Input
                    id="deliveryStreet"
                    placeholder={t('addresses.streetPlaceholder')}
                    required
                    value={formData.deliveryAddress.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryAddress: { ...formData.deliveryAddress, street: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="deliverySuburb">{t('addresses.suburb')} *</Label>
                    <Input
                      id="deliverySuburb"
                      placeholder={t('addresses.suburbPlaceholder')}
                      required
                      value={formData.deliveryAddress.suburb}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryAddress: { ...formData.deliveryAddress, suburb: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryState">{t('addresses.state')} *</Label>
                    <select
                      id="deliveryState"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.deliveryAddress.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryAddress: { ...formData.deliveryAddress, state: e.target.value },
                        })
                      }
                      required
                    >
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="SA">SA</option>
                      <option value="WA">WA</option>
                      <option value="TAS">TAS</option>
                      <option value="NT">NT</option>
                      <option value="ACT">ACT</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryPostcode">{t('addresses.postcode')} *</Label>
                    <Input
                      id="deliveryPostcode"
                      placeholder={t('addresses.postcodePlaceholder')}
                      required
                      maxLength={4}
                      value={formData.deliveryAddress.postcode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryAddress: { ...formData.deliveryAddress, postcode: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaTag">{t('addresses.areaTag')} *</Label>
                  <select
                    id="areaTag"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.deliveryAddress.areaTag}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryAddress: {
                          ...formData.deliveryAddress,
                          areaTag: e.target.value as 'north' | 'south' | 'east' | 'west',
                        },
                      })
                    }
                    required
                  >
                    <option value="north">{t('addresses.areaTags.north')}</option>
                    <option value="south">{t('addresses.areaTags.south')}</option>
                    <option value="east">{t('addresses.areaTags.east')}</option>
                    <option value="west">{t('addresses.areaTags.west')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryInstructions">{t('addresses.deliveryInstructions')}</Label>
                  <Input
                    id="deliveryInstructions"
                    placeholder={t('addresses.deliveryInstructionsPlaceholder')}
                    value={formData.deliveryAddress.deliveryInstructions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryAddress: { ...formData.deliveryAddress, deliveryInstructions: e.target.value },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>{t('addresses.billingTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sameAsDelivery"
                    checked={sameAsDelivery}
                    onChange={(e) => setSameAsDelivery(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="sameAsDelivery" className="font-normal">
                    {t('addresses.sameAsDelivery')}
                  </Label>
                </div>

                {!sameAsDelivery && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="billingStreet">{t('addresses.street')} *</Label>
                      <Input
                        id="billingStreet"
                        required={!sameAsDelivery}
                        value={formData.billingAddress.street}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingAddress: { ...formData.billingAddress, street: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="billingSuburb">{t('addresses.suburb')} *</Label>
                        <Input
                          id="billingSuburb"
                          required={!sameAsDelivery}
                          value={formData.billingAddress.suburb}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingAddress: { ...formData.billingAddress, suburb: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billingState">{t('addresses.state')} *</Label>
                        <select
                          id="billingState"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={formData.billingAddress.state}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingAddress: { ...formData.billingAddress, state: e.target.value },
                            })
                          }
                          required={!sameAsDelivery}
                        >
                          <option value="NSW">NSW</option>
                          <option value="VIC">VIC</option>
                          <option value="QLD">QLD</option>
                          <option value="SA">SA</option>
                          <option value="WA">WA</option>
                          <option value="TAS">TAS</option>
                          <option value="NT">NT</option>
                          <option value="ACT">ACT</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billingPostcode">{t('addresses.postcode')} *</Label>
                        <Input
                          id="billingPostcode"
                          required={!sameAsDelivery}
                          maxLength={4}
                          value={formData.billingAddress.postcode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billingAddress: { ...formData.billingAddress, postcode: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Postal Address */}
            <Card>
              <CardHeader>
                <CardTitle>{t('addresses.postalTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="postalSameAsBilling"
                    checked={postalSameAsBilling}
                    onChange={(e) => setPostalSameAsBilling(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="postalSameAsBilling" className="font-normal">
                    {t('addresses.sameAsBilling')}
                  </Label>
                </div>

                {!postalSameAsBilling && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="postalStreet">{t('addresses.street')} *</Label>
                      <Input
                        id="postalStreet"
                        required={!postalSameAsBilling}
                        value={formData.postalAddress.street}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            postalAddress: { ...formData.postalAddress, street: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="postalSuburb">{t('addresses.suburb')} *</Label>
                        <Input
                          id="postalSuburb"
                          required={!postalSameAsBilling}
                          value={formData.postalAddress.suburb}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              postalAddress: { ...formData.postalAddress, suburb: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalState">{t('addresses.state')} *</Label>
                        <select
                          id="postalState"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={formData.postalAddress.state}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              postalAddress: { ...formData.postalAddress, state: e.target.value },
                            })
                          }
                          required={!postalSameAsBilling}
                        >
                          <option value="NSW">NSW</option>
                          <option value="VIC">VIC</option>
                          <option value="QLD">QLD</option>
                          <option value="SA">SA</option>
                          <option value="WA">WA</option>
                          <option value="TAS">TAS</option>
                          <option value="NT">NT</option>
                          <option value="ACT">ACT</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalPostcode">{t('addresses.postcode')} *</Label>
                        <Input
                          id="postalPostcode"
                          required={!postalSameAsBilling}
                          maxLength={4}
                          value={formData.postalAddress.postcode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              postalAddress: { ...formData.postalAddress, postcode: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Credit Application Tab */}
        {activeTab === 'credit' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('creditApplication.title')}</CardTitle>
                <CardDescription>{t('creditApplication.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="requestedCreditLimit">{t('creditApplication.requestedCreditLimit')}</Label>
                    <Input
                      id="requestedCreditLimit"
                      type="number"
                      min="0"
                      step="100"
                      placeholder={t('creditApplication.requestedCreditLimitPlaceholder')}
                      value={formData.requestedCreditLimit || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requestedCreditLimit: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forecastPurchase">{t('creditApplication.forecastPurchase')}</Label>
                    <Input
                      id="forecastPurchase"
                      type="number"
                      min="0"
                      step="100"
                      placeholder={t('creditApplication.forecastPurchasePlaceholder')}
                      value={formData.forecastPurchase || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          forecastPurchase: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">{t('creditApplication.approvedCreditLimit')}</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      min="0"
                      step="100"
                      placeholder={t('creditApplication.approvedCreditLimitPlaceholder')}
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">{t('creditApplication.noCredit')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">{t('creditApplication.paymentTerms')}</Label>
                    <Input
                      id="paymentTerms"
                      placeholder={t('creditApplication.paymentTermsPlaceholder')}
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t('creditApplication.notes')}</Label>
                  <textarea
                    id="notes"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={t('creditApplication.notesPlaceholder')}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Directors Tab */}
        {activeTab === 'directors' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('directors.title')}</CardTitle>
                <CardDescription>{t('directors.description')}</CardDescription>
                <p className="text-sm text-muted-foreground mt-2">{t('directors.optional')}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.directors.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No directors added yet</p>
                    <Button type="button" onClick={addDirector}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('directors.addDirector')}
                    </Button>
                  </div>
                ) : (
                  <>
                    {formData.directors.map((director, index) => (
                      <Card key={index} className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeDirector(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {t('directors.directorNumber', { number: index + 1 })}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t('directors.familyName')}</Label>
                              <Input
                                value={director.familyName}
                                onChange={(e) => updateDirector(index, 'familyName', e.target.value)}
                                placeholder={t('directors.familyNamePlaceholder')}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t('directors.givenNames')}</Label>
                              <Input
                                value={director.givenNames}
                                onChange={(e) => updateDirector(index, 'givenNames', e.target.value)}
                                placeholder={t('directors.givenNamesPlaceholder')}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t('directors.dateOfBirth')}</Label>
                              <Input
                                type="date"
                                value={director.dateOfBirth}
                                onChange={(e) => updateDirector(index, 'dateOfBirth', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t('directors.position')}</Label>
                              <Input
                                value={director.position || ''}
                                onChange={(e) => updateDirector(index, 'position', e.target.value)}
                                placeholder={t('directors.positionPlaceholder')}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>{t('directors.residentialAddress')}</Label>
                            <Input
                              value={director.residentialAddress.street}
                              onChange={(e) => updateDirector(index, 'residentialAddress.street', e.target.value)}
                              placeholder={t('addresses.streetPlaceholder')}
                              className="mb-2"
                            />
                            <div className="grid gap-2 md:grid-cols-3">
                              <Input
                                value={director.residentialAddress.suburb}
                                onChange={(e) => updateDirector(index, 'residentialAddress.suburb', e.target.value)}
                                placeholder={t('addresses.suburbPlaceholder')}
                              />
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={director.residentialAddress.state}
                                onChange={(e) => updateDirector(index, 'residentialAddress.state', e.target.value)}
                              >
                                <option value="NSW">NSW</option>
                                <option value="VIC">VIC</option>
                                <option value="QLD">QLD</option>
                                <option value="SA">SA</option>
                                <option value="WA">WA</option>
                                <option value="TAS">TAS</option>
                                <option value="NT">NT</option>
                                <option value="ACT">ACT</option>
                              </select>
                              <Input
                                value={director.residentialAddress.postcode}
                                onChange={(e) => updateDirector(index, 'residentialAddress.postcode', e.target.value)}
                                placeholder={t('addresses.postcodePlaceholder')}
                                maxLength={4}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>{t('directors.driverLicenseNumber')}</Label>
                              <Input
                                value={director.driverLicenseNumber}
                                onChange={(e) => updateDirector(index, 'driverLicenseNumber', e.target.value)}
                                placeholder={t('directors.driverLicenseNumberPlaceholder')}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t('directors.licenseState')}</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={director.licenseState}
                                onChange={(e) => updateDirector(index, 'licenseState', e.target.value)}
                              >
                                <option value="NSW">{t('directors.states.NSW')}</option>
                                <option value="VIC">{t('directors.states.VIC')}</option>
                                <option value="QLD">{t('directors.states.QLD')}</option>
                                <option value="SA">{t('directors.states.SA')}</option>
                                <option value="WA">{t('directors.states.WA')}</option>
                                <option value="TAS">{t('directors.states.TAS')}</option>
                                <option value="NT">{t('directors.states.NT')}</option>
                                <option value="ACT">{t('directors.states.ACT')}</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t('directors.licenseExpiry')}</Label>
                              <Input
                                type="date"
                                value={director.licenseExpiry}
                                onChange={(e) => updateDirector(index, 'licenseExpiry', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button type="button" onClick={addDirector} variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('directors.addDirector')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('financial.title')}</CardTitle>
                <CardDescription>{t('financial.description')}</CardDescription>
                <p className="text-sm text-muted-foreground mt-2">{t('financial.optional')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="includeFinancial"
                    checked={includeFinancial}
                    onChange={(e) => setIncludeFinancial(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="includeFinancial" className="font-normal">
                    Include financial information
                  </Label>
                </div>

                {includeFinancial && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">{t('financial.bankName')}</Label>
                        <Input
                          id="bankName"
                          placeholder={t('financial.bankNamePlaceholder')}
                          value={formData.financialDetails.bankName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              financialDetails: { ...formData.financialDetails, bankName: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountName">{t('financial.accountName')}</Label>
                        <Input
                          id="accountName"
                          placeholder={t('financial.accountNamePlaceholder')}
                          value={formData.financialDetails.accountName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              financialDetails: { ...formData.financialDetails, accountName: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bsb">{t('financial.bsb')}</Label>
                        <Input
                          id="bsb"
                          placeholder={t('financial.bsbPlaceholder')}
                          maxLength={7}
                          value={formData.financialDetails.bsb}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              financialDetails: { ...formData.financialDetails, bsb: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">{t('financial.accountNumber')}</Label>
                        <Input
                          id="accountNumber"
                          placeholder={t('financial.accountNumberPlaceholder')}
                          value={formData.financialDetails.accountNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              financialDetails: { ...formData.financialDetails, accountNumber: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trade References Tab */}
        {activeTab === 'references' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('tradeReferences.title')}</CardTitle>
                <CardDescription>{t('tradeReferences.description')}</CardDescription>
                <p className="text-sm text-muted-foreground mt-2">{t('tradeReferences.optional')}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.tradeReferences.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No trade references added yet</p>
                    <Button type="button" onClick={addTradeReference}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('tradeReferences.addReference')}
                    </Button>
                  </div>
                ) : (
                  <>
                    {formData.tradeReferences.map((reference, index) => (
                      <Card key={index} className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeTradeReference(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {t('tradeReferences.referenceNumber', { number: index + 1 })}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t('tradeReferences.companyName')}</Label>
                              <Input
                                value={reference.companyName}
                                onChange={(e) => updateTradeReference(index, 'companyName', e.target.value)}
                                placeholder={t('tradeReferences.companyNamePlaceholder')}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t('tradeReferences.contactPerson')}</Label>
                              <Input
                                value={reference.contactPerson}
                                onChange={(e) => updateTradeReference(index, 'contactPerson', e.target.value)}
                                placeholder={t('tradeReferences.contactPersonPlaceholder')}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t('tradeReferences.phone')}</Label>
                              <Input
                                value={reference.phone}
                                onChange={(e) => updateTradeReference(index, 'phone', e.target.value)}
                                placeholder={t('tradeReferences.phonePlaceholder')}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t('tradeReferences.email')}</Label>
                              <Input
                                type="email"
                                value={reference.email}
                                onChange={(e) => updateTradeReference(index, 'email', e.target.value)}
                                placeholder={t('tradeReferences.emailPlaceholder')}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button type="button" onClick={addTradeReference} variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('tradeReferences.addReference')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Message */}
        {createCustomerMutation.error && (
          <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="text-sm font-medium">{t('messages.createError')}</p>
            <p className="text-sm">{createCustomerMutation.error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-4">
          <Link href="/customers">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              {t('buttons.cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? t('buttons.creating') : t('buttons.createCustomer')}
          </Button>
        </div>
      </form>
    </div>
  );
}
