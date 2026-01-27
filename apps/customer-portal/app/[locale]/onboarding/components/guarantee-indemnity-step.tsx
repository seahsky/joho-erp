'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, Checkbox, Label, useToast } from '@joho-erp/ui';
import { SignaturePadComponent } from './signature-pad';
import type { DirectorInfo, DirectorSignature } from '../page';

interface GuaranteeIndemnityStepProps {
  businessName: string;
  directors: DirectorInfo[];
  directorSignatures: DirectorSignature[];
  onSignaturesChange: (signatures: DirectorSignature[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function GuaranteeIndemnityStep({
  businessName,
  directors,
  directorSignatures,
  onSignaturesChange,
  onNext,
  onBack,
}: GuaranteeIndemnityStepProps) {
  const t = useTranslations('onboarding.guaranteeIndemnity');
  const { toast } = useToast();
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Ensure signatures exist for all directors
  const ensureDirectorSignatures = useCallback(() => {
    if (directorSignatures.length !== directors.length) {
      const newSignatures = directors.map((_, index) => {
        const existing = directorSignatures.find(s => s.directorIndex === index);
        return existing || {
          directorIndex: index,
          applicantSignature: null,
          applicantSignedAt: null,
          guarantorSignature: null,
          guarantorSignedAt: null,
        };
      });
      onSignaturesChange(newSignatures);
      return newSignatures;
    }
    return directorSignatures;
  }, [directors, directorSignatures, onSignaturesChange]);

  const handleCheckboxChange = (checked: boolean) => {
    setAgreed(checked);
    if (checked) {
      ensureDirectorSignatures();
    }
  };

  const handleSignatureChange = (directorIndex: number, signature: string | null) => {
    const updatedSignatures = ensureDirectorSignatures().map(sig => {
      if (sig.directorIndex === directorIndex) {
        return {
          ...sig,
          guarantorSignature: signature,
          guarantorSignedAt: signature ? new Date() : null,
        };
      }
      return sig;
    });
    onSignaturesChange(updatedSignatures);
    // Clear error for this director
    setErrors(prev => ({ ...prev, [directorIndex]: '' }));
  };

  const validateSignatures = (): boolean => {
    if (!agreed) {
      toast({
        title: t('validation.mustAgree'),
        variant: 'destructive',
      });
      checkboxRef.current?.focus();
      return false;
    }

    const sigs = ensureDirectorSignatures();
    const newErrors: Record<number, string> = {};
    let isValid = true;

    directors.forEach((_, index) => {
      const sig = sigs.find(s => s.directorIndex === index);
      if (!sig?.guarantorSignature || sig.guarantorSignature.length < 200) {
        newErrors[index] = t('validation.signatureRequired', { defaultValue: 'Signature is required' });
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateSignatures()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Guarantee Content - HARDCODED IN ENGLISH */}
      <Card>
        <CardContent className="p-6">
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6">
            {/* Header Section */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium leading-relaxed">
                To: JIMMY&apos;S BEEF PTY LTD ABN 78 673 178 615 (&quot;the Supplier&quot;)
              </p>
            </div>

            {/* Recitals */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Recitals</h3>
              <div className="space-y-2 text-sm">
                <p><strong>A.</strong> The Applicant ({businessName || '[Business Name]'}) has submitted an application to be supplied credit by the Supplier.</p>
                <p><strong>B.</strong> This Guarantee and Indemnity applies to all credit supplied by the Supplier to the Applicant, including all branches, divisions and related entities.</p>
              </div>
            </div>

            {/* Operative Part */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Operative Part</h3>

              {/* Clause 1: Guarantor Obligations */}
              <div className="space-y-2">
                <h4 className="font-semibold">1. Guarantor Obligations</h4>
                <p className="text-sm">In consideration of the Supplier agreeing to supply credit to the Applicant, each Guarantor:</p>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                  <li>unconditionally and irrevocably guarantees to the Supplier the due and punctual payment by the Applicant of all amounts payable to the Supplier;</li>
                  <li>unconditionally and irrevocably guarantees to the Supplier the due and punctual performance by the Applicant of all its obligations to the Supplier;</li>
                  <li>unconditionally and irrevocably indemnifies the Supplier against all loss, damage, costs and expenses arising from any default by the Applicant.</li>
                </ol>
              </div>

              {/* Clause 2: Principal Obligation */}
              <div className="space-y-2">
                <h4 className="font-semibold">2. Principal Obligation</h4>
                <p className="text-sm">This guarantee and indemnity is a principal obligation and not ancillary to any obligation of the Applicant. The Guarantor&apos;s liability is not affected by any other security or guarantee held by the Supplier.</p>
              </div>

              {/* Clause 3: Enforceability Conditions */}
              <div className="space-y-2">
                <h4 className="font-semibold">3. Enforceability</h4>
                <p className="text-sm">This guarantee and indemnity remains enforceable against the Guarantor notwithstanding:</p>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                  <li>any variation, extension or renewal of any credit facility or payment terms;</li>
                  <li>any release or discharge of the Applicant or any other guarantor;</li>
                  <li>any failure to enforce or delay in enforcing any rights against the Applicant;</li>
                  <li>any arrangement or compromise with the Applicant or any other guarantor;</li>
                  <li>the insolvency, liquidation, administration or death of the Applicant or any other guarantor;</li>
                  <li>any change in the constitution of the Applicant or Supplier;</li>
                  <li>any security interest being void, invalid or unenforceable;</li>
                  <li>any other act, omission or circumstance which might otherwise affect or discharge the Guarantor&apos;s liability.</li>
                </ol>
              </div>

              {/* Clause 4: Continuing Guarantee */}
              <div className="space-y-2">
                <h4 className="font-semibold">4. Continuing Guarantee</h4>
                <p className="text-sm">This is a continuing guarantee and remains in force until all amounts owing by the Applicant are paid in full and the Supplier has no further obligation to provide credit.</p>
              </div>

              {/* Clause 5: Joint and Several Liability */}
              <div className="space-y-2">
                <h4 className="font-semibold">5. Joint and Several Liability</h4>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                  <li>If more than one person signs as Guarantor, each is jointly and severally liable under this guarantee and indemnity.</li>
                  <li>The Supplier may release or compromise with any Guarantor without affecting the liability of any other Guarantor.</li>
                  <li>Each Guarantor waives any rights to claim contribution from any other Guarantor.</li>
                </ol>
              </div>

              {/* Clause 6: Waiver of Rights */}
              <div className="space-y-2">
                <h4 className="font-semibold">6. Waiver of Rights</h4>
                <p className="text-sm">Each Guarantor waives any right to require the Supplier to proceed first against the Applicant or any other guarantor or to enforce any other security before enforcing this guarantee.</p>
              </div>

              {/* Clause 7: Property Charge */}
              <div className="space-y-2">
                <h4 className="font-semibold">7. Property Charge</h4>
                <p className="text-sm">Each Guarantor charges all of their estate and interest in any real property owned by them (whether solely or jointly) with the payment of all amounts payable under this guarantee and indemnity.</p>
              </div>

              {/* Clause 8: Credit Reporting Consent */}
              <div className="space-y-2">
                <h4 className="font-semibold">8. Credit Reporting Consent</h4>
                <p className="text-sm">Each Guarantor consents to the Supplier obtaining credit reports and disclosing personal information to credit reporting agencies for the purposes of assessing creditworthiness and debt recovery.</p>
              </div>

              {/* Clause 9: Trust Authority Warrant */}
              <div className="space-y-2">
                <h4 className="font-semibold">9. Trust Authority</h4>
                <p className="text-sm">If a Guarantor is a trustee, the Guarantor warrants that it has full power and authority to enter into this guarantee and indemnity and to bind the trust assets.</p>
              </div>

              {/* Clause 10: Notice Provisions */}
              <div className="space-y-2">
                <h4 className="font-semibold">10. Notices</h4>
                <p className="text-sm">Any notice under this guarantee and indemnity must be in writing and may be served by post, email or personal delivery to the last known address of the party.</p>
              </div>

              {/* Clause 11: Definitions */}
              <div className="space-y-2">
                <h4 className="font-semibold">11. Definitions</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>&quot;Supplier&quot;</strong> means JIMMY&apos;S BEEF PTY LTD ABN 78 673 178 615.</li>
                  <li><strong>&quot;Applicant&quot;</strong> means the person, partnership, corporation, trust or other entity applying for credit.</li>
                  <li><strong>&quot;Guarantors&quot;</strong> means each person who signs this guarantee and indemnity as a guarantor.</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreement Checkbox */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="guarantee-indemnity-agreement"
              ref={checkboxRef}
              checked={agreed}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="guarantee-indemnity-agreement"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                {t('agreement.label')}
                <span className="ml-1 text-destructive" aria-label={t('agreement.required')}>
                  *
                </span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Director/Guarantor Signatures - Only shown when checkbox is checked */}
      {agreed && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('guarantorSignatures.title', { defaultValue: 'Guarantor Signatures' })}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t('guarantorSignatures.description', { defaultValue: 'Each director/guarantor must sign below to acknowledge the guarantee and indemnity.' })}
            </p>
            <div className="space-y-6">
              {directors.map((director, index) => {
                const directorName = `${director.givenNames} ${director.familyName}`;
                const signature = directorSignatures.find(s => s.directorIndex === index);
                return (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900">
                        {t('guarantorSignatures.guarantorLabel', {
                          defaultValue: 'Guarantor {number}: {name}',
                          number: index + 1,
                          name: directorName,
                        })}
                        {director.position && (
                          <span className="text-muted-foreground ml-2">({director.position})</span>
                        )}
                      </h4>
                    </div>
                    <SignaturePadComponent
                      id={`guarantor-signature-${index}`}
                      label={t('guarantorSignatures.signatureLabel', { defaultValue: 'Signature' })}
                      onSignatureChange={(sig) => handleSignatureChange(index, sig)}
                      required
                      error={errors[index]}
                    />
                    {signature?.guarantorSignature && (
                      <p className="mt-2 text-sm text-green-600">
                        {t('guarantorSignatures.signatureComplete', { defaultValue: 'Signature captured' })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button onClick={handleNext}>
          {t('buttons.next')}
        </Button>
      </div>
    </div>
  );
}
