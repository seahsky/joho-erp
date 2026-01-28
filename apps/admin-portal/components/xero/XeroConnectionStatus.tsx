'use client';

import { useState } from 'react';
import { api } from '@/trpc/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@joho-erp/ui';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  TestTube2,
  Plug,
  Clock,
  Users,
  FileText,
  Edit3,
  Shield,
  AlertCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TestResultDetails {
  tokenValid: boolean;
  tokenExpiresInMinutes: number | null;
  tenantConnected: boolean;
  tenantName: string | null;
  canReadContacts: boolean;
  canReadInvoices: boolean;
  canWriteContacts: boolean;
  encryptionEnabled: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  details: TestResultDetails;
  errors: string[];
}

export function XeroConnectionStatus() {
  const t = useTranslations('xeroStatus.connectionStatus');
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  // Load company settings to check connection status
  const { data: settings, isLoading } = api.company.getSettings.useQuery();

  // Test connection mutation
  const testConnectionMutation = api.company.testXeroConnection.useMutation({
    onSuccess: (data) => {
      setTestResults(data as TestResult);
      setShowTestResults(true);
    },
    onError: () => {
      setTestResults(null);
    },
  });

  const handleTestConnection = async () => {
    await testConnectionMutation.mutateAsync();
  };

  const isConnected =
    settings?.xeroSettings &&
    settings.xeroSettings.clientId &&
    settings.xeroSettings.clientSecret;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t('title')}
              {isConnected ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t('connected')}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  {t('disconnected')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Connection Button */}
        <Button
          onClick={handleTestConnection}
          disabled={!isConnected || testConnectionMutation.isPending}
          variant="outline"
          className="w-full"
        >
          {testConnectionMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('testing')}
            </>
          ) : (
            <>
              <TestTube2 className="h-4 w-4 mr-2" />
              {t('testConnection')}
            </>
          )}
        </Button>

        {/* Test Results Section */}
        {testResults && (
          <div className="pt-4 border-t">
            <button
              onClick={() => setShowTestResults(!showTestResults)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <TestTube2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{t('testResults.title')}</span>
                {testResults.success ? (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('testResults.allPassed')}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {t('testResults.someFailed')}
                  </Badge>
                )}
              </div>
              {showTestResults ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showTestResults && (
              <div className="mt-4 space-y-3">
                {/* Token Status */}
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('testResults.tokenValid')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResults.details.tokenExpiresInMinutes !== null && (
                      <span className="text-xs text-muted-foreground">
                        {t('testResults.expiresIn', {
                          minutes: testResults.details.tokenExpiresInMinutes,
                        })}
                      </span>
                    )}
                    {testResults.details.tokenValid ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>

                {/* Tenant Connection */}
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('testResults.tenantConnected')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResults.details.tenantName && (
                      <span className="text-xs text-muted-foreground">
                        {testResults.details.tenantName}
                      </span>
                    )}
                    {testResults.details.tenantConnected ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>

                {/* Read Contacts */}
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('testResults.canReadContacts')}</span>
                  </div>
                  {testResults.details.canReadContacts ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>

                {/* Read Invoices */}
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('testResults.canReadInvoices')}</span>
                  </div>
                  {testResults.details.canReadInvoices ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>

                {/* Write Contacts */}
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('testResults.canWriteContacts')}</span>
                  </div>
                  {testResults.details.canWriteContacts ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>

                {/* Encryption Status */}
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('testResults.encryptionEnabled')}</span>
                  </div>
                  {testResults.details.encryptionEnabled ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {t('testResults.notConfigured')}
                    </Badge>
                  )}
                </div>

                {/* Errors */}
                {testResults.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">
                        {t('testResults.errors')}
                      </span>
                    </div>
                    <ul className="text-xs text-destructive space-y-1">
                      {testResults.errors.map((error, index) => (
                        <li key={index}>&bull; {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
