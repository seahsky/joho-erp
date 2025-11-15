'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@jimmy-beef/ui';
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
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import type { User as ClerkUser } from '@clerk/nextjs/server';
import { api } from '@/trpc/client';

export function ProfileContent({ user }: { user: ClerkUser | null }) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const { data: customer, isLoading, error } = api.customer.getProfile.useQuery();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive mb-2">Error loading profile</p>
        <p className="text-sm text-muted-foreground">{error?.message || 'Profile not found'}</p>
      </div>
    );
  }

  const availableCredit = customer.creditApplication.creditLimit - (customer.creditApplication.usedCredit || 0);

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
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('phone')}</p>
              <p className="text-base">{customer.contactPerson.phone}</p>
            </div>
          </div>
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
          <p className="text-base">
            {customer.deliveryAddress.street}
            <br />
            {customer.deliveryAddress.suburb} {customer.deliveryAddress.state}{' '}
            {customer.deliveryAddress.postcode}
          </p>
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
                {customer.creditApplication.status === 'approved' && '✓ Approved'}
                {customer.creditApplication.status === 'pending' && '⏳ Pending'}
                {customer.creditApplication.status === 'rejected' && '✗ Rejected'}
              </span>
            </p>
          </div>
          {customer.creditApplication.status === 'approved' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('creditLimit')}</p>
                  <p className="text-xl font-bold">
                    ${customer.creditApplication.creditLimit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('availableCredit')}</p>
                  <p className="text-xl font-bold text-green-600">
                    ${availableCredit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    ${(customer.creditApplication.usedCredit || 0).toLocaleString()} /{' '}
                    ${customer.creditApplication.creditLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${((customer.creditApplication.usedCredit || 0) / customer.creditApplication.creditLimit) * 100}%`,
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
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-2">
          <button className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <span>Dark Mode</span>
            </div>
            <div className="text-sm text-muted-foreground">Coming soon</div>
          </button>
        </CardContent>
      </Card>

      {/* Update Profile Button */}
      <Button className="w-full" size="lg">
        {t('updateProfile')}
      </Button>

      {/* Sign Out */}
      <SignOutButton>
        <Button variant="outline" className="w-full" size="lg">
          <LogOut className="h-4 w-4 mr-2" />
          {tCommon('signOut')}
        </Button>
      </SignOutButton>
    </div>
  );
}
