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
  Moon,
  Sun,
  Globe,
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import type { User as ClerkUser } from '@clerk/nextjs/server';

// Mock customer data (in real app, fetch from tRPC)
const mockCustomer = {
  businessName: 'ABC Restaurants Pty Ltd',
  abn: '12 345 678 901',
  contactPerson: 'John Doe',
  email: 'john@abcrestaurants.com.au',
  phone: '0412 345 678',
  deliveryAddress: {
    street: '123 Business Street',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
  },
  credit: {
    status: 'approved' as const,
    limit: 5000,
    used: 1580,
  },
};

export function ProfileContent({ user }: { user: ClerkUser | null }) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const availableCredit = mockCustomer.credit.limit - mockCustomer.credit.used;

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {user?.firstName?.[0] || 'J'}
              {user?.lastName?.[0] || 'D'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{mockCustomer.businessName}</p>
              <p className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
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
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('businessName')}</p>
            <p className="text-base">{mockCustomer.businessName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('abn')}</p>
            <p className="text-base">{mockCustomer.abn}</p>
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
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('contactPerson')}</p>
              <p className="text-base">{mockCustomer.contactPerson}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('email')}</p>
              <p className="text-base">{mockCustomer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('phone')}</p>
              <p className="text-base">{mockCustomer.phone}</p>
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
        <CardContent>
          <p className="text-base">
            {mockCustomer.deliveryAddress.street}
            <br />
            {mockCustomer.deliveryAddress.suburb} {mockCustomer.deliveryAddress.state}{' '}
            {mockCustomer.deliveryAddress.postcode}
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
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('creditStatus')}</p>
            <p className="text-base">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500 text-white text-sm">
                ✓ Approved
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('creditLimit')}</p>
              <p className="text-xl font-bold">${mockCustomer.credit.limit.toLocaleString()}</p>
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
                ${mockCustomer.credit.used.toLocaleString()} /{' '}
                ${mockCustomer.credit.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{
                  width: `${(mockCustomer.credit.used / mockCustomer.credit.limit) * 100}%`,
                }}
              />
            </div>
          </div>
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
        <CardContent className="space-y-2">
          <button className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <span>Dark Mode</span>
            </div>
            <div className="text-sm text-muted-foreground">Coming soon</div>
          </button>
          <button className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span>Language</span>
            </div>
            <div className="text-sm text-muted-foreground">English</div>
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
