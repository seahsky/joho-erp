'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button, Card, CardContent, Checkbox, Label, useToast } from '@joho-erp/ui';
import { ChevronLeft, ChevronRight, Download, AlertCircle, Loader2 } from 'lucide-react';

// Configure PDF.js worker with CDN fallback for reliability
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface TermsAgreementStepProps {
  data: { hasAgreed: boolean };
  onChange: (data: { hasAgreed: boolean }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TermsAgreementStep({
  data,
  onChange,
  onNext,
  onBack,
}: TermsAgreementStepProps) {
  const t = useTranslations('onboarding.termsAgreement');
  const { toast } = useToast();
  const checkboxRef = useRef<HTMLInputElement>(null);

  // PDF state management
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfError, setPdfError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Agreement state
  const [hasAgreed, setHasAgreed] = useState(data.hasAgreed || false);
  const [error, setError] = useState<string | null>(null);

  // Window width for responsive PDF sizing
  const [windowWidth, setWindowWidth] = useState(0);

  const pdfUrl = process.env.NEXT_PUBLIC_APPLICATION_PDF_URL;

  // Set initial window width on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Sync hasAgreed state to parent
  useEffect(() => {
    onChange({ hasAgreed });
  }, [hasAgreed, onChange]);

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean) => {
    setHasAgreed(checked);
    if (checked) {
      setError(null); // Clear error when user agrees
    }
  };

  // Validation function
  const validate = (): boolean => {
    if (!hasAgreed) {
      const errorMsg = t('validation.mustAgree');
      setError(errorMsg);
      toast({
        title: errorMsg,
        variant: 'destructive',
      });
      checkboxRef.current?.focus();
      return false;
    }
    return true;
  };

  // Handle Next button click
  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  // PDF document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setPdfError(null);
  }, []);

  // PDF document load error
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF Load Error:', error);
    setPdfError(error);
    setIsLoading(false);
    toast({
      title: t('pdfViewer.loadError'),
      variant: 'destructive',
    });
  }, [t, toast]);

  // Retry loading PDF
  const handleRetry = () => {
    setPdfError(null);
    setIsLoading(true);
    setPageNumber(1);
  };

  // Pagination handlers
  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  // Calculate responsive PDF width
  const getPdfWidth = () => {
    if (windowWidth === 0) return 800; // Default for SSR
    if (windowWidth < 640) return windowWidth - 32; // Mobile: full width minus padding
    if (windowWidth < 768) return windowWidth - 64; // Tablet: full width minus padding
    return 800; // Desktop: fixed width
  };

  const pdfWidth = getPdfWidth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* PDF Viewer Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {!pdfUrl ? (
              // No PDF URL configured
              <div className="flex flex-col items-center justify-center space-y-3 py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('pdfViewer.loadError')}
                </p>
              </div>
            ) : pdfError ? (
              // PDF load error
              <div className="flex flex-col items-center justify-center space-y-3 py-12">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  {t('pdfViewer.loadError')}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    {t('pdfViewer.retry')}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      {t('pdfViewer.downloadPdf')}
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              // PDF viewer
              <>
                <div className="w-full overflow-hidden rounded-lg border bg-gray-50">
                  <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="flex flex-col items-center justify-center space-y-3 py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            {t('pdfViewer.loading')}
                          </p>
                        </div>
                      }
                    >
                      {!isLoading && <Page pageNumber={pageNumber} width={pdfWidth} />}
                    </Document>
                  </div>
                </div>

                {/* Pagination Controls */}
                {numPages > 0 && (
                  <div className="flex w-full items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      {t('pdfViewer.previousPage')}
                    </Button>

                    <span className="text-sm text-muted-foreground">
                      {t('pdfViewer.page', { current: pageNumber, total: numPages })}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={pageNumber >= numPages}
                    >
                      {t('pdfViewer.nextPage')}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Download Link */}
                <Button variant="link" size="sm" asChild className="text-primary">
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {t('pdfViewer.downloadPdf')}
                  </a>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agreement Checkbox */}
      <Card className={error ? 'border-destructive' : ''}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-agreement"
              ref={checkboxRef}
              checked={hasAgreed}
              onCheckedChange={handleCheckboxChange}
              aria-invalid={!!error}
              aria-describedby={error ? 'terms-agreement-error' : undefined}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="terms-agreement"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                {t('agreement.label')}
                <span className="ml-1 text-destructive" aria-label={t('agreement.required')}>
                  *
                </span>
              </Label>
              {error && (
                <p id="terms-agreement-error" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
