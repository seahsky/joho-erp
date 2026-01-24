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
import { Bell, Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { FloatingSaveBar } from '@/components/settings/floating-save-bar';

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

export default function NotificationSettingsPage() {
  const t = useTranslations('settings.notifications');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();
  const utils = api.useUtils();
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [emailRecipients, setEmailRecipients] = useState('');
  const [orderNewOrder, setOrderNewOrder] = useState(true);
  const [orderConfirmed, setOrderConfirmed] = useState(true);
  const [orderDelivered, setOrderDelivered] = useState(true);
  const [inventoryLowStock, setInventoryLowStock] = useState(true);
  const [inventoryOutOfStock, setInventoryOutOfStock] = useState(true);
  const [customerNew, setCustomerNew] = useState(true);
  const [customerCreditApp, setCustomerCreditApp] = useState(true);
  const [customerCreditApproved, setCustomerCreditApproved] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [testEmail, setTestEmail] = useState('');

  // Load data
  const { data: settings, isLoading } = api.notification.getSettings.useQuery();

  // Save mutation
  const saveMutation = api.notification.updateSettings.useMutation({
    onSuccess: () => {
      toast({
        title: t('settingsSaved'),
        description: t('settingsSavedDescription'),
      });
      setHasChanges(false);
      void utils.notification.getSettings.invalidate();
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

  // Test email mutation
  const testEmailMutation = api.notification.sendTestEmail.useMutation({
    onSuccess: () => {
      toast({
        title: t('testEmailSent'),
        description: t('testEmailSentDescription'),
      });
    },
    onError: (error) => {
      console.error('Operation error:', error.message);
      toast({
        title: t('testEmailError'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setEmailRecipients(settings.emailRecipients?.join(', ') || '');
      setOrderNewOrder(settings.orderNotifications?.newOrder ?? true);
      setOrderConfirmed(settings.orderNotifications?.orderConfirmed ?? true);
      setOrderDelivered(settings.orderNotifications?.orderDelivered ?? true);
      setInventoryLowStock(settings.inventoryNotifications?.lowStock ?? true);
      setInventoryOutOfStock(settings.inventoryNotifications?.outOfStock ?? true);
      setCustomerNew(settings.customerNotifications?.newCustomer ?? true);
      setCustomerCreditApp(settings.customerNotifications?.creditApplication ?? true);
      setCustomerCreditApproved(settings.customerNotifications?.creditApproved ?? true);
      setQuietHoursEnabled(settings.quietHoursEnabled ?? false);
      setQuietHoursStart(settings.quietHoursStart || '22:00');
      setQuietHoursEnd(settings.quietHoursEnd || '08:00');
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const currentRecipients = settings.emailRecipients?.join(', ') || '';
      const modified =
        emailRecipients !== currentRecipients ||
        orderNewOrder !== (settings.orderNotifications?.newOrder ?? true) ||
        orderConfirmed !== (settings.orderNotifications?.orderConfirmed ?? true) ||
        orderDelivered !== (settings.orderNotifications?.orderDelivered ?? true) ||
        inventoryLowStock !== (settings.inventoryNotifications?.lowStock ?? true) ||
        inventoryOutOfStock !== (settings.inventoryNotifications?.outOfStock ?? true) ||
        customerNew !== (settings.customerNotifications?.newCustomer ?? true) ||
        customerCreditApp !== (settings.customerNotifications?.creditApplication ?? true) ||
        customerCreditApproved !== (settings.customerNotifications?.creditApproved ?? true) ||
        quietHoursEnabled !== (settings.quietHoursEnabled ?? false) ||
        quietHoursStart !== (settings.quietHoursStart || '22:00') ||
        quietHoursEnd !== (settings.quietHoursEnd || '08:00');
      setHasChanges(modified);
    }
  }, [emailRecipients, orderNewOrder, orderConfirmed, orderDelivered, inventoryLowStock, inventoryOutOfStock, customerNew, customerCreditApp, customerCreditApproved, quietHoursEnabled, quietHoursStart, quietHoursEnd, settings]);

  const handleSave = async () => {
    // Parse email recipients
    const recipients = emailRecipients
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    await saveMutation.mutateAsync({
      emailRecipients: recipients,
      orderNotifications: {
        newOrder: orderNewOrder,
        orderConfirmed: orderConfirmed,
        orderDelivered: orderDelivered,
      },
      inventoryNotifications: {
        lowStock: inventoryLowStock,
        outOfStock: inventoryOutOfStock,
      },
      customerNotifications: {
        newCustomer: customerNew,
        creditApplication: customerCreditApp,
        creditApproved: customerCreditApproved,
      },
      quietHoursEnabled,
      quietHoursStart: quietHoursEnabled ? quietHoursStart : null,
      quietHoursEnd: quietHoursEnabled ? quietHoursEnd : null,
    });
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: t('testEmailError'),
        description: t('testEmailRequired'),
        variant: 'destructive',
      });
      return;
    }

    await testEmailMutation.mutateAsync({
      recipient: testEmail,
    });
  };

  const handleCancel = () => {
    // Reset form to original values
    if (settings) {
      setEmailRecipients(settings.emailRecipients?.join(', ') || '');
      setOrderNewOrder(settings.orderNotifications?.newOrder ?? true);
      setOrderConfirmed(settings.orderNotifications?.orderConfirmed ?? true);
      setOrderDelivered(settings.orderNotifications?.orderDelivered ?? true);
      setInventoryLowStock(settings.inventoryNotifications?.lowStock ?? true);
      setInventoryOutOfStock(settings.inventoryNotifications?.outOfStock ?? true);
      setCustomerNew(settings.customerNotifications?.newCustomer ?? true);
      setCustomerCreditApp(settings.customerNotifications?.creditApplication ?? true);
      setCustomerCreditApproved(settings.customerNotifications?.creditApproved ?? true);
      setQuietHoursEnabled(settings.quietHoursEnabled ?? false);
      setQuietHoursStart(settings.quietHoursStart || '22:00');
      setQuietHoursEnd(settings.quietHoursEnd || '08:00');
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

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={Bell}
        titleKey="notifications.title"
        descriptionKey="notifications.subtitle"
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

      {/* Content Cards */}
      <div className="space-y-6">
        {/* Order Notifications */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>{t('orderNotifications.title')}</CardTitle>
            <CardDescription>{t('orderNotifications.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="orderNewOrder">{t('orderNotifications.newOrder')}</Label>
              <Switch
                id="orderNewOrder"
                checked={orderNewOrder}
                onCheckedChange={setOrderNewOrder}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="orderConfirmed">{t('orderNotifications.orderConfirmed')}</Label>
              <Switch
                id="orderConfirmed"
                checked={orderConfirmed}
                onCheckedChange={setOrderConfirmed}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="orderDelivered">{t('orderNotifications.orderDelivered')}</Label>
              <Switch
                id="orderDelivered"
                checked={orderDelivered}
                onCheckedChange={setOrderDelivered}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Notifications */}
        <Card className="animate-fade-in-up delay-100">
          <CardHeader>
            <CardTitle>{t('inventoryNotifications.title')}</CardTitle>
            <CardDescription>{t('inventoryNotifications.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="inventoryLowStock">{t('inventoryNotifications.lowStock')}</Label>
              <Switch
                id="inventoryLowStock"
                checked={inventoryLowStock}
                onCheckedChange={setInventoryLowStock}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="inventoryOutOfStock">{t('inventoryNotifications.outOfStock')}</Label>
              <Switch
                id="inventoryOutOfStock"
                checked={inventoryOutOfStock}
                onCheckedChange={setInventoryOutOfStock}
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer Notifications */}
        <Card className="animate-fade-in-up delay-200">
          <CardHeader>
            <CardTitle>{t('customerNotifications.title')}</CardTitle>
            <CardDescription>{t('customerNotifications.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="customerNew">{t('customerNotifications.newCustomer')}</Label>
              <Switch
                id="customerNew"
                checked={customerNew}
                onCheckedChange={setCustomerNew}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="customerCreditApp">{t('customerNotifications.creditApplication')}</Label>
              <Switch
                id="customerCreditApp"
                checked={customerCreditApp}
                onCheckedChange={setCustomerCreditApp}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="customerCreditApproved">{t('customerNotifications.creditApproved')}</Label>
              <Switch
                id="customerCreditApproved"
                checked={customerCreditApproved}
                onCheckedChange={setCustomerCreditApproved}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Recipients */}
        <Card className="animate-fade-in-up delay-300">
          <CardHeader>
            <CardTitle>{t('recipients.title')}</CardTitle>
            <CardDescription>{t('recipients.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailRecipients">{t('recipients.emails')}</Label>
              <textarea
                id="emailRecipients"
                value={emailRecipients}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmailRecipients(e.target.value)}
                placeholder={t('recipients.placeholder')}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
              />
              <p className="text-xs text-muted-foreground">{t('recipients.hint')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card className="animate-fade-in-up delay-400">
          <CardHeader>
            <CardTitle>{t('quietHours.title')}</CardTitle>
            <CardDescription>{t('quietHours.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quietHoursEnabled">{t('quietHours.enable')}</Label>
              <Switch
                id="quietHoursEnabled"
                checked={quietHoursEnabled}
                onCheckedChange={setQuietHoursEnabled}
              />
            </div>
            {quietHoursEnabled && (
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="quietHoursStart">{t('quietHours.startTime')}</Label>
                  <Input
                    id="quietHoursStart"
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quietHoursEnd">{t('quietHours.endTime')}</Label>
                  <Input
                    id="quietHoursEnd"
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Notification */}
        <Card className="animate-fade-in-up delay-500">
          <CardHeader>
            <CardTitle>{t('testNotification.title')}</CardTitle>
            <CardDescription>{t('testNotification.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="testEmail">{t('testNotification.email')}</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={t('testNotification.placeholder')}
                />
              </div>
            </div>
            <Button
              onClick={handleTestEmail}
              disabled={testEmailMutation.isPending}
              variant="outline"
            >
              {testEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('testNotification.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('testNotification.send')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
