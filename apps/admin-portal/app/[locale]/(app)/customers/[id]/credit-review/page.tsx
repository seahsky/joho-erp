'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { Button, Card, Badge, Input, Label } from '@joho-erp/ui';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatDate, parseToCents } from '@joho-erp/shared';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function CreditReviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const t = useTranslations('creditReview');
  const router = useRouter();
  const [approveData, setApproveData] = useState({
    creditLimit: 0,
    paymentTerms: '',
    notes: '',
  });
  const [rejectNotes, setRejectNotes] = useState('');

  // Fetch customer data
  const {
    data: customer,
    isLoading,
    error,
  } = api.customer.getById.useQuery({ customerId: resolvedParams.id });

  // Approve mutation
  const approveMutation = api.customer.approveCredit.useMutation({
    onSuccess: () => {
      alert(t('messages.approveSuccess'));
      router.push(`/${resolvedParams.locale}/customers`);
    },
    onError: (error: { message?: string }) => {
      alert(error.message || t('messages.approveError'));
    },
  });

  // Reject mutation
  const rejectMutation = api.customer.rejectCredit.useMutation({
    onSuccess: () => {
      alert(t('messages.rejectSuccess'));
      router.push(`/${resolvedParams.locale}/customers`);
    },
    onError: (error: { message?: string }) => {
      alert(error.message || t('messages.rejectError'));
    },
  });

  const handleApprove = () => {
    if (!approveData.creditLimit || approveData.creditLimit <= 0) {
      alert(t('messages.creditLimitRequired'));
      return;
    }

    approveMutation.mutate({
      customerId: resolvedParams.id,
      creditLimit: approveData.creditLimit,
      paymentTerms: approveData.paymentTerms,
      notes: approveData.notes,
    });
  };

  const handleReject = () => {
    if (!rejectNotes.trim()) {
      alert(t('messages.notesRequired'));
      return;
    }

    rejectMutation.mutate({
      customerId: resolvedParams.id,
      notes: rejectNotes,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-red-600">{t('error')}</p>
      </div>
    );
  }

  const creditApp = customer.creditApplication;
  const accountTypeLabels: Record<string, string> = {
    sole_trader: t('accountTypes.soleTrader'),
    partnership: t('accountTypes.partnership'),
    company: t('accountTypes.company'),
    other: t('accountTypes.other'),
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/${resolvedParams.locale}/customers`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToCustomers')}
          </Button>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600">
            {customer.businessName}
          </p>
        </div>
        <div>
          <Badge
            variant={
              creditApp.status === 'approved'
                ? 'success'
                : creditApp.status === 'rejected'
                ? 'destructive'
                : 'default'
            }
          >
            {creditApp.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-600">{t('stats.requestedLimit')}</p>
          <p className="text-2xl font-bold">
            {creditApp.requestedCreditLimit
              ? formatCurrency(creditApp.requestedCreditLimit)
              : 'N/A'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">{t('stats.forecastPurchase')}</p>
          <p className="text-2xl font-bold">
            {creditApp.forecastPurchase ? formatCurrency(creditApp.forecastPurchase) : 'N/A'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">{t('stats.appliedDate')}</p>
          <p className="text-2xl font-bold">{formatDate(creditApp.appliedAt)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Application Details */}
        <div className="space-y-6">
          {/* Business Information */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">{t('businessInformation')}</h2>
            <dl className="space-y-2 text-sm">
              {customer.accountType && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.accountType')}:</dt>
                  <dd>{accountTypeLabels[customer.accountType] || customer.accountType}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="font-medium text-gray-600">{t('fields.businessName')}:</dt>
                <dd>{customer.businessName}</dd>
              </div>
              {customer.tradingName && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.tradingName')}:</dt>
                  <dd>{customer.tradingName}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="font-medium text-gray-600">{t('fields.abn')}:</dt>
                <dd>{customer.abn}</dd>
              </div>
              {customer.acn && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.acn')}:</dt>
                  <dd>{customer.acn}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Contact Information */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">{t('contactInformation')}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-600">{t('fields.name')}:</dt>
                <dd>
                  {customer.contactPerson.firstName} {customer.contactPerson.lastName}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-600">{t('fields.email')}:</dt>
                <dd>{customer.contactPerson.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-600">{t('fields.phone')}:</dt>
                <dd>{customer.contactPerson.phone}</dd>
              </div>
              {customer.contactPerson.mobile && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.mobile')}:</dt>
                  <dd>{customer.contactPerson.mobile}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Address Information */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">{t('addressInformation')}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium">{t('fields.deliveryAddress')}:</h3>
                <p className="text-sm text-gray-700">
                  {customer.deliveryAddress.street}, {customer.deliveryAddress.suburb},{' '}
                  {customer.deliveryAddress.state} {customer.deliveryAddress.postcode}
                </p>
                <p className="text-xs text-gray-500">
                  Area: {customer.deliveryAddress.areaTag}
                </p>
              </div>
              {customer.billingAddress && (
                <div>
                  <h3 className="mb-2 font-medium">{t('fields.billingAddress')}:</h3>
                  <p className="text-sm text-gray-700">
                    {customer.billingAddress.street}, {customer.billingAddress.suburb},{' '}
                    {customer.billingAddress.state} {customer.billingAddress.postcode}
                  </p>
                </div>
              )}
              {customer.postalAddress && (
                <div>
                  <h3 className="mb-2 font-medium">{t('fields.postalAddress')}:</h3>
                  <p className="text-sm text-gray-700">
                    {customer.postalAddress.street}, {customer.postalAddress.suburb},{' '}
                    {customer.postalAddress.state} {customer.postalAddress.postcode}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Directors */}
          {customer.directors && customer.directors.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">{t('directors')}</h2>
              <div className="space-y-4">
                {customer.directors.map((director, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <h3 className="mb-2 font-medium">
                      {director.givenNames} {director.familyName}
                    </h3>
                    <dl className="space-y-1 text-sm">
                      {director.position && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">{t('fields.position')}:</dt>
                          <dd>{director.position}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-600">{t('fields.dateOfBirth')}:</dt>
                        <dd>{formatDate(director.dateOfBirth)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">{t('fields.driverLicense')}:</dt>
                        <dd>
                          {director.driverLicenseNumber} ({director.licenseState})
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">{t('fields.licenseExpiry')}:</dt>
                        <dd>{formatDate(director.licenseExpiry)}</dd>
                      </div>
                      <div className="mt-2">
                        <dt className="text-gray-600">{t('fields.residentialAddress')}:</dt>
                        <dd className="text-xs text-gray-700">
                          {director.residentialAddress.street},{' '}
                          {director.residentialAddress.suburb},{' '}
                          {director.residentialAddress.state}{' '}
                          {director.residentialAddress.postcode}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Financial Details */}
          {customer.financialDetails && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">{t('financialDetails')}</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.bankName')}:</dt>
                  <dd>{customer.financialDetails.bankName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.accountName')}:</dt>
                  <dd>{customer.financialDetails.accountName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.bsb')}:</dt>
                  <dd>{customer.financialDetails.bsb}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.accountNumber')}:</dt>
                  <dd>****{customer.financialDetails.accountNumber.slice(-4)}</dd>
                </div>
              </dl>
            </Card>
          )}

          {/* Trade References */}
          {customer.tradeReferences && customer.tradeReferences.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">{t('tradeReferences')}</h2>
              <div className="space-y-3">
                {customer.tradeReferences.map((ref, index) => (
                  <div key={index} className="rounded border p-3">
                    <h3 className="font-medium">{ref.companyName}</h3>
                    <p className="text-sm text-gray-700">
                      {ref.contactPerson} - {ref.email}
                    </p>
                    <p className="text-sm text-gray-600">{ref.phone}</p>
                    <Badge variant={ref.verified ? 'success' : 'secondary'} className="mt-2">
                      {ref.verified ? t('fields.verified') : t('fields.notVerified')}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Decision Panel */}
        <div className="space-y-6">
          {creditApp.status === 'pending' && (
            <>
              {/* Approve Section */}
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold text-green-700">
                  {t('approveApplication')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="approvedCreditLimit">{t('fields.approvedCreditLimit')}</Label>
                    <Input
                      id="approvedCreditLimit"
                      type="number"
                      min="0"
                      step="100"
                      value={approveData.creditLimit ? (approveData.creditLimit / 100).toFixed(0) : '0'}
                      onChange={(e) =>
                        setApproveData({ ...approveData, creditLimit: parseToCents(e.target.value) || 0 })
                      }
                      placeholder="10000"
                    />
                    <p className="text-xs text-muted-foreground">{t('enterDollars')}</p>
                  </div>
                  <div>
                    <Label htmlFor="paymentTerms">{t('fields.paymentTerms')}</Label>
                    <Input
                      id="paymentTerms"
                      value={approveData.paymentTerms}
                      onChange={(e) =>
                        setApproveData({ ...approveData, paymentTerms: e.target.value })
                      }
                      placeholder="Net 30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="approveNotes">{t('fields.notes')}</Label>
                    <textarea
                      id="approveNotes"
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={approveData.notes}
                      onChange={(e) => setApproveData({ ...approveData, notes: e.target.value })}
                      placeholder="Optional notes..."
                    />
                  </div>
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {approveMutation.isPending ? t('buttons.approving') : t('buttons.approve')}
                  </Button>
                </div>
              </Card>

              {/* Reject Section */}
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold text-red-700">
                  {t('rejectApplication')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rejectNotes">{t('fields.rejectionReason')}</Label>
                    <textarea
                      id="rejectNotes"
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Required: Please provide reason for rejection..."
                    />
                  </div>
                  <Button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="w-full"
                  >
                    {rejectMutation.isPending ? t('buttons.rejecting') : t('buttons.reject')}
                  </Button>
                </div>
              </Card>
            </>
          )}

          {creditApp.status !== 'pending' && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">{t('applicationStatus')}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-600">{t('fields.status')}:</dt>
                  <dd>
                    <Badge
                      variant={creditApp.status === 'approved' ? 'success' : 'destructive'}
                    >
                      {creditApp.status.toUpperCase()}
                    </Badge>
                  </dd>
                </div>
                {creditApp.status === 'approved' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-600">{t('fields.creditLimit')}:</dt>
                      <dd>{formatCurrency(creditApp.creditLimit)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-600">{t('fields.paymentTerms')}:</dt>
                      <dd>{creditApp.paymentTerms || 'N/A'}</dd>
                    </div>
                  </>
                )}
                {creditApp.reviewedAt && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-600">{t('fields.reviewedAt')}:</dt>
                    <dd>{formatDate(creditApp.reviewedAt)}</dd>
                  </div>
                )}
                {creditApp.notes && (
                  <div className="mt-3">
                    <dt className="mb-1 font-medium text-gray-600">{t('fields.notes')}:</dt>
                    <dd className="rounded bg-gray-50 p-2 text-gray-700">{creditApp.notes}</dd>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
