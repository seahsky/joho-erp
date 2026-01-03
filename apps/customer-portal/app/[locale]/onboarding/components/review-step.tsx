'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@joho-erp/ui';
import { Building2, Users, Landmark, Briefcase, Edit } from 'lucide-react';
import type { BusinessInfo, DirectorInfo, FinancialInfo, TradeReferenceInfo } from '../page';

interface ReviewStepProps {
  businessInfo: BusinessInfo;
  directors: DirectorInfo[];
  financialInfo: FinancialInfo;
  tradeReferences: TradeReferenceInfo[];
  onNext: () => void;
  onBack: () => void;
  onStepClick?: (stepIndex: number) => void;
}

export function ReviewStep({
  businessInfo,
  directors,
  financialInfo,
  tradeReferences,
  onNext,
  onBack,
  onStepClick,
}: ReviewStepProps) {
  const t = useTranslations('onboarding.review');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Business Info */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {t('sections.businessInfo')}
          </CardTitle>
          {onStepClick && (
            <Button variant="ghost" size="sm" onClick={() => onStepClick(0)}>
              <Edit className="h-4 w-4 mr-1" />
              {t('edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm">
            <div className="grid grid-cols-3">
              <dt className="font-medium text-muted-foreground">{t('fields.accountType')}:</dt>
              <dd className="col-span-2">{businessInfo.accountType}</dd>
            </div>
            <div className="grid grid-cols-3">
              <dt className="font-medium text-muted-foreground">{t('fields.businessName')}:</dt>
              <dd className="col-span-2">{businessInfo.businessName}</dd>
            </div>
            <div className="grid grid-cols-3">
              <dt className="font-medium text-muted-foreground">{t('fields.abn')}:</dt>
              <dd className="col-span-2">{businessInfo.abn}</dd>
            </div>
            {businessInfo.acn && (
              <div className="grid grid-cols-3">
                <dt className="font-medium text-muted-foreground">{t('fields.acn')}:</dt>
                <dd className="col-span-2">{businessInfo.acn}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Directors */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            {t('sections.directors')}
          </CardTitle>
          {onStepClick && (
            <Button variant="ghost" size="sm" onClick={() => onStepClick(1)}>
              <Edit className="h-4 w-4 mr-1" />
              {t('edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {directors.map((director, index) => (
            <div key={index} className="mb-3 border-l-2 border-primary pl-3 last:mb-0">
              <p className="font-medium">
                {director.givenNames} {director.familyName}
              </p>
              <p className="text-sm text-muted-foreground">{director.position || t('noPosition')}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Financial Info */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-primary" />
            {t('sections.financialInfo')}
          </CardTitle>
          {onStepClick && (
            <Button variant="ghost" size="sm" onClick={() => onStepClick(2)}>
              <Edit className="h-4 w-4 mr-1" />
              {t('edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm">
            <div className="grid grid-cols-3">
              <dt className="font-medium text-muted-foreground">{t('fields.bankName')}:</dt>
              <dd className="col-span-2">{financialInfo.bankName}</dd>
            </div>
            <div className="grid grid-cols-3">
              <dt className="font-medium text-muted-foreground">{t('fields.accountName')}:</dt>
              <dd className="col-span-2">{financialInfo.accountName}</dd>
            </div>
            <div className="grid grid-cols-3">
              <dt className="font-medium text-muted-foreground">{t('fields.bsb')}:</dt>
              <dd className="col-span-2">{financialInfo.bsb}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Trade References */}
      {tradeReferences.length > 0 && (
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              {t('sections.tradeReferences')}
            </CardTitle>
            {onStepClick && (
              <Button variant="ghost" size="sm" onClick={() => onStepClick(3)}>
                <Edit className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {tradeReferences.map((ref, index) => (
              <div key={index} className="mb-2 last:mb-0">
                <p className="font-medium">{ref.companyName}</p>
                <p className="text-sm text-muted-foreground">
                  {ref.contactPerson} - {ref.email}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info about next step */}
      <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
        <p className="text-sm text-primary">
          {t('nextStepInfo', {
            defaultValue:
              'Please review all information above. In the next step, you will sign the Terms & Conditions and Guarantee agreements.',
          })}
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button onClick={onNext}>{t('buttons.next')}</Button>
      </div>
    </div>
  );
}
