'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { formatCentsForInput, parseToCents } from '@joho-erp/shared';
import {
  MapPin,
  Loader2,
  Warehouse,
  Clock,
  Search,
  Navigation2,
} from 'lucide-react';
import type { DeliverySettingsMapHandle } from './delivery-settings-map';

const DeliverySettingsMap = dynamic(() => import('./delivery-settings-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/50">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { FloatingSaveBar } from '@/components/settings/floating-save-bar';
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

/** Geocode search result from Mapbox API */
interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  relevance: number;
}

export default function DeliverySettingsPage() {
  const t = useTranslations('settings.delivery');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const utils = api.useUtils();

  // Form state
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('VIC');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState(-37.8136);
  const [longitude, setLongitude] = useState(144.9631);
  const [cutoffTime, setCutoffTime] = useState('14:00');
  const [deliveryWindow, setDeliveryWindow] = useState('9:00-17:00');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('');

  // UI state
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const mapRef = useRef<DeliverySettingsMapHandle>(null);

  // Load existing settings
  const { data: settings, isLoading: loadingSettings } = api.company.getSettings.useQuery();

  // Mutations
  const saveSettingsMutation = api.company.updateDeliverySettings.useMutation();
  const geocodeMutation = api.company.geocodeAddress.useMutation();

  // Load settings into form
  useEffect(() => {
    if (settings?.deliverySettings) {
      const ds = settings.deliverySettings;
      if (ds.warehouseAddress) {
        setStreet(ds.warehouseAddress.street);
        setSuburb(ds.warehouseAddress.suburb);
        setState(ds.warehouseAddress.state);
        setPostcode(ds.warehouseAddress.postcode);
        setLatitude(ds.warehouseAddress.latitude);
        setLongitude(ds.warehouseAddress.longitude);
      }
      if (ds.orderCutoffTime) {
        setCutoffTime(ds.orderCutoffTime);
      }
      if (ds.defaultDeliveryWindow) {
        setDeliveryWindow(ds.defaultDeliveryWindow);
      }
      if (ds.minimumOrderAmount !== null && ds.minimumOrderAmount !== undefined) {
        setMinimumOrderAmount(formatCentsForInput(ds.minimumOrderAmount));
      }
    }
  }, [settings]);

  // Track changes - always compare against saved values or defaults
  useEffect(() => {
    // Get the values to compare against (saved values or defaults)
    const savedStreet = settings?.deliverySettings?.warehouseAddress?.street || '';
    const savedSuburb = settings?.deliverySettings?.warehouseAddress?.suburb || '';
    const savedState = settings?.deliverySettings?.warehouseAddress?.state || 'VIC';
    const savedPostcode = settings?.deliverySettings?.warehouseAddress?.postcode || '';
    const savedLatitude = settings?.deliverySettings?.warehouseAddress?.latitude ?? -37.8136;
    const savedLongitude = settings?.deliverySettings?.warehouseAddress?.longitude ?? 144.9631;
    const savedCutoffTime = settings?.deliverySettings?.orderCutoffTime || '14:00';
    const savedDeliveryWindow = settings?.deliverySettings?.defaultDeliveryWindow || '9:00-17:00';
    const savedMinimumOrder = settings?.deliverySettings?.minimumOrderAmount ?? null;

    // Convert current input to cents for comparison
    const currentMinimumCents = minimumOrderAmount ? parseToCents(minimumOrderAmount) : null;

    // Compare current form values against saved/default values
    const hasModifications =
      street !== savedStreet ||
      suburb !== savedSuburb ||
      state !== savedState ||
      postcode !== savedPostcode ||
      latitude !== savedLatitude ||
      longitude !== savedLongitude ||
      cutoffTime !== savedCutoffTime ||
      deliveryWindow !== savedDeliveryWindow ||
      currentMinimumCents !== savedMinimumOrder;

    setHasChanges(hasModifications);
  }, [street, suburb, state, postcode, latitude, longitude, cutoffTime, deliveryWindow, minimumOrderAmount, settings]);

  // Geocode search
  const handleSearch = async () => {
    if (!addressSearch.trim()) return;

    try {
      const result = await geocodeMutation.mutateAsync({
        address: addressSearch,
      });

      if (result.success && result.results) {
        setSearchResults(result.results);
        setShowResults(true);
      }
    } catch (error) {
      toast({
        title: t('geocodingFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive',
      });
    }
  };

  // Select geocoded result
  const selectResult = (result: GeocodeResult) => {
    const parts = result.address.split(',');
    setStreet(parts[0]?.trim() || '');
    setSuburb(parts[1]?.trim() || '');
    setPostcode(parts[2]?.trim().split(' ')[1] || '');
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setShowResults(false);
    setAddressSearch('');

    // Fly map to location
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [result.longitude, result.latitude],
        zoom: 15,
        duration: 1500,
      });
    }
  };

  // Save settings
  const handleSave = async () => {
    if (!street || !suburb || !state || !postcode) {
      toast({
        title: t('validationError'),
        description: t('fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    // Parse and validate minimum order amount
    const minimumOrderCents = minimumOrderAmount ? parseToCents(minimumOrderAmount) : null;
    if (minimumOrderAmount && minimumOrderCents === null) {
      toast({
        title: t('validationError'),
        description: t('invalidMinimumOrderAmount'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveSettingsMutation.mutateAsync({
        warehouseAddress: {
          street,
          suburb,
          state,
          postcode,
          country: 'Australia',
          latitude,
          longitude,
        },
        orderCutoffTime: cutoffTime,
        defaultDeliveryWindow: deliveryWindow || undefined,
        minimumOrderAmount: minimumOrderCents || undefined,
      });

      toast({
        title: t('settingsSaved'),
        description: t('settingsSavedDescription'),
      });

      setHasChanges(false);
      void utils.company.getSettings.invalidate();
      // Also invalidate delivery queries so the delivery page gets updated warehouse location
      void utils.delivery.getOptimizedRoute.invalidate();
    } catch (error) {
      toast({
        title: t('saveFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (settings?.deliverySettings) {
      const ds = settings.deliverySettings;
      if (ds.warehouseAddress) {
        setStreet(ds.warehouseAddress.street);
        setSuburb(ds.warehouseAddress.suburb);
        setState(ds.warehouseAddress.state);
        setPostcode(ds.warehouseAddress.postcode);
        setLatitude(ds.warehouseAddress.latitude);
        setLongitude(ds.warehouseAddress.longitude);
      }
      if (ds.orderCutoffTime) {
        setCutoffTime(ds.orderCutoffTime);
      }
      if (ds.defaultDeliveryWindow) {
        setDeliveryWindow(ds.defaultDeliveryWindow);
      }
      if (ds.minimumOrderAmount !== null && ds.minimumOrderAmount !== undefined) {
        setMinimumOrderAmount(formatCentsForInput(ds.minimumOrderAmount));
      } else {
        setMinimumOrderAmount('');
      }
    }
  };

  if (loadingSettings) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={Warehouse}
        titleKey="delivery.title"
        descriptionKey="delivery.subtitle"
      >
        <FloatingSaveBar
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={saveSettingsMutation.isPending}
          hasChanges={hasChanges}
          saveLabel={t('saveChanges')}
          savingLabel={t('saving')}
        />
      </SettingsPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Map */}
        <div className="space-y-6">
          <Card className="animate-fade-in-up">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{t('warehouseLocation')}</CardTitle>
                </div>
                <div className="text-xs text-muted-foreground">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Map */}
              <div className="h-[500px] relative">
                <DeliverySettingsMap
                  ref={mapRef}
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              </div>

              <div className="p-4 bg-muted/50 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 {t('clickMap')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="space-y-6">
          {/* Address Search */}
          <Card className="animate-fade-in-up">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('addressSearch')}</CardTitle>
              </div>
              <CardDescription>{t('searchDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={t('searchPlaceholder')}
                />
                <Button
                  onClick={handleSearch}
                  disabled={geocodeMutation.isPending}
                  variant="outline"
                >
                  {geocodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    tCommon('search')
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {showResults && searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectResult(result)}
                      className="w-full p-3 bg-muted hover:bg-muted/80 border rounded-lg text-left transition-colors"
                    >
                      <p className="text-sm font-medium">{result.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Address Entry */}
          <Card className="animate-fade-in-up delay-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('warehouseAddress')}</CardTitle>
              </div>
              <CardDescription>{t('manualEntryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">{t('streetAddress')} *</Label>
                <Input
                  id="street"
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={t('streetPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suburb">{t('suburb')} *</Label>
                  <Input
                    id="suburb"
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder={t('suburbPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postcode">{t('postcode')} *</Label>
                  <Input
                    id="postcode"
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder={t('postcodePlaceholder')}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">{t('state')} *</Label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="VIC">{t('states.VIC')}</option>
                  <option value="NSW">{t('states.NSW')}</option>
                  <option value="QLD">{t('states.QLD')}</option>
                  <option value="SA">{t('states.SA')}</option>
                  <option value="WA">{t('states.WA')}</option>
                  <option value="TAS">{t('states.TAS')}</option>
                  <option value="NT">{t('states.NT')}</option>
                  <option value="ACT">{t('states.ACT')}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Operations Settings */}
          <Card className="animate-fade-in-up delay-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('operations')}</CardTitle>
              </div>
              <CardDescription>{t('operationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cutoffTime">{t('orderCutoffTime')}</Label>
                <Input
                  id="cutoffTime"
                  type="time"
                  value={cutoffTime}
                  onChange={(e) => setCutoffTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('cutoffDescription')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryWindow">{t('deliveryWindow')}</Label>
                <Input
                  id="deliveryWindow"
                  type="text"
                  value={deliveryWindow}
                  onChange={(e) => setDeliveryWindow(e.target.value)}
                  placeholder={t('deliveryWindowPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimumOrderAmount">{t('minimumOrderAmount')}</Label>
                <Input
                  id="minimumOrderAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={minimumOrderAmount}
                  onChange={(e) => setMinimumOrderAmount(e.target.value)}
                  placeholder={t('minimumOrderPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('minimumOrderDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
