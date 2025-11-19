'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/trpc/client';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin,
  Save,
  Loader2,
  Warehouse,
  Clock,
  Search,
  Navigation2,
} from 'lucide-react';
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
} from '@jimmy-beef/ui';

export default function DeliverySettingsPage() {
  const { toast } = useToast();

  // Form state
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('VIC');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState(-37.8136);
  const [longitude, setLongitude] = useState(144.9631);
  const [cutoffTime, setCutoffTime] = useState('14:00');
  const [deliveryWindow, setDeliveryWindow] = useState('9:00-17:00');

  // UI state
  const [addressSearch, setAddressSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const mapRef = useRef<MapRef>(null);

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
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings?.deliverySettings) {
      const hasModifications =
        street !== (settings.deliverySettings.warehouseAddress?.street || '') ||
        suburb !== (settings.deliverySettings.warehouseAddress?.suburb || '') ||
        state !== (settings.deliverySettings.warehouseAddress?.state || '') ||
        postcode !== (settings.deliverySettings.warehouseAddress?.postcode || '') ||
        cutoffTime !== (settings.deliverySettings.orderCutoffTime || '14:00');
      setHasChanges(hasModifications);
    }
  }, [street, suburb, state, postcode, cutoffTime, settings]);

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
        title: 'Geocoding failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Select geocoded result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectResult = (result: any) => {
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
        title: 'Validation error',
        description: 'Please fill in all required address fields',
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
      });

      toast({
        title: 'Settings saved',
        description: 'Delivery settings updated successfully',
      });

      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (loadingSettings) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Warehouse className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-2xl md:text-4xl font-bold">Delivery Configuration</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Configure warehouse location, routes, and delivery windows
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveSettingsMutation.isPending}
          className="transition-all"
        >
          {saveSettingsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Map */}
        <div className="space-y-6">
          <Card className="animate-fade-in-up">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Warehouse Location</CardTitle>
                </div>
                <div className="text-xs text-muted-foreground">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Map */}
              <div className="h-[500px] relative">
                <Map
                  ref={mapRef}
                  longitude={longitude}
                  latitude={latitude}
                  zoom={13}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
                  style={{ width: '100%', height: '100%' }}
                  onClick={(e) => {
                    setLatitude(e.lngLat.lat);
                    setLongitude(e.lngLat.lng);
                  }}
                >
                  <NavigationControl position="top-right" />

                  {/* Warehouse Marker */}
                  <Marker longitude={longitude} latitude={latitude} anchor="bottom">
                    <div className="relative animate-bounce">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-background">
                        <Warehouse className="h-6 w-6 text-primary-foreground" />
                      </div>
                    </div>
                  </Marker>
                </Map>
              </div>

              <div className="p-4 bg-muted/50 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 Click anywhere on the map to set warehouse location
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
                <CardTitle className="text-base">Address Search</CardTitle>
              </div>
              <CardDescription>Search for warehouse address using Mapbox</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for warehouse address..."
                />
                <Button
                  onClick={handleSearch}
                  disabled={geocodeMutation.isPending}
                  variant="outline"
                >
                  {geocodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Search'
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
                <CardTitle className="text-base">Warehouse Address</CardTitle>
              </div>
              <CardDescription>Enter warehouse address manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Industrial Way"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb *</Label>
                  <Input
                    id="suburb"
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="Melbourne"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="3000"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="VIC">Victoria</option>
                  <option value="NSW">New South Wales</option>
                  <option value="QLD">Queensland</option>
                  <option value="SA">South Australia</option>
                  <option value="WA">Western Australia</option>
                  <option value="TAS">Tasmania</option>
                  <option value="NT">Northern Territory</option>
                  <option value="ACT">Australian Capital Territory</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Operations Settings */}
          <Card className="animate-fade-in-up delay-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Operations</CardTitle>
              </div>
              <CardDescription>Configure delivery windows and cutoff times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cutoffTime">Order Cut-off Time</Label>
                <Input
                  id="cutoffTime"
                  type="time"
                  value={cutoffTime}
                  onChange={(e) => setCutoffTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Orders placed after this time will be scheduled for next-day delivery
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryWindow">Delivery Window</Label>
                <Input
                  id="deliveryWindow"
                  type="text"
                  value={deliveryWindow}
                  onChange={(e) => setDeliveryWindow(e.target.value)}
                  placeholder="9:00-17:00"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unsaved Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-warning text-warning-foreground px-6 py-3 rounded-lg shadow-lg animate-fade-in-up">
          Unsaved changes
        </div>
      )}
    </div>
  );
}
