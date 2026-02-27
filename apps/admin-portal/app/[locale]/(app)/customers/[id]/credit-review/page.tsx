'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
  useToast,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@joho-erp/ui';
import { ArrowLeft, Loader2, IdCard, FileText, Download, CheckCircle, PenLine, RefreshCw, ImageOff } from 'lucide-react';
import { XeroCustomerSyncBadge } from '@/components/xero-sync-badge';
import { formatAUD, formatDate, parseToCents, formatCentsForWholeInput } from '@joho-erp/shared';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

const PAYMENT_TERMS_OPTIONS = [
  { value: 'COD', label: 'COD (Cash on Delivery)' },
  { value: 'Net 7', label: 'Net 7 Days' },
  { value: 'Net 14', label: 'Net 14 Days' },
  { value: 'Net 30', label: 'Net 30 Days' },
  { value: 'custom', label: 'Custom Terms' },
];

export default function CreditReviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const t = useTranslations('creditReview');
  const router = useRouter();
  const { toast } = useToast();

  const [approveData, setApproveData] = useState({
    creditLimit: 0,
    paymentTerms: '',
    customPaymentTerms: '',
    notes: '',
  });
  const [rejectNotes, setRejectNotes] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);

  // Fetch customer data
  const {
    data: customer,
    isLoading,
    error,
  } = api.customer.getById.useQuery({ customerId: resolvedParams.id });

  // Approve mutation
  const approveMutation = api.customer.approveCredit.useMutation({
    onSuccess: () => {
      toast({
        title: t('messages.approveSuccess'),
        description: t('messages.approveSuccessDescription'),
      });
      router.push(`/${resolvedParams.locale}/customers`);
    },
    onError: (error: { message?: string }) => {
      toast({
        title: t('messages.approveError'),
        description: error.message || t('messages.approveErrorDescription'),
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = api.customer.rejectCredit.useMutation({
    onSuccess: () => {
      toast({
        title: t('messages.rejectSuccess'),
        description: t('messages.rejectSuccessDescription'),
      });
      router.push(`/${resolvedParams.locale}/customers`);
    },
    onError: (error: { message?: string }) => {
      toast({
        title: t('messages.rejectError'),
        description: error.message || t('messages.rejectErrorDescription'),
        variant: 'destructive',
      });
    },
  });

  // Regenerate PDF mutation
  const utils = api.useUtils();
  const regeneratePdfMutation = api.customer.regenerateCreditApplicationPdf.useMutation({
    onSuccess: () => {
      toast({
        title: t('messages.generatePdfSuccess'),
        description: t('messages.generatePdfSuccessDescription'),
      });
      utils.customer.getById.invalidate({ customerId: resolvedParams.id });
    },
    onError: (error: { message?: string }) => {
      toast({
        title: t('messages.generatePdfError'),
        description: error.message || t('messages.generatePdfErrorDescription'),
        variant: 'destructive',
      });
    },
  });

  const handleApproveClick = () => {
    if (!approveData.creditLimit || approveData.creditLimit <= 0) {
      toast({
        title: t('validation.creditLimitRequired'),
        description: t('validation.creditLimitRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    const effectivePaymentTerms =
      approveData.paymentTerms === 'custom'
        ? approveData.customPaymentTerms
        : approveData.paymentTerms;

    if (!effectivePaymentTerms) {
      toast({
        title: t('validation.paymentTermsRequired'),
        description: t('validation.paymentTermsRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setShowApproveConfirm(true);
  };

  const handleApproveConfirm = () => {
    const effectivePaymentTerms =
      approveData.paymentTerms === 'custom'
        ? approveData.customPaymentTerms
        : approveData.paymentTerms;

    approveMutation.mutate({
      customerId: resolvedParams.id,
      creditLimit: approveData.creditLimit,
      paymentTerms: effectivePaymentTerms,
      notes: approveData.notes,
    });
    setShowApproveConfirm(false);
  };

  const handleRejectClick = () => {
    if (!rejectNotes.trim()) {
      toast({
        title: t('validation.notesRequired'),
        description: t('validation.notesRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (rejectNotes.trim().length < 10) {
      toast({
        title: t('validation.notesMinLength'),
        description: t('validation.notesMinLengthDescription'),
        variant: 'destructive',
      });
      return;
    }

    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = () => {
    rejectMutation.mutate({
      customerId: resolvedParams.id,
      notes: rejectNotes,
    });
    setShowRejectConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-destructive">{t('error')}</p>
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
          <p className="text-muted-foreground">{customer.businessName}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge
            variant={
              creditApp.status === 'approved'
                ? 'success'
                : creditApp.status === 'rejected'
                  ? 'destructive'
                  : 'default'
            }
          >
            {t(`creditStatus.${creditApp.status}`)}
          </Badge>
          <XeroCustomerSyncBadge customerId={resolvedParams.id} creditStatus={creditApp.status} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('stats.requestedLimit')}</p>
          <p className="text-2xl font-bold">
            {creditApp.requestedCreditLimit
              ? formatAUD(creditApp.requestedCreditLimit)
              : 'N/A'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('stats.forecastPurchase')}</p>
          <p className="text-2xl font-bold">
            {creditApp.forecastPurchase ? formatAUD(creditApp.forecastPurchase) : 'N/A'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('stats.appliedDate')}</p>
          <p className="text-2xl font-bold">{formatDate(creditApp.appliedAt)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Application Details */}
        <div className="space-y-6">
          {/* Credit Application PDF */}
          <Card className="p-6 border-primary/50">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('creditApplicationPdf.title')}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t('creditApplicationPdf.description')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {customer.creditApplicationPdfUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(customer.creditApplicationPdfUrl!, '_blank')}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('creditApplicationPdf.viewButton')}
                </Button>
              )}
              <Button
                variant={customer.creditApplicationPdfUrl ? 'secondary' : 'default'}
                onClick={() => regeneratePdfMutation.mutate({ customerId: resolvedParams.id })}
                disabled={regeneratePdfMutation.isPending}
                className="flex-1"
              >
                {regeneratePdfMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('creditApplicationPdf.generating')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {customer.creditApplicationPdfUrl
                      ? t('creditApplicationPdf.regenerateButton')
                      : t('creditApplicationPdf.generateButton')}
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Terms Agreement */}
          {creditApp.agreedToTermsAt && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                {t('termsAgreement.title')}
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('termsAgreement.agreedAt')}:</dt>
                  <dd>{formatDate(creditApp.agreedToTermsAt)}</dd>
                </div>
              </dl>
            </Card>
          )}

          {/* Business Information */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">{t('businessInformation')}</h2>
            <dl className="space-y-2 text-sm">
              {customer.accountType && (
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('fields.accountType')}:</dt>
                  <dd>{accountTypeLabels[customer.accountType] || customer.accountType}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">{t('fields.businessName')}:</dt>
                <dd>{customer.businessName}</dd>
              </div>
              {customer.tradingName && (
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('fields.tradingName')}:</dt>
                  <dd>{customer.tradingName}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">{t('fields.abn')}:</dt>
                <dd>{customer.abn}</dd>
              </div>
              {customer.acn && (
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('fields.acn')}:</dt>
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
                <dt className="font-medium text-muted-foreground">{t('fields.name')}:</dt>
                <dd>
                  {customer.contactPerson.firstName} {customer.contactPerson.lastName}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">{t('fields.email')}:</dt>
                <dd>{customer.contactPerson.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-muted-foreground">{t('fields.phone')}:</dt>
                <dd>{customer.contactPerson.phone}</dd>
              </div>
              {customer.contactPerson.mobile && (
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('fields.mobile')}:</dt>
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
                <p className="text-sm">
                  {customer.deliveryAddress.street}, {customer.deliveryAddress.suburb},{' '}
                  {customer.deliveryAddress.state} {customer.deliveryAddress.postcode}
                </p>
                <p className="text-xs text-muted-foreground">
                  Area: {customer.deliveryAddress.areaName}
                </p>
              </div>
              {customer.billingAddress && (
                <div>
                  <h3 className="mb-2 font-medium">{t('fields.billingAddress')}:</h3>
                  <p className="text-sm">
                    {customer.billingAddress.street}, {customer.billingAddress.suburb},{' '}
                    {customer.billingAddress.state} {customer.billingAddress.postcode}
                  </p>
                </div>
              )}
              {customer.postalAddress && (
                <div>
                  <h3 className="mb-2 font-medium">{t('fields.postalAddress')}:</h3>
                  <p className="text-sm">
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
                          <dt className="text-muted-foreground">{t('fields.position')}:</dt>
                          <dd>{director.position}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('fields.dateOfBirth')}:</dt>
                        <dd>{formatDate(director.dateOfBirth)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('fields.driverLicense')}:</dt>
                        <dd>
                          {director.driverLicenseNumber} ({director.licenseState})
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('fields.licenseExpiry')}:</dt>
                        <dd>{formatDate(director.licenseExpiry)}</dd>
                      </div>
                      <div className="mt-2">
                        <dt className="text-muted-foreground">{t('fields.residentialAddress')}:</dt>
                        <dd className="text-xs">
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

          {/* Identity Documents - Important for verification */}
          {customer.directors && customer.directors.length > 0 && (
            <Card className="p-6 border-primary/50">
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                {t('identityDocuments.title')}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{t('identityDocuments.verifyHint')}</p>
              <div className="space-y-4">
                {customer.directors.some((d: { idDocumentFrontUrl: string | null }) => d.idDocumentFrontUrl) ? (
                  customer.directors.map((director: {
                    givenNames: string;
                    familyName: string;
                    idDocumentFrontUrl: string | null;
                    idDocumentBackUrl: string | null;
                    idDocumentType: string | null;
                    idDocumentUploadedAt: Date | null;
                  }, index: number) => {
                    if (!director.idDocumentFrontUrl) return null;

                    return (
                      <div key={index} className="rounded-lg border p-4">
                        <div className="mb-3">
                          <p className="font-medium">{director.givenNames} {director.familyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {director.idDocumentType === 'DRIVER_LICENSE'
                              ? t('identityDocuments.driverLicense')
                              : t('identityDocuments.passport')}
                          </p>
                          {director.idDocumentUploadedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('identityDocuments.uploadedAt', { date: formatDate(director.idDocumentUploadedAt) })}
                            </p>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {director.idDocumentFrontUrl && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {director.idDocumentType === 'DRIVER_LICENSE'
                                  ? t('identityDocuments.front')
                                  : t('identityDocuments.photoPage')}
                              </p>
                              {director.idDocumentFrontUrl.toLowerCase().endsWith('.pdf') ? (
                                <a
                                  href={director.idDocumentFrontUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-primary hover:underline"
                                >
                                  <FileText className="h-4 w-4" />
                                  {t('identityDocuments.viewPdf')}
                                </a>
                              ) : (
                                <a
                                  href={director.idDocumentFrontUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={director.idDocumentFrontUrl}
                                    alt={t('identityDocuments.front')}
                                    className="w-full max-w-[200px] rounded border hover:opacity-80 transition-opacity"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden flex items-center gap-2 text-muted-foreground text-sm p-4 border rounded bg-muted/50">
                                    <ImageOff className="h-4 w-4" />
                                    {t('identityDocuments.imageUnavailable')}
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                          {director.idDocumentType === 'DRIVER_LICENSE' && director.idDocumentBackUrl && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">{t('identityDocuments.back')}</p>
                              {director.idDocumentBackUrl.toLowerCase().endsWith('.pdf') ? (
                                <a
                                  href={director.idDocumentBackUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-primary hover:underline"
                                >
                                  <FileText className="h-4 w-4" />
                                  {t('identityDocuments.viewPdf')}
                                </a>
                              ) : (
                                <a
                                  href={director.idDocumentBackUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={director.idDocumentBackUrl}
                                    alt={t('identityDocuments.back')}
                                    className="w-full max-w-[200px] rounded border hover:opacity-80 transition-opacity"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden flex items-center gap-2 text-muted-foreground text-sm p-4 border rounded bg-muted/50">
                                    <ImageOff className="h-4 w-4" />
                                    {t('identityDocuments.imageUnavailable')}
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">{t('identityDocuments.noDocumentsUploaded')}</p>
                )}
              </div>
            </Card>
          )}

          {/* Digital Signatures */}
          {creditApp.signatures && creditApp.signatures.length > 0 && (
            <Card className="p-6 border-primary/50">
              <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                {t('signatures.title')}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t('signatures.description')}
              </p>
              <div className="space-y-4">
                {creditApp.signatures.map((sig: {
                  signerName: string;
                  signerPosition: string | null;
                  signatureUrl: string;
                  signedAt: Date;
                  signatureType: string;
                  witnessName: string | null;
                  witnessSignatureUrl: string | null;
                  witnessSignedAt: Date | null;
                }, index: number) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{sig.signerName}</p>
                        {sig.signerPosition && (
                          <p className="text-sm text-muted-foreground">{sig.signerPosition}</p>
                        )}
                      </div>
                      <Badge variant={sig.signatureType === 'APPLICANT' ? 'default' : 'secondary'}>
                        {sig.signatureType === 'APPLICANT'
                          ? t('signatures.types.applicant')
                          : t('signatures.types.guarantor')}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {/* Applicant/Guarantor Signature */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {t('signatures.signature')} - {t('signatures.signedAt')}: {formatDate(sig.signedAt)}
                        </p>
                        <button
                          onClick={() => setSelectedSignature(sig.signatureUrl)}
                          className="block"
                        >
                          <img
                            src={sig.signatureUrl}
                            alt={t('signatures.signatureOf', { name: sig.signerName })}
                            className="max-w-[200px] rounded border hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </button>
                      </div>

                      {/* Witness Info (for guarantor signatures) */}
                      {sig.signatureType === 'GUARANTOR' && sig.witnessName && sig.witnessSignatureUrl && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="font-medium text-sm mb-2">
                            {t('signatures.witness')}: {sig.witnessName}
                          </p>
                          {sig.witnessSignedAt && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {t('signatures.witnessSignedAt')}: {formatDate(sig.witnessSignedAt)}
                            </p>
                          )}
                          <button
                            onClick={() => setSelectedSignature(sig.witnessSignatureUrl!)}
                            className="block"
                          >
                            <img
                              src={sig.witnessSignatureUrl}
                              alt={t('signatures.witnessSignatureOf', { name: sig.witnessName })}
                              className="max-w-[200px] rounded border hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </button>
                        </div>
                      )}
                    </div>
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
                  <dt className="font-medium text-muted-foreground">{t('fields.bankName')}:</dt>
                  <dd>{customer.financialDetails.bankName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('fields.accountName')}:</dt>
                  <dd>{customer.financialDetails.accountName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('fields.bsb')}:</dt>
                  <dd>{customer.financialDetails.bsb}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium text-muted-foreground">{t('fields.accountNumber')}:</dt>
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
                    <p className="text-sm">
                      {ref.contactPerson} - {ref.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{ref.phone}</p>
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
              <Card className="p-6 border-success/50">
                <h2 className="mb-4 text-xl font-semibold text-success">
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
                      value={formatCentsForWholeInput(approveData.creditLimit) || '0'}
                      onChange={(e) =>
                        setApproveData({
                          ...approveData,
                          creditLimit: parseToCents(e.target.value) || 0,
                        })
                      }
                      placeholder="10000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t('enterDollars')}</p>
                  </div>
                  <div>
                    <Label htmlFor="paymentTerms">{t('fields.paymentTerms')}</Label>
                    <select
                      id="paymentTerms"
                      value={approveData.paymentTerms}
                      onChange={(e) =>
                        setApproveData({ ...approveData, paymentTerms: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">{t('fields.selectPaymentTerms')}</option>
                      {PAYMENT_TERMS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {approveData.paymentTerms === 'custom' && (
                    <div>
                      <Label htmlFor="customPaymentTerms">{t('fields.customPaymentTerms')}</Label>
                      <Input
                        id="customPaymentTerms"
                        value={approveData.customPaymentTerms}
                        onChange={(e) =>
                          setApproveData({ ...approveData, customPaymentTerms: e.target.value })
                        }
                        placeholder={t('fields.customPaymentTermsPlaceholder')}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="approveNotes">{t('fields.notes')}</Label>
                    <textarea
                      id="approveNotes"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={approveData.notes}
                      onChange={(e) => setApproveData({ ...approveData, notes: e.target.value })}
                      placeholder={t('fields.notesPlaceholder')}
                    />
                  </div>
                  <Button
                    onClick={handleApproveClick}
                    disabled={approveMutation.isPending}
                    className="w-full bg-success text-success-foreground hover:bg-success/90"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('buttons.approving')}
                      </>
                    ) : (
                      t('buttons.approve')
                    )}
                  </Button>
                </div>
              </Card>

              {/* Reject Section */}
              <Card className="p-6 border-destructive/50">
                <h2 className="mb-4 text-xl font-semibold text-destructive">
                  {t('rejectApplication')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rejectNotes">{t('fields.rejectionReason')}</Label>
                    <textarea
                      id="rejectNotes"
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder={t('fields.rejectionReasonPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('fields.rejectionReasonHint')}
                    </p>
                  </div>
                  <Button
                    onClick={handleRejectClick}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="w-full"
                  >
                    {rejectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('buttons.rejecting')}
                      </>
                    ) : (
                      t('buttons.reject')
                    )}
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
                  <dt className="font-medium text-muted-foreground">{t('fields.status')}:</dt>
                  <dd>
                    <Badge variant={creditApp.status === 'approved' ? 'success' : 'destructive'}>
                      {t(`creditStatus.${creditApp.status}`)}
                    </Badge>
                  </dd>
                </div>
                {creditApp.status === 'approved' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{t('fields.creditLimit')}:</dt>
                      <dd>{formatAUD(creditApp.creditLimit)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{t('fields.paymentTerms')}:</dt>
                      <dd>{creditApp.paymentTerms || 'N/A'}</dd>
                    </div>
                  </>
                )}
                {creditApp.reviewedAt && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-muted-foreground">{t('fields.reviewedAt')}:</dt>
                    <dd>{formatDate(creditApp.reviewedAt)}</dd>
                  </div>
                )}
                {creditApp.notes && (
                  <div className="mt-3">
                    <dt className="mb-1 font-medium text-muted-foreground">{t('fields.notes')}:</dt>
                    <dd className="rounded bg-muted p-2">{creditApp.notes}</dd>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDialog.approveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDialog.approveDescription', {
                businessName: customer.businessName,
                creditLimit: formatAUD(approveData.creditLimit),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>
              {t('buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('buttons.approving')}
                </>
              ) : (
                t('buttons.confirmApprove')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDialog.rejectTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDialog.rejectDescription', { businessName: customer.businessName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMutation.isPending}>
              {t('buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('buttons.rejecting')}
                </>
              ) : (
                t('buttons.confirmReject')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signature View Dialog */}
      <Dialog open={!!selectedSignature} onOpenChange={(open) => !open && setSelectedSignature(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('signatures.fullSizeSignature')}</DialogTitle>
          </DialogHeader>
          {selectedSignature && (
            <div className="flex justify-center p-4">
              <img
                src={selectedSignature}
                alt={t('signatures.signature')}
                className="max-w-full max-h-[60vh] object-contain border rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
