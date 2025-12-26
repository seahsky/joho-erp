'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@joho-erp/ui';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Settings,
  LogOut,
  Loader2,
  Edit,
  X,
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import type { User as ClerkUser } from '@clerk/nextjs/server';
import { api } from '@/trpc/client';
import { formatCurrency } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';

export function ProfileContent({ user }: { user: ClerkUser | null }) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const params = useParams();
  const locale = params.locale as string;

  const { data: customer, isLoading, error } = api.customer.getProfile.useQuery();
  const utils = api.useUtils();

  // Edit mode state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    phone: '',
    mobile: '',
    street: '',
    suburb: '',
    state: '',
    postcode: '',
    deliveryInstructions: '',
  });

  // Initialize form when customer data loads
  React.useEffect(() => {
    if (customer) {
      setEditForm({
        phone: customer.contactPerson.phone || '',
        mobile: customer.contactPerson.mobile || '',
        street: customer.deliveryAddress.street || '',
        suburb: customer.deliveryAddress.suburb || '',
        state: customer.deliveryAddress.state || '',
        postcode: customer.deliveryAddress.postcode || '',
        deliveryInstructions: customer.deliveryAddress.deliveryInstructions || '',
      });
    }
  }, [customer]);

  // Update profile mutation
  const updateProfile = api.customer.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: t('edit.success'),
        description: t('edit.successMessage'),
        variant: 'default',
      });
      setIsEditing(false);
      utils.customer.getProfile.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('edit.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      contactPerson: {
        phone: editForm.phone,
        mobile: editForm.mobile,
      },
      deliveryAddress: {
        street: editForm.street,
        suburb: editForm.suburb,
        deliveryInstructions: editForm.deliveryInstructions,
      },
    });
  };

  const handleCancel = () => {
    if (customer) {
      setEditForm({
        phone: customer.contactPerson.phone || '',
        mobile: customer.contactPerson.mobile || '',
        street: customer.deliveryAddress.street || '',
        suburb: customer.deliveryAddress.suburb || '',
        state: customer.deliveryAddress.state || '',
        postcode: customer.deliveryAddress.postcode || '',
        deliveryInstructions: customer.deliveryAddress.deliveryInstructions || '',
      });
    }
    setIsEditing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('loadingProfile')}</p>
      </div>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive mb-2">{t('errorLoading')}</p>
        <p className="text-sm text-muted-foreground">{error?.message || t('profileNotFound')}</p>
      </div>
    );
  }

  // usedCredit is now calculated from actual orders in the API
  const usedCredit = customer.usedCredit ?? 0;
  const availableCredit = customer.creditApplication.creditLimit - usedCredit;

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {user?.firstName?.[0] || customer.contactPerson.firstName[0]}
              {user?.lastName?.[0] || customer.contactPerson.lastName[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {customer.contactPerson.firstName} {customer.contactPerson.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{customer.businessName}</p>
              <p className="text-sm text-muted-foreground">
                {customer.contactPerson.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('businessInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('businessName')}</p>
            <p className="text-base">{customer.businessName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('abn')}</p>
            <p className="text-base">{customer.abn}</p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('contactInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('contactPerson')}</p>
              <p className="text-base">
                {customer.contactPerson.firstName} {customer.contactPerson.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('email')}</p>
              <p className="text-base">{customer.contactPerson.email}</p>
            </div>
          </div>
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder={t('phone')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">{t('edit.mobile')}</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  placeholder={t('edit.mobile')}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{t('phone')}</p>
                  <p className="text-base">{customer.contactPerson.phone}</p>
                </div>
              </div>
              {customer.contactPerson.mobile && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{t('edit.mobile')}</p>
                    <p className="text-base">{customer.contactPerson.mobile}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('deliveryAddress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="street">{t('street')}</Label>
                <Input
                  id="street"
                  value={editForm.street}
                  onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                  placeholder={t('street')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="suburb">{t('suburb')}</Label>
                  <Input
                    id="suburb"
                    value={editForm.suburb}
                    onChange={(e) => setEditForm({ ...editForm, suburb: e.target.value })}
                    placeholder={t('suburb')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">{t('state')}</Label>
                  <Input
                    id="state"
                    value={editForm.state}
                    disabled
                    placeholder={t('state')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">{t('postcode')}</Label>
                <Input
                  id="postcode"
                  value={editForm.postcode}
                  disabled
                  placeholder={t('postcode')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">{t('edit.deliveryInstructions')}</Label>
                <Input
                  id="deliveryInstructions"
                  value={editForm.deliveryInstructions}
                  onChange={(e) => setEditForm({ ...editForm, deliveryInstructions: e.target.value })}
                  placeholder={t('edit.deliveryInstructions')}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-base">
                {customer.deliveryAddress.street}
                <br />
                {customer.deliveryAddress.suburb} {customer.deliveryAddress.state}{' '}
                {customer.deliveryAddress.postcode}
              </p>
              {customer.deliveryAddress.deliveryInstructions && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('edit.deliveryInstructions')}: {customer.deliveryAddress.deliveryInstructions}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('creditInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('creditStatus')}</p>
            <p className="text-base">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                  customer.creditApplication.status === 'approved'
                    ? 'bg-green-500 text-white'
                    : customer.creditApplication.status === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {customer.creditApplication.status === 'approved' && `✓ ${t('approved')}`}
                {customer.creditApplication.status === 'pending' && `⏳ ${t('pending')}`}
                {customer.creditApplication.status === 'rejected' && `✗ ${t('rejected')}`}
              </span>
            </p>
          </div>
          {customer.creditApplication.status === 'approved' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('creditLimit')}</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(customer.creditApplication.creditLimit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('availableCredit')}</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(availableCredit)}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t('used')}</span>
                  <span className="font-medium">
                    {formatCurrency(usedCredit)} /{' '}
                    {formatCurrency(customer.creditApplication.creditLimit)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(usedCredit / customer.creditApplication.creditLimit) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Settings & Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-2">
          <button className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <span>{t('darkMode')}</span>
            </div>
            <div className="text-sm text-muted-foreground">{t('comingSoon')}</div>
          </button>
        </CardContent>
      </Card>

      {/* Edit/Save/Cancel Buttons */}
      {isEditing ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            size="lg"
            onClick={handleCancel}
            disabled={updateProfile.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            {tCommon('cancel')}
          </Button>
          <Button
            className="flex-1"
            size="lg"
            onClick={handleSave}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('edit.saving')}
              </>
            ) : (
              <>
                {tCommon('save')}
              </>
            )}
          </Button>
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4 mr-2" />
          {t('edit.editProfile')}
        </Button>
      )}

      {/* Sign Out */}
      <SignOutButton signOutOptions={{ redirectUrl: `/${locale}/sign-in` }}>
        <Button variant="outline" className="w-full" size="lg">
          <LogOut className="h-4 w-4 mr-2" />
          {tCommon('signOut')}
        </Button>
      </SignOutButton>
    </div>
  );
}
