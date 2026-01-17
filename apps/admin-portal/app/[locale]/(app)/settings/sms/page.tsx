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
} from '@joho-erp/ui';
import { MessageSquare, Loader2, Send, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEFAULT_SMS_TEMPLATE, DEFAULT_SMS_SEND_TIME } from '@joho-erp/shared';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { FloatingSaveBar } from '@/components/settings/floating-save-bar';

// Simple Switch component using checkbox
function Switch({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

export default function SmsSettingsPage() {
  const t = useTranslations('settings.sms');
  const { toast } = useToast();
  const utils = api.useUtils();
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_SMS_TEMPLATE);
  const [sendTime, setSendTime] = useState(DEFAULT_SMS_SEND_TIME);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  // Load data
  const { data: settings, isLoading } = api.sms.getSettings.useQuery();

  // Save mutation
  const saveMutation = api.sms.updateSettings.useMutation({
    onSuccess: () => {
      toast({
        title: t('settingsSaved'),
        description: t('settingsSavedDescription'),
      });
      setHasChanges(false);
      void utils.sms.getSettings.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('saveError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Test SMS mutation
  const testSmsMutation = api.sms.sendTestSms.useMutation({
    onSuccess: () => {
      toast({
        title: t('testSms.success'),
        description: t('testSms.successDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('testSms.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled ?? false);
      setMessageTemplate(settings.messageTemplate || DEFAULT_SMS_TEMPLATE);
      setSendTime(settings.sendTime || DEFAULT_SMS_SEND_TIME);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const modified =
        enabled !== (settings.enabled ?? false) ||
        messageTemplate !== (settings.messageTemplate || DEFAULT_SMS_TEMPLATE) ||
        sendTime !== (settings.sendTime || DEFAULT_SMS_SEND_TIME);
      setHasChanges(modified);
    }
  }, [enabled, messageTemplate, sendTime, settings]);

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      enabled,
      messageTemplate: messageTemplate || null,
      sendTime: sendTime || null,
    });
  };

  const handleTestSms = async () => {
    if (!testPhoneNumber) {
      toast({
        title: t('testSms.error'),
        description: t('testSms.phoneNumberRequired'),
        variant: 'destructive',
      });
      return;
    }

    await testSmsMutation.mutateAsync({
      phoneNumber: testPhoneNumber,
    });
  };

  const handleCancel = () => {
    // Reset form to original values
    if (settings) {
      setEnabled(settings.enabled ?? false);
      setMessageTemplate(settings.messageTemplate || DEFAULT_SMS_TEMPLATE);
      setSendTime(settings.sendTime || DEFAULT_SMS_SEND_TIME);
    }
  };

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

  const isConfigured = settings?.isConfigured ?? false;

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={MessageSquare}
        titleKey="sms.title"
        descriptionKey="sms.subtitle"
      >
        <FloatingSaveBar
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={saveMutation.isPending}
          hasChanges={hasChanges}
          saveLabel={t('saveChanges')}
          savingLabel={t('saving')}
        />
      </SettingsPageHeader>

      {/* Twilio Not Configured Warning */}
      {!isConfigured && (
        <Card className="mb-6 border-warning bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <p className="text-sm text-warning-foreground">{t('notConfigured')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Cards */}
      <div className="space-y-6">
        {/* Global Enable */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>{t('globalEnabled')}</CardTitle>
            <CardDescription>{t('globalEnabledDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="globalEnabled">{t('globalEnabled')}</Label>
              <Switch
                id="globalEnabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={!isConfigured}
              />
            </div>
          </CardContent>
        </Card>

        {/* Message Template */}
        <Card className="animate-fade-in-up delay-100">
          <CardHeader>
            <CardTitle>{t('messageTemplate.title')}</CardTitle>
            <CardDescription>{t('messageTemplate.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="messageTemplate">{t('messageTemplate.label')}</Label>
              <textarea
                id="messageTemplate"
                value={messageTemplate}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setMessageTemplate(e.target.value)
                }
                placeholder={t('messageTemplate.placeholder')}
                rows={3}
                maxLength={160}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">{t('messageTemplate.hint')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('messageTemplate.charCount', { count: messageTemplate.length })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Send Time */}
        <Card className="animate-fade-in-up delay-200">
          <CardHeader>
            <CardTitle>{t('sendTime.title')}</CardTitle>
            <CardDescription>{t('sendTime.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sendTime">{t('sendTime.label')}</Label>
              <Input
                id="sendTime"
                type="time"
                value={sendTime}
                onChange={(e) => setSendTime(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">{t('sendTime.hint')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Test SMS */}
        <Card className="animate-fade-in-up delay-300">
          <CardHeader>
            <CardTitle>{t('testSms.title')}</CardTitle>
            <CardDescription>{t('testSms.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="testPhoneNumber">{t('testSms.phoneNumber')}</Label>
                <Input
                  id="testPhoneNumber"
                  type="tel"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder={t('testSms.phoneNumberPlaceholder')}
                />
              </div>
            </div>
            <Button
              onClick={handleTestSms}
              disabled={testSmsMutation.isPending || !isConfigured}
              variant="outline"
            >
              {testSmsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('testSms.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('testSms.send')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
