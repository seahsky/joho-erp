'use client';

import { useState, useEffect } from 'react';
import { api } from '@/trpc/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  useToast,
  Badge,
} from '@joho-erp/ui';
import { Plug, Save, Loader2, CheckCircle2, XCircle, TestTube2, ChevronRight, ChevronDown, Shield, Clock, Users, FileText, Edit3, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';

// Simple Switch component using checkbox
function Switch({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
    />
  );
}

// Type for detailed test results
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

export default function IntegrationsSettingsPage() {
  const t = useTranslations('settings.integrations');
  const { toast } = useToast();
  const utils = api.useUtils();
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState('hourly');

  // Test results state
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  // Load data
  const { data: settings, isLoading } = api.company.getSettings.useQuery();

  // Save mutation
  const saveMutation = api.company.updateXeroSettings.useMutation({
    onSuccess: () => {
      toast({
        title: t('settingsSaved'),
        description: t('settingsSavedDescription'),
      });
      setHasChanges(false);
      void utils.company.getSettings.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('saveError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = api.company.testXeroConnection.useMutation({
    onSuccess: (data) => {
      setTestResults(data as TestResult);
      setShowTestResults(true);
      toast({
        title: data.success ? t('xero.testSuccess') : t('xero.testFailed'),
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      setTestResults(null);
      toast({
        title: t('xero.testFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Load settings into form
  useEffect(() => {
    if (settings?.xeroSettings) {
      setClientId(settings.xeroSettings.clientId || '');
      setClientSecret(settings.xeroSettings.clientSecret || '');
      setTenantId(settings.xeroSettings.tenantId || '');
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings?.xeroSettings) {
      const modified =
        clientId !== (settings.xeroSettings.clientId || '') ||
        clientSecret !== (settings.xeroSettings.clientSecret || '') ||
        tenantId !== (settings.xeroSettings.tenantId || '');
      setHasChanges(modified);
    }
  }, [clientId, clientSecret, tenantId, settings]);

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      clientId,
      clientSecret,
      tenantId: tenantId || undefined,
    });
  };

  const handleTestConnection = async () => {
    await testConnectionMutation.mutateAsync();
  };

  const isConnected = settings?.xeroSettings &&
    settings.xeroSettings.clientId &&
    settings.xeroSettings.clientSecret;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={Plug}
        titleKey="integrations.title"
        descriptionKey="integrations.subtitle"
      />

      {/* Content Cards */}
      <div className="space-y-6">
        {/* Xero Integration */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t('xero.title')}
                  {isConnected ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('xero.connected')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      {t('xero.notConnected')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{t('xero.description')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credentials Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{t('xero.credentials')}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">{t('xero.clientId')} *</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={t('xero.clientId')}
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">{t('xero.clientSecret')} *</Label>
                  <Input
                    id="clientSecret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder={t('xero.clientSecret')}
                    type="password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantId">{t('xero.tenantId')}</Label>
                <Input
                  id="tenantId"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder={t('xero.tenantId')}
                />
                <p className="text-xs text-muted-foreground">{t('xero.tenantIdHint')}</p>
              </div>
            </div>

            {/* Sync Settings Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm">{t('xero.syncSettings')}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoSync">{t('xero.autoSync')}</Label>
                  <p className="text-xs text-muted-foreground">{t('xero.autoSyncDescription')}</p>
                </div>
                <Switch
                  id="autoSync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>
              {autoSync && (
                <div className="space-y-2">
                  <Label htmlFor="syncFrequency">{t('xero.syncFrequency')}</Label>
                  <select
                    id="syncFrequency"
                    value={syncFrequency}
                    onChange={(e) => setSyncFrequency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="realtime">{t('xero.realtime')}</option>
                    <option value="hourly">{t('xero.hourly')}</option>
                    <option value="daily">{t('xero.daily')}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('saveChanges')}
                  </>
                )}
              </Button>
              <Button
                onClick={handleTestConnection}
                disabled={!isConnected || testConnectionMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('xero.testing')}
                  </>
                ) : (
                  <>
                    <TestTube2 className="h-4 w-4 mr-2" />
                    {t('xero.testConnection')}
                  </>
                )}
              </Button>
            </div>

            {/* Test Results Section */}
            {testResults && (
              <div className="pt-4 border-t">
                <button
                  onClick={() => setShowTestResults(!showTestResults)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <TestTube2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{t('xero.testResults.title')}</span>
                    {testResults.success ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('xero.testResults.allPassed')}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t('xero.testResults.someFailed')}
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
                        <span className="text-sm">{t('xero.testResults.tokenValid')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {testResults.details.tokenExpiresInMinutes !== null && (
                          <span className="text-xs text-muted-foreground">
                            {t('xero.testResults.expiresIn', { minutes: testResults.details.tokenExpiresInMinutes })}
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
                        <span className="text-sm">{t('xero.testResults.tenantConnected')}</span>
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
                        <span className="text-sm">{t('xero.testResults.canReadContacts')}</span>
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
                        <span className="text-sm">{t('xero.testResults.canReadInvoices')}</span>
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
                        <span className="text-sm">{t('xero.testResults.canWriteContacts')}</span>
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
                        <span className="text-sm">{t('xero.testResults.encryptionEnabled')}</span>
                      </div>
                      {testResults.details.encryptionEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t('xero.testResults.notConfigured')}
                        </Badge>
                      )}
                    </div>

                    {/* Errors */}
                    {testResults.errors.length > 0 && (
                      <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium text-destructive">
                            {t('xero.testResults.errors')}
                          </span>
                        </div>
                        <ul className="text-xs text-destructive space-y-1">
                          {testResults.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Last Sync Info */}
            {isConnected && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {t('xero.lastSync')}: {t('xero.never')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Integrations Placeholder */}
        <Card className="animate-fade-in-up delay-200">
          <CardHeader>
            <CardTitle>{t('futureIntegrations.title')}</CardTitle>
            <CardDescription>{t('futureIntegrations.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {['QuickBooks', 'MYOB', 'Stripe'].map((integration) => (
                <div
                  key={integration}
                  className="border rounded-lg p-4 flex flex-col items-center justify-center text-center opacity-50"
                >
                  <Plug className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="font-medium text-sm">{integration}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('futureIntegrations.comingSoon')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unsaved Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-warning text-warning-foreground px-6 py-3 rounded-lg shadow-lg animate-fade-in-up">
          {t('unsavedChanges')}
        </div>
      )}
    </div>
  );
}
