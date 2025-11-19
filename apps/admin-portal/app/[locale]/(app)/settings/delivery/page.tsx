'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/trpc/client';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  Clock,
  Key,
  Search,
  Zap,
  Navigation2,
} from 'lucide-react';
import { useToast } from '@jimmy-beef/ui';

export default function DeliverySettingsPage() {
  const { toast } = useToast();

  // Form state
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('VIC');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState(-37.8136);
  const [longitude, setLongitude] = useState(144.9631);
  const [mapboxToken, setMapboxToken] = useState('');
  const [cutoffTime, setCutoffTime] = useState('14:00');
  const [deliveryWindow, setDeliveryWindow] = useState('9:00-17:00');

  // UI state
  const [addressSearch, setAddressSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [tokenTested, setTokenTested] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const mapRef = useRef<MapRef>(null);

  // Load existing settings
  const { data: settings, isLoading: loadingSettings } = api.company.getSettings.useQuery();

  // Mutations
  const saveSettingsMutation = api.company.updateDeliverySettings.useMutation();
  const testTokenMutation = api.company.testMapboxConnection.useMutation();
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
      if (ds.mapboxAccessToken) {
        setMapboxToken(ds.mapboxAccessToken);
        setTokenTested(true);
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
        mapboxToken !== (settings.deliverySettings.mapboxAccessToken || '') ||
        cutoffTime !== (settings.deliverySettings.orderCutoffTime || '14:00');
      setHasChanges(hasModifications);
    }
  }, [street, suburb, state, postcode, mapboxToken, cutoffTime, settings]);

  // Geocode search
  const handleSearch = async () => {
    if (!addressSearch.trim()) return;

    try {
      const result = await geocodeMutation.mutateAsync({
        address: addressSearch,
        accessToken: mapboxToken || undefined,
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

  // Test Mapbox token
  const handleTestToken = async () => {
    if (!mapboxToken.trim()) {
      toast({
        title: 'Token required',
        description: 'Please enter a Mapbox access token first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await testTokenMutation.mutateAsync({
        accessToken: mapboxToken,
      });

      if (result.success) {
        setTokenTested(true);
        toast({
          title: 'Connection successful',
          description: 'Mapbox API is accessible with this token',
        });
      }
    } catch (error) {
      setTokenTested(false);
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
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
        mapboxAccessToken: mapboxToken || undefined,
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Industrial Header */}
      <div className="border-b border-orange-500/30 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <Warehouse className="h-8 w-8 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-zinc-50 uppercase">
                    Delivery Configuration
                  </h1>
                  <p className="text-zinc-400 font-mono text-sm mt-1 tracking-wide">
                    Warehouse Location • Route Optimization • API Integration
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveSettingsMutation.isPending}
              className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all duration-200 flex items-center gap-2 ${
                hasChanges && !saveSettingsMutation.isPending
                  ? 'bg-orange-500 text-zinc-950 hover:bg-orange-400 shadow-lg shadow-orange-500/30'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {saveSettingsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Map */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-3">
                <Navigation2 className="h-5 w-5 text-orange-500" />
                <h2 className="font-black uppercase tracking-wide text-sm">Warehouse Location</h2>
                <div className="ml-auto text-xs font-mono text-zinc-500">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              </div>

              {/* Map */}
              <div className="h-[500px] relative">
                <Map
                  ref={mapRef}
                  longitude={longitude}
                  latitude={latitude}
                  zoom={13}
                  mapStyle="mapbox://styles/mapbox/dark-v11"
                  mapboxAccessToken={mapboxToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
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
                      <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/50 border-4 border-zinc-950">
                        <Warehouse className="h-6 w-6 text-zinc-950" />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-8 border-transparent border-t-orange-500"></div>
                    </div>
                  </Marker>
                </Map>
              </div>

              <div className="p-4 bg-zinc-900/30 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 font-mono">
                  💡 Click anywhere on the map to set warehouse location
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="space-y-6">
            {/* Address Search */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="h-5 w-5 text-orange-500" />
                <h3 className="font-black uppercase tracking-wide text-sm">Address Search</h3>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for warehouse address..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder:text-zinc-600 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={geocodeMutation.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-orange-500 text-zinc-950 rounded font-bold text-xs uppercase hover:bg-orange-400 transition-colors disabled:opacity-50"
                >
                  {geocodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </button>
              </div>

              {/* Search Results */}
              {showResults && searchResults.length > 0 && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectResult(result)}
                      className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-left transition-colors"
                    >
                      <p className="text-sm font-mono text-zinc-50">{result.address}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Address Entry */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5 text-orange-500" />
                <h3 className="font-black uppercase tracking-wide text-sm">Warehouse Address</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 Industrial Way"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder:text-zinc-600 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">
                      Suburb *
                    </label>
                    <input
                      type="text"
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                      placeholder="Melbourne"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder:text-zinc-600 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="3000"
                      maxLength={4}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder:text-zinc-600 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">
                    State *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
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
              </div>
            </div>

            {/* Mapbox API Token */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-5 w-5 text-orange-500" />
                <h3 className="font-black uppercase tracking-wide text-sm">Mapbox API Token</h3>
                {tokenTested && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="password"
                  value={mapboxToken}
                  onChange={(e) => {
                    setMapboxToken(e.target.value);
                    setTokenTested(false);
                  }}
                  placeholder="pk.eyJ1IjoieW91ciIsImEiOiJjbHh4eHh4eHh4In0..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder:text-zinc-600 font-mono text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />

                <button
                  onClick={handleTestToken}
                  disabled={testTokenMutation.isPending}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-orange-500 font-bold uppercase tracking-wide text-xs hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {testTokenMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </button>

                <p className="text-xs text-zinc-500">
                  Get your token from{' '}
                  <a
                    href="https://www.mapbox.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline"
                  >
                    mapbox.com
                  </a>
                </p>
              </div>
            </div>

            {/* Operations Settings */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-orange-500" />
                <h3 className="font-black uppercase tracking-wide text-sm">Operations</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">
                    Order Cut-off Time
                  </label>
                  <input
                    type="time"
                    value={cutoffTime}
                    onChange={(e) => setCutoffTime(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Orders placed after this time will be scheduled for next-day delivery
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">
                    Delivery Window
                  </label>
                  <input
                    type="text"
                    value={deliveryWindow}
                    onChange={(e) => setDeliveryWindow(e.target.value)}
                    placeholder="9:00-17:00"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder:text-zinc-600 font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-orange-500 text-zinc-950 px-6 py-3 rounded-lg shadow-2xl shadow-orange-500/50 flex items-center gap-3 font-bold animate-pulse">
          <AlertCircle className="h-5 w-5" />
          Unsaved changes
        </div>
      )}
    </div>
  );
}
