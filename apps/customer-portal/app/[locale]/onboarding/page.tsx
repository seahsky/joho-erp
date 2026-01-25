'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { FileText } from 'lucide-react';
import { useToast } from '@joho-erp/ui';
import { api } from '@/trpc/client';
import { Stepper, type Step } from '@/components/stepper';
import { BusinessInfoStep } from './components/business-info-step';
import { DirectorsStep } from './components/directors-step';
import { FinancialStep } from './components/financial-step';
import { TradeReferencesStep } from './components/trade-references-step';
import { ReviewStep } from './components/review-step';
import { TermsConditionsStep } from './components/terms-conditions-step';
import { GuaranteeIndemnityStep } from './components/guarantee-indemnity-step';
import { SignatureStep, type SignatureData } from './components/signature-step';

const STORAGE_KEY = 'onboarding-form-data';

type OnboardingStep = 'business' | 'directors' | 'financial' | 'references' | 'review' | 'terms-conditions' | 'guarantee-indemnity' | 'signatures';

// Step IDs defined outside component to avoid React hook dependency issues
const STEP_IDS: OnboardingStep[] = ['business', 'directors', 'financial', 'references', 'review', 'terms-conditions', 'guarantee-indemnity', 'signatures'];

export interface BusinessInfo {
  accountType: 'sole_trader' | 'partnership' | 'company' | 'other';
  businessName: string;
  tradingName?: string;
  abn: string;
  acn?: string;
  contactPerson: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile?: string;
  };
  deliveryAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    // areaTag removed - area is auto-assigned by backend based on suburb
    deliveryInstructions?: string;
    latitude?: number; // From geocoding
    longitude?: number; // From geocoding
  };
  billingAddress?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  postalAddress?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  requestedCreditLimit?: number;
  forecastPurchase?: number;
}

export interface DirectorInfo {
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
  // ID Document fields for credit verification
  idDocumentType?: 'DRIVER_LICENSE' | 'PASSPORT';
  idDocumentFrontUrl?: string;
  idDocumentBackUrl?: string;
  idDocumentUploadedAt?: string;
}

export interface FinancialInfo {
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
}

export interface TradeReferenceInfo {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
}

interface SignatureState {
  directorIndex: number;
  applicantSignature: string | null;  // Base64 data URL
  applicantSignedAt: Date | null;
  guarantorSignature: string | null;  // Base64 data URL
  guarantorSignedAt: Date | null;
  witnessName: string;
  witnessSignature: string | null;    // Base64 data URL
  witnessSignedAt: Date | null;
  // Store upload URLs separately
  applicantSignatureUrl?: string;
  guarantorSignatureUrl?: string;
  witnessSignatureUrl?: string;
}

interface SavedFormData {
  currentStep: OnboardingStep;
  businessInfo: Partial<BusinessInfo>;
  directors: DirectorInfo[];
  financialInfo: Partial<FinancialInfo>;
  tradeReferences: TradeReferenceInfo[];
  termsConditionsAgreed: boolean;
  guaranteeIndemnityAgreed: boolean;
  signatureData?: SignatureState[];  // Added for signature persistence
  // Legacy field for migration
  termsAgreement?: { hasAgreed: boolean };
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business');
  const [businessInfo, setBusinessInfo] = useState<Partial<BusinessInfo>>({});
  const [directors, setDirectors] = useState<DirectorInfo[]>([]);
  const [financialInfo, setFinancialInfo] = useState<Partial<FinancialInfo>>({});
  const [tradeReferences, setTradeReferences] = useState<TradeReferenceInfo[]>([]);
  const [termsConditionsAgreed, setTermsConditionsAgreed] = useState(false);
  const [guaranteeIndemnityAgreed, setGuaranteeIndemnityAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureState[]>([]);
  const [isRestored, setIsRestored] = useState(false);

  // Restore form data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedFormData = JSON.parse(saved);
        // Handle migration from old step format
        let restoredStep = parsed.currentStep;
        if (restoredStep === 'terms-agreement' as OnboardingStep) {
          restoredStep = 'terms-conditions';
        }
        if (restoredStep) setCurrentStep(restoredStep);
        if (parsed.businessInfo) setBusinessInfo(parsed.businessInfo);
        if (parsed.directors) setDirectors(parsed.directors);
        if (parsed.financialInfo) setFinancialInfo(parsed.financialInfo);
        if (parsed.tradeReferences) setTradeReferences(parsed.tradeReferences);
        // Handle new fields
        if (parsed.termsConditionsAgreed !== undefined) {
          setTermsConditionsAgreed(parsed.termsConditionsAgreed);
        } else if (parsed.termsAgreement?.hasAgreed) {
          // Migrate from old format
          setTermsConditionsAgreed(parsed.termsAgreement.hasAgreed);
        }
        if (parsed.guaranteeIndemnityAgreed !== undefined) {
          setGuaranteeIndemnityAgreed(parsed.guaranteeIndemnityAgreed);
        }
        if (parsed.signatureData) setSignatureData(parsed.signatureData);
      }
    } catch (e) {
      // Ignore parsing errors
      console.warn('Failed to restore onboarding data:', e);
    }
    setIsRestored(true);
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (!isRestored) return; // Don't save until initial restore is complete

    const formData: SavedFormData = {
      currentStep,
      businessInfo,
      directors,
      financialInfo,
      tradeReferences,
      termsConditionsAgreed,
      guaranteeIndemnityAgreed,
      signatureData,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (e) {
      console.warn('Failed to save onboarding data:', e);
    }
  }, [currentStep, businessInfo, directors, financialInfo, tradeReferences, termsConditionsAgreed, guaranteeIndemnityAgreed, signatureData, isRestored]);

  // Clear localStorage on successful submission
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear onboarding data:', e);
    }
  }, []);

  const registerMutation = api.customer.register.useMutation({
    onSuccess: () => {
      clearSavedData();
      toast({
        title: t('messages.success'),
      });
      router.push('/profile');
    },
    onError: (error: { message?: string }) => {
      toast({
        title: error.message || t('messages.error'),
        variant: 'destructive',
      });
    },
  });

  const handleSignaturesComplete = (signatureData: SignatureData[]) => {
    if (!user) {
      toast({
        title: t('messages.notAuthenticated'),
        variant: 'destructive',
      });
      return;
    }

    registerMutation.mutate({
      clerkUserId: user.id,
      ...(businessInfo as BusinessInfo),
      directors: directors.map((d) => ({
        ...d,
        dateOfBirth: new Date(d.dateOfBirth),
        licenseExpiry: new Date(d.licenseExpiry),
        residentialAddress: { ...d.residentialAddress, country: 'Australia' },
        // ID Document fields
        idDocumentType: d.idDocumentType,
        idDocumentFrontUrl: d.idDocumentFrontUrl,
        idDocumentBackUrl: d.idDocumentBackUrl,
        idDocumentUploadedAt: d.idDocumentUploadedAt ? new Date(d.idDocumentUploadedAt) : undefined,
      })),
      financialDetails: financialInfo as FinancialInfo,
      tradeReferences,
      signatures: signatureData,
    });
  };

  const currentStepIndex = STEP_IDS.indexOf(currentStep);

  // Build steps array with translated labels
  const steps: Step[] = useMemo(
    () =>
      STEP_IDS.map((id) => ({
        id,
        label: t(`steps.${id}`),
        shortLabel: t(`steps.${id}Short`),
      })),
    [t]
  );

  // Handle step click for navigation
  const handleStepClick = useCallback(
    (stepIndex: number) => {
      setCurrentStep(STEP_IDS[stepIndex]!);
    },
    []
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Step Navigation */}
      <div className="mb-8">
        <Stepper
          steps={steps}
          currentStepIndex={currentStepIndex}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Application PDF Link */}
      {process.env.NEXT_PUBLIC_APPLICATION_PDF_URL && (
        <div className="mb-6 flex justify-center">
          <a
            href={process.env.NEXT_PUBLIC_APPLICATION_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
            aria-label={t('applicationPdf.ariaLabel')}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t('applicationPdf.viewPrint')}
          </a>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {currentStep === 'business' && (
          <BusinessInfoStep
            data={businessInfo}
            onChange={setBusinessInfo}
            onNext={() => setCurrentStep('directors')}
          />
        )}

        {currentStep === 'directors' && (
          <DirectorsStep
            data={directors}
            onChange={setDirectors}
            onNext={() => setCurrentStep('financial')}
            onBack={() => setCurrentStep('business')}
          />
        )}

        {currentStep === 'financial' && (
          <FinancialStep
            data={financialInfo}
            onChange={setFinancialInfo}
            onNext={() => setCurrentStep('references')}
            onBack={() => setCurrentStep('directors')}
          />
        )}

        {currentStep === 'references' && (
          <TradeReferencesStep
            data={tradeReferences}
            onChange={setTradeReferences}
            onNext={() => setCurrentStep('review')}
            onBack={() => setCurrentStep('financial')}
          />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            businessInfo={businessInfo as BusinessInfo}
            directors={directors}
            financialInfo={financialInfo as FinancialInfo}
            tradeReferences={tradeReferences}
            onNext={() => setCurrentStep('terms-conditions')}
            onBack={() => setCurrentStep('references')}
            onStepClick={(stepIndex) => {
              const stepMap: OnboardingStep[] = ['business', 'directors', 'financial', 'references'];
              if (stepIndex >= 0 && stepIndex < stepMap.length) {
                setCurrentStep(stepMap[stepIndex]!);
              }
            }}
          />
        )}

        {currentStep === 'terms-conditions' && (
          <TermsConditionsStep
            agreed={termsConditionsAgreed}
            onChange={setTermsConditionsAgreed}
            onNext={() => setCurrentStep('guarantee-indemnity')}
            onBack={() => setCurrentStep('review')}
          />
        )}

        {currentStep === 'guarantee-indemnity' && (
          <GuaranteeIndemnityStep
            businessName={(businessInfo as BusinessInfo).businessName || ''}
            agreed={guaranteeIndemnityAgreed}
            onChange={setGuaranteeIndemnityAgreed}
            onNext={() => setCurrentStep('signatures')}
            onBack={() => setCurrentStep('terms-conditions')}
          />
        )}

        {currentStep === 'signatures' && (
          <SignatureStep
            directors={directors}
            businessName={(businessInfo as BusinessInfo).businessName}
            onComplete={handleSignaturesComplete}
            onBack={() => setCurrentStep('guarantee-indemnity')}
            isSubmitting={registerMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
