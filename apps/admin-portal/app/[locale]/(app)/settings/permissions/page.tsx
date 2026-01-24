'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Checkbox,
  Skeleton,
  useToast,
} from '@joho-erp/ui';
import { Shield, Save, RotateCcw, Info, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { PermissionGate } from '@/components/permission-gate';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';

export default function PermissionManagementPage() {
  const t = useTranslations('settings.permissions');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<string>('sales');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  // API queries
  const {
    data: matrix,
    isLoading,
    refetch,
  } = api.permission.getRolePermissionMatrix.useQuery(undefined, {
    staleTime: 60000,
  });

  // Mutations
  const updateMutation = api.permission.updateRolePermissions.useMutation({
    onSuccess: () => {
      toast({ title: t('saveSuccess'), variant: 'default' });
      setPendingChanges({});
      refetch();
    },
    onError: (error) => {
      console.error('Operation error:', error.message);
      toast({
        title: t('saveError'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  const resetMutation = api.permission.resetRoleToDefaults.useMutation({
    onSuccess: () => {
      toast({ title: t('resetSuccess'), variant: 'default' });
      setPendingChanges({});
      refetch();
    },
    onError: (error) => {
      console.error('Operation error:', error.message);
      toast({
        title: t('resetError'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Get current role's permissions as a Set for efficient lookup
  const currentRolePermissionSet = useMemo(() => {
    const permissions = matrix?.rolePermissions[selectedRole] ?? [];
    return new Set<string>(permissions);
  }, [matrix, selectedRole]);

  // Check if a permission is enabled (considering pending changes)
  const isPermissionEnabled = (permCode: string): boolean => {
    if (pendingChanges[permCode] !== undefined) {
      return pendingChanges[permCode];
    }
    return currentRolePermissionSet.has(permCode);
  };

  // Toggle a permission
  const handleToggle = (permCode: string) => {
    const isCurrentlyEnabled = currentRolePermissionSet.has(permCode);
    const pendingValue = pendingChanges[permCode];
    const newValue = pendingValue !== undefined ? !pendingValue : !isCurrentlyEnabled;

    setPendingChanges((prev) => ({
      ...prev,
      [permCode]: newValue,
    }));
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allPermissions = Object.values(matrix?.modules ?? {}).flat();
      const enabledPermissions = allPermissions
        .filter((p) => isPermissionEnabled(p.code))
        .map((p) => p.code);

      await updateMutation.mutateAsync({
        role: selectedRole as 'sales' | 'manager' | 'packer' | 'driver',
        permissions: enabledPermissions,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleResetToDefaults = async () => {
    setIsSaving(true);
    try {
      await resetMutation.mutateAsync({
        role: selectedRole as 'sales' | 'manager' | 'packer' | 'driver',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard pending changes
  const handleDiscardChanges = () => {
    setPendingChanges({});
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Access denied fallback
  const accessDeniedFallback = (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">{t('accessDenied.title')}</h1>
      <p className="text-muted-foreground max-w-md">
        {t('accessDenied.description')}
      </p>
    </div>
  );

  return (
    <PermissionGate permission="settings.users:edit" fallback={accessDeniedFallback}>
      <div className="container mx-auto px-4 py-6 md:py-10">
        <SettingsPageHeader
          icon={Shield}
          titleKey="permissions.title"
          descriptionKey="permissions.description"
        >
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleDiscardChanges} disabled={isSaving}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('discard')}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <span className="animate-spin mr-2">...</span>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('save')}
              </Button>
            </>
          )}
        </SettingsPageHeader>

      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('selectRole')}
          </CardTitle>
          <CardDescription>{t('selectRoleDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {matrix?.roles
              .filter((r) => r !== 'admin')
              .map((role) => (
                <Button
                  key={role}
                  variant={selectedRole === role ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedRole(role);
                    setPendingChanges({});
                  }}
                  className="capitalize"
                >
                  {t(`roles.${role}`)}
                </Button>
              ))}
          </div>
          <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
            <Info className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('adminNote')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Reset to Defaults */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium">{t('resetToDefaults')}</p>
            <p className="text-sm text-muted-foreground">{t('resetToDefaultsDescription')}</p>
          </div>
          <Button variant="outline" onClick={handleResetToDefaults} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('reset')}
          </Button>
        </CardContent>
      </Card>

      {/* Permission Matrix by Module */}
      {Object.entries(matrix?.modules ?? {}).map(([module, permissions]) => {
        const enabledCount = permissions.filter((p) => isPermissionEnabled(p.code)).length;

        return (
          <Card key={module}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize">
                    {t(`modules.${module}`, { defaultValue: module.replace('.', ' / ') })}
                  </CardTitle>
                  <CardDescription>
                    {enabledCount} / {permissions.length} {t('permissionsEnabled')}
                  </CardDescription>
                </div>
                <Badge variant={enabledCount === permissions.length ? 'default' : 'secondary'}>
                  {enabledCount === permissions.length ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      {t('fullAccess')}
                    </>
                  ) : enabledCount === 0 ? (
                    <>
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {t('noAccess')}
                    </>
                  ) : (
                    t('partialAccess')
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {permissions.map((perm) => {
                  const isEnabled = isPermissionEnabled(perm.code);
                  const hasChange = pendingChanges[perm.code] !== undefined;

                  return (
                    <div
                      key={perm.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        hasChange
                          ? 'border-primary bg-primary/5'
                          : isEnabled
                            ? 'border-border bg-background'
                            : 'border-border bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={() => handleToggle(perm.code)}
                        id={perm.code}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={perm.code}
                          className="font-medium cursor-pointer capitalize block"
                        >
                          {t(`actions.${perm.action}`, {
                            defaultValue: perm.action.replace('_', ' '),
                          })}
                        </label>
                        <p className="text-sm text-muted-foreground truncate">{perm.description}</p>
                        <code className="text-xs text-muted-foreground/70 mt-1 block">
                          {perm.code}
                        </code>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Floating save bar when there are changes */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm">
              <span className="font-medium">{Object.keys(pendingChanges).length}</span>{' '}
              {t('unsavedChanges')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDiscardChanges} disabled={isSaving}>
                {t('discard')}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PermissionGate>
  );
}
