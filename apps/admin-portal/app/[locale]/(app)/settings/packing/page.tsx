'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  useToast,
} from '@joho-erp/ui';
import { Package, Lock, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { FloatingSaveBar } from '@/components/settings/floating-save-bar';

// Simple Switch component using checkbox styling
function Switch({
  id,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-input'
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function PackingSettingsPage() {
  const t = useTranslations('settings.packing');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();
  const utils = api.useUtils();

  // PIN state
  const [pinEnabled, setPinEnabled] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPinConfigured, setInitialPinConfigured] = useState(false);

  // Load settings
  const { data: settings, isLoading } = api.company.getPackingSettings.useQuery();

  // Mutation
  const updatePinMutation = api.company.updatePackingPin.useMutation({
    onSuccess: () => {
      toast({
        title: t('pinUpdated'),
        description: t('pinUpdatedDescription'),
      });
      setNewPin('');
      setConfirmPin('');
      setHasChanges(false);
      setInitialPinConfigured(pinEnabled);
      void utils.company.getPackingSettings.invalidate();
    },
    onError: (error) => {
      console.error('Operation error:', error.message);
      toast({
        title: t('errorUpdatingPin'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Initialize from server
  useEffect(() => {
    if (settings) {
      setPinEnabled(settings.pinConfigured);
      setInitialPinConfigured(settings.pinConfigured);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    const hasNewPin = newPin.length === 4 && confirmPin.length === 4;

    // Has changes if:
    // - Enabling PIN and has valid new PIN input
    // - Disabling PIN (removing it)
    // - Already had PIN and entering new PIN (changing it)
    if (pinEnabled && !initialPinConfigured && hasNewPin) {
      setHasChanges(true);
    } else if (!pinEnabled && initialPinConfigured) {
      setHasChanges(true);
    } else if (pinEnabled && initialPinConfigured && hasNewPin) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [pinEnabled, newPin, confirmPin, initialPinConfigured]);

  const handleSave = async () => {
    if (pinEnabled) {
      // Validate PIN
      if (!/^\d{4}$/.test(newPin)) {
        toast({
          title: t('validation.invalidPin'),
          variant: 'destructive',
        });
        return;
      }

      if (newPin !== confirmPin) {
        toast({
          title: t('validation.pinMismatch'),
          variant: 'destructive',
        });
        return;
      }

      await updatePinMutation.mutateAsync({ pin: newPin });
    } else {
      await updatePinMutation.mutateAsync({ removePin: true });
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (settings) {
      setPinEnabled(settings.pinConfigured);
      setNewPin('');
      setConfirmPin('');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={Package}
        titleKey="packing.title"
        descriptionKey="packing.subtitle"
      >
        <FloatingSaveBar
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={updatePinMutation.isPending}
          hasChanges={hasChanges}
          saveLabel={t('saveChanges')}
          savingLabel={t('saving')}
        />
      </SettingsPageHeader>

      {/* PIN Security Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>{t('pinSecurity.title')}</CardTitle>
          </div>
          <CardDescription>{t('pinSecurity.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable PIN */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('pinSecurity.enablePin')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('pinSecurity.enablePinDescription')}
              </p>
            </div>
            <Switch
              checked={pinEnabled}
              onCheckedChange={(checked) => {
                setPinEnabled(checked);
                if (!checked) {
                  setNewPin('');
                  setConfirmPin('');
                }
              }}
            />
          </div>

          {/* PIN Entry */}
          {pinEnabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="newPin">{t('pinSecurity.newPin')}</Label>
                <Input
                  id="newPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="****"
                  className="max-w-[200px]"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPin">{t('pinSecurity.confirmPin')}</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="****"
                  className="max-w-[200px]"
                  autoComplete="off"
                />
              </div>

              {initialPinConfigured && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>{t('pinSecurity.currentPinSet')}</span>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          {pinEnabled && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{t('pinSecurity.warning')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
