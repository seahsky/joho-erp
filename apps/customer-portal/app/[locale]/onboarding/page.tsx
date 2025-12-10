'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { FileText } from 'lucide-react';
import { api } from '@/trpc/client';
import { BusinessInfoStep } from './components/business-info-step';
import { DirectorsStep } from './components/directors-step';
import { FinancialStep } from './components/financial-step';
import { TradeReferencesStep } from './components/trade-references-step';
import { ReviewStep } from './components/review-step';

type OnboardingStep = 'business' | 'directors' | 'financial' | 'references' | 'review';

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
    areaTag: 'north' | 'south' | 'east' | 'west';
    deliveryInstructions?: string;
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

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const { user } = useUser();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business');
  const [businessInfo, setBusinessInfo] = useState<Partial<BusinessInfo>>({});
  const [directors, setDirectors] = useState<DirectorInfo[]>([]);
  const [financialInfo, setFinancialInfo] = useState<Partial<FinancialInfo>>({});
  const [tradeReferences, setTradeReferences] = useState<TradeReferenceInfo[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const registerMutation = api.customer.register.useMutation({
    onSuccess: () => {
      alert(t('messages.success'));
      router.push('/profile');
    },
    onError: (error: { message?: string }) => {
      alert(error.message || t('messages.error'));
    },
  });

  const handleSubmit = () => {
    if (!user) {
      alert(t('messages.notAuthenticated'));
      return;
    }

    if (!agreedToTerms) {
      alert(t('messages.mustAgreeToTerms'));
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
      })),
      financialDetails: financialInfo as FinancialInfo,
      tradeReferences,
      agreedToTerms,
    });
  };

  const steps: OnboardingStep[] = ['business', 'directors', 'financial', 'references', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>{t('progress.step', { current: currentStepIndex + 1, total: steps.length })}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Application PDF Link */}
      {process.env.NEXT_PUBLIC_APPLICATION_PDF_URL && (
        <div className="mb-6 flex justify-center">
          <a
            href={process.env.NEXT_PUBLIC_APPLICATION_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            aria-label={t('applicationPdf.ariaLabel')}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t('applicationPdf.viewPrint')}
          </a>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
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
            agreedToTerms={agreedToTerms}
            onAgreementChange={setAgreedToTerms}
            onSubmit={handleSubmit}
            onBack={() => setCurrentStep('references')}
            isSubmitting={registerMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
