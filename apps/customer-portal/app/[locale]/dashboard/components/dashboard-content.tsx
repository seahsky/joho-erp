'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, type StatusType } from '@joho-erp/ui';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingCart,
  Package,
  CreditCard,
  ArrowRight,
  Loader2,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import Link from 'next/link';

type UserDisplayData = { firstName: string | null; lastName: string | null } | null;

export function DashboardContent({ user }: { user: UserDisplayData }) {
  const t = useTranslations('dashboard');
  const params = useParams();
  const locale = params.locale as string;

  const { data: status, isLoading, error } = api.customer.getOnboardingStatus.useQuery();
  const { data: recentOrders, isLoading: ordersLoading } = api.order.getMyOrders.useQuery(
    { limit: 3 },
    { enabled: status?.onboardingComplete && status?.creditStatus === 'approved' }
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive mb-2">{t('errorLoading')}</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  // If no customer record, redirect to onboarding
  if (!status?.hasCustomerRecord) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <ClipboardList className="h-8 w-8 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">
                  {t('onboarding.incompleteTitle')}
                </h3>
                <p className="text-amber-700 mb-4">{t('onboarding.incompleteMessage')}</p>
                <Link href={`/${locale}/onboarding`}>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    {t('onboarding.completeButton')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Customer exists - show dashboard
  const isOnboardingComplete = status.onboardingComplete;
  const creditStatus = status.creditStatus;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background shadow-md hover:shadow-lg transition-all duration-200">
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 bg-noise opacity-[0.015] pointer-events-none" aria-hidden="true" />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-md">
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t('welcome')}, {user?.firstName || status.businessName}!
              </h2>
              <p className="text-muted-foreground">{status.businessName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Onboarding Status */}
        <Card className={`shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${isOnboardingComplete ? 'border-green-200' : 'border-amber-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t('onboarding.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {isOnboardingComplete ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{t('onboarding.complete')}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">{t('onboarding.incomplete')}</span>
                </div>
                <Link href={`/${locale}/onboarding`}>
                  <Button size="sm" variant="outline" className="w-full">
                    {t('onboarding.completeButton')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Application Status */}
        <Card
          className={`shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${
            creditStatus === 'approved'
              ? 'border-green-200'
              : creditStatus === 'pending'
              ? 'border-amber-200'
              : 'border-red-200'
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('credit.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {creditStatus === 'approved' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{t('credit.approved')}</span>
              </div>
            )}
            {creditStatus === 'pending' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">{t('credit.pending')}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t('credit.pendingMessage')}</p>
              </div>
            )}
            {creditStatus === 'rejected' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{t('credit.rejected')}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t('credit.rejectedMessage')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg">{t('quickActions.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href={`/${locale}/products`}>
            <Button variant="outline" className="w-full justify-start h-auto py-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 border-2 hover:border-primary/50">
              <ShoppingCart className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">{t('quickActions.browseProducts')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('quickActions.browseProductsDesc')}
                </div>
              </div>
            </Button>
          </Link>
          <Link href={`/${locale}/orders`}>
            <Button variant="outline" className="w-full justify-start h-auto py-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 border-2 hover:border-primary/50">
              <Package className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">{t('quickActions.viewOrders')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('quickActions.viewOrdersDesc')}
                </div>
              </div>
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Checkout Restrictions Banner */}
      {(!isOnboardingComplete || creditStatus !== 'approved') && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">{t('restrictions.title')}</p>
                <p className="text-sm text-amber-700 mt-1">
                  {!isOnboardingComplete
                    ? t('restrictions.onboardingRequired')
                    : creditStatus === 'pending'
                    ? t('restrictions.creditPending')
                    : t('restrictions.creditRejected')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders (only show if onboarding complete and credit approved) */}
      {isOnboardingComplete && creditStatus === 'approved' && (
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('recentOrders.title')}</CardTitle>
            <Link href={`/${locale}/orders`}>
              <Button variant="ghost" size="sm">
                {t('recentOrders.viewAll')}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentOrders?.orders && recentOrders.orders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border rounded-lg shadow-sm hover:shadow-md hover:bg-accent/30 transition-all duration-200"
                  >
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.orderedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatAUD(order.totalAmount)}</p>
                      <StatusBadge status={order.status as StatusType} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('recentOrders.noOrders')}</p>
                <Link href={`/${locale}/products`}>
                  <Button variant="link" className="mt-2">
                    {t('recentOrders.startShopping')}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
