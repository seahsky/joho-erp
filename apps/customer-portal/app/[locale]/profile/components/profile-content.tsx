'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@joho-erp/ui';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Settings,
  LogOut,
  Loader2,
  FileText,
  Download,
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import { api } from '@/trpc/client';

type UserDisplayData = { firstName: string | null; lastName: string | null } | null;

export function ProfileContent({ user }: { user: UserDisplayData }) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = params.locale as string;

  const { data: customer, isLoading, error } = api.customer.getProfile.useQuery();

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

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-primary/5 via-background to-background">
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
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
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
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
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
          {customer.contactPerson.mobile && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{t('mobile')}</p>
                <p className="text-base">{customer.contactPerson.mobile}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('deliveryAddress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div>
            <p className="text-base">
              {customer.deliveryAddress.street}
              <br />
              {customer.deliveryAddress.suburb} {customer.deliveryAddress.state}{' '}
              {customer.deliveryAddress.postcode}
            </p>
            {customer.deliveryAddress.deliveryInstructions && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('deliveryInstructions')}: {customer.deliveryAddress.deliveryInstructions}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Application - Only show if approved and PDF exists */}
      {customer.creditApplication?.status === 'approved' && customer.creditApplicationPdfUrl && (
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('creditApplication.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(customer.creditApplicationPdfUrl!, '_blank')}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('creditApplication.download')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settings & Actions */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
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
