'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, Button, Checkbox, Label, useToast } from '@joho-erp/ui';
import { SignaturePadComponent } from './signature-pad';
import type { DirectorInfo, DirectorSignature } from '../page';

interface TermsConditionsStepProps {
  directors: DirectorInfo[];
  directorSignatures: DirectorSignature[];
  onSignaturesChange: (signatures: DirectorSignature[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TermsConditionsStep({
  directors,
  directorSignatures,
  onSignaturesChange,
  onNext,
  onBack,
}: TermsConditionsStepProps) {
  const t = useTranslations('onboarding.termsConditions');
  const { toast } = useToast();
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Initialize signatures for all directors if not already present
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
          applicantSignature: signature,
          applicantSignedAt: signature ? new Date() : null,
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
      if (!sig?.applicantSignature || sig.applicantSignature.length < 200) {
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

      {/* Terms Content - HARDCODED IN ENGLISH */}
      <Card>
        <CardContent className="p-6">
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6">
            {/* Intro Section */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium leading-relaxed">
                I/WE HEREBY AGREE TO BE BOUND BY THE FOLLOWING TERMS AND CONDITIONS IN CONSIDERATION OF THE SUPPLIER PROVIDING CREDIT FACILITY TO THE APPLICANT.
              </p>
            </div>

            {/* Definitions */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Definitions</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li><strong>&quot;Applicant&quot;</strong> means the person, partnership, corporation, trust or other entity described as such on this credit application form.</li>
                <li><strong>&quot;Conditions&quot;</strong> means these terms and conditions.</li>
                <li><strong>&quot;Supplier&quot;</strong> means JIMMY&apos;S BEEF PTY LTD ABN 78 673 178 615.</li>
                <li><strong>&quot;Goods/Services&quot;</strong> means all goods and/or services supplied by the Supplier to the Applicant.</li>
              </ul>
            </div>

            {/* Clause 1: Credit Facility */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">1. Credit Facility</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>The Supplier may, at its absolute discretion, grant the Applicant a credit facility.</li>
                <li>The Supplier may, at any time and without notice, vary or cancel the credit facility.</li>
                <li>The Applicant acknowledges that the Supplier is under no obligation to provide credit to the Applicant.</li>
                <li>The Supplier reserves the right to refuse to supply goods or services to the Applicant at any time.</li>
                <li>The Applicant agrees to pay for all goods and services supplied by the Supplier in accordance with these Conditions.</li>
                <li>The Applicant acknowledges that the prices of goods and services may change from time to time without notice.</li>
                <li>The credit limit may be varied by the Supplier at any time without notice to the Applicant.</li>
              </ol>
            </div>

            {/* Clause 2: Payment and Default */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">2. Payment and Default</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-2 text-sm">
                <li>Payment terms are strictly 7 days from the date of invoice unless otherwise agreed in writing by the Supplier.</li>
                <li>
                  If the Applicant fails to pay any amount when due, or is in breach of any of these Conditions, the Supplier may (without prejudice to any other rights it may have):
                  <ol className="list-[lower-roman] pl-6 space-y-1 mt-1">
                    <li>charge interest on overdue amounts at the rate of 2% per month (or part thereof) calculated daily and compounding monthly;</li>
                    <li>suspend or cancel any credit facility;</li>
                    <li>require the Applicant to pay cash on delivery for any further goods or services;</li>
                    <li>refuse to supply any further goods or services to the Applicant;</li>
                    <li>repossess any goods for which payment has not been received;</li>
                    <li>recover from the Applicant all costs and expenses (including legal costs on a solicitor/client basis) incurred in recovering any amounts owed;</li>
                    <li>register a default on the Applicant&apos;s credit file;</li>
                    <li>appoint a debt collection agency to recover outstanding amounts;</li>
                    <li>take any other action permitted by law.</li>
                  </ol>
                </li>
                <li>
                  The Applicant shall be in default if:
                  <ol className="list-[lower-roman] pl-6 space-y-1 mt-1">
                    <li>the Applicant fails to pay any amount when due;</li>
                    <li>the Applicant breaches any of these Conditions;</li>
                    <li>the Applicant becomes insolvent, enters into liquidation or administration, or has a receiver or manager appointed;</li>
                    <li>the Applicant ceases or threatens to cease carrying on business;</li>
                    <li>any information provided by the Applicant is false, misleading or incomplete.</li>
                  </ol>
                </li>
                <li>The Applicant agrees that any representation of authority to purchase on behalf of the Applicant shall bind the Applicant for payment.</li>
                <li>The Applicant waives any right to set-off or counterclaim against amounts owed to the Supplier.</li>
              </ol>
            </div>

            {/* Clause 3: Personal Guarantee */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3. Personal Guarantee</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>If the Applicant is a company, trust or partnership, each director, trustee or partner (as applicable) personally guarantees the payment of all amounts owed by the Applicant to the Supplier.</li>
                <li>The personal guarantee is a continuing guarantee and remains in force until all amounts owed are paid in full.</li>
              </ol>
            </div>

            {/* Clause 4: Title */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">4. Title</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>Title to goods does not pass to the Applicant until payment in full has been received by the Supplier.</li>
                <li>Until title passes, the Applicant holds the goods as bailee for the Supplier.</li>
                <li>The Applicant grants the Supplier an irrevocable licence to enter any premises where goods may be stored to repossess goods for which payment has not been received.</li>
                <li>If goods are mixed with other goods or processed, the Supplier retains title to the goods to the extent of the value of the Supplier&apos;s goods.</li>
              </ol>
            </div>

            {/* Clause 5: Supplier's Rights */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">5. Supplier&apos;s Rights</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>The Supplier may at any time and without notice set off any amount owed to the Applicant against any amount owed by the Applicant to the Supplier.</li>
                <li>The Supplier may assign or otherwise deal with its rights under these Conditions without the consent of the Applicant.</li>
                <li>The Supplier&apos;s failure to exercise any right under these Conditions does not constitute a waiver of that right.</li>
                <li>The Supplier may vary these Conditions at any time by giving written notice to the Applicant.</li>
                <li>Any variation to these Conditions applies to all transactions after notice is given.</li>
              </ol>
            </div>

            {/* Clause 6: General Lien */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">6. General Lien</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>The Supplier has a general lien over all goods in its possession for any amounts owed by the Applicant.</li>
              </ol>
            </div>

            {/* Clause 7: Risk */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">7. Risk</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>Risk in the goods passes to the Applicant upon delivery.</li>
                <li>The Applicant must insure the goods from the time risk passes until title passes.</li>
                <li>The Applicant is liable for any loss or damage to goods after risk passes, regardless of whether title has passed.</li>
              </ol>
            </div>

            {/* Clause 8: Force Majeure */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">8. Force Majeure</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>The Supplier is not liable for any delay or failure to perform its obligations if the delay or failure is caused by circumstances beyond its reasonable control.</li>
              </ol>
            </div>

            {/* Clause 9: PPSA */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">9. Personal Property Securities Act 2009 (PPSA)</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>The Applicant acknowledges that these Conditions create a security interest in the goods supplied by the Supplier.</li>
                <li>The Applicant agrees to do all things necessary to ensure the Supplier has a perfected security interest in the goods.</li>
                <li>The Applicant waives its right to receive a verification statement under the PPSA.</li>
                <li>The Applicant agrees that the Supplier may register a financing statement on the Personal Property Securities Register (PPSR) in respect of goods supplied.</li>
                <li>The Applicant agrees not to change its name, ABN or other identifying details without first giving 14 days written notice to the Supplier.</li>
                <li>The Applicant agrees to pay all costs associated with the registration and maintenance of the Supplier&apos;s security interest.</li>
                <li>The Applicant agrees that the Supplier may exercise all rights available to a secured party under the PPSA.</li>
                <li>To the extent permitted by law, the Applicant and Supplier agree to contract out of sections 95, 96, 117, 118, 120, 121(4), 125, 130, 132(3)(d), 132(4), 135, 142 and 143 of the PPSA.</li>
                <li>The Applicant agrees not to register a financing statement in respect of any security interest in goods supplied without the Supplier&apos;s prior written consent.</li>
                <li>The Applicant agrees to provide all information required by the Supplier to register a financing statement.</li>
                <li>The Applicant acknowledges that it has received value and has not agreed to postpone the time for attachment of the security interest.</li>
              </ol>
            </div>

            {/* Clause 10: Severance */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">10. Severance</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>If any provision of these Conditions is invalid or unenforceable, it will be severed and the remaining provisions will continue in full force and effect.</li>
              </ol>
            </div>

            {/* Clause 11: Governing Law */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">11. Governing Law</h3>
              <ol className="list-[lower-alpha] pl-6 space-y-1 text-sm">
                <li>These Conditions are governed by the laws of Victoria, Australia, and the parties submit to the exclusive jurisdiction of the courts of Victoria.</li>
              </ol>
            </div>

            {/* Declaration Section */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="text-lg font-semibold">Declaration</h3>
              <p className="text-sm">By agreeing to these terms, I/we declare and affirm that:</p>
              <ol className="list-decimal pl-6 space-y-2 text-sm">
                <li>I/We have read and understood the terms of this application and confirm that the terms will apply to any credit facility provided by the Supplier to me/us.</li>
                <li>The information supplied by me/us, the Applicant, in this application is true and correct.</li>
                <li>I/We acknowledge the Supplier and related parties will use this information for the purpose of assessing my/our commercial credit application.</li>
                <li>I/We consent to the Supplier obtaining from a credit reporting agency a credit report containing personal credit information about me/us in relation to commercial credit provided by the Supplier.</li>
                <li>I/We consent to the Supplier disclosing personal information to credit reporting agencies and other credit providers for the purposes of assessing creditworthiness and debt recovery.</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreement Checkbox */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-conditions-agreement"
              ref={checkboxRef}
              checked={agreed}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="terms-conditions-agreement"
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

      {/* Director Signatures - Only shown when checkbox is checked */}
      {agreed && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('directorSignatures.title', { defaultValue: 'Director Signatures' })}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t('directorSignatures.description', { defaultValue: 'Each director must sign below to acknowledge agreement to the terms and conditions.' })}
            </p>
            <div className="space-y-6">
              {directors.map((director, index) => {
                const directorName = `${director.givenNames} ${director.familyName}`;
                const signature = directorSignatures.find(s => s.directorIndex === index);
                return (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900">
                        {t('directorSignatures.directorLabel', {
                          defaultValue: 'Director {number}: {name}',
                          number: index + 1,
                          name: directorName,
                        })}
                        {director.position && (
                          <span className="text-muted-foreground ml-2">({director.position})</span>
                        )}
                      </h4>
                    </div>
                    <SignaturePadComponent
                      id={`applicant-signature-${index}`}
                      label={t('directorSignatures.signatureLabel', { defaultValue: 'Signature' })}
                      onSignatureChange={(sig) => handleSignatureChange(index, sig)}
                      required
                      error={errors[index]}
                    />
                    {signature?.applicantSignature && (
                      <p className="mt-2 text-sm text-green-600">
                        {t('directorSignatures.signatureComplete', { defaultValue: 'Signature captured' })}
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
