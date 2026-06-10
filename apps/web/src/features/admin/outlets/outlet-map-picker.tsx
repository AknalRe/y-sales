import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapSearchOption = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string | null;
  provider?: 'photon' | 'nominatim' | 'builtin_scraper' | 'google_places' | 'custom_http';
};

type OutletMapPickerProps = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (position: { latitude: number; longitude: number; address?: string }) => void;
  onSearch?: (query: string) => Promise<MapSearchOption[]>;
  title?: string;
  description?: string;
};

const defaultCenter: L.LatLngExpression = [-6.2, 106.816666];

const outletMarkerIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:999px;background:var(--admin-accent,#d9580c);border:4px solid #fff;box-shadow:0 10px 24px rgba(15,23,42,.28);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function OutletMapPicker({
  latitude,
  longitude,
  onChange,
  onSearch,
  title = 'Pilih Titik Outlet',
  description = 'Klik peta atau geser marker untuk mengisi koordinat.',
}: OutletMapPickerProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const searchRequestRef = useRef(0);
  const selectedSearchAddressRef = useRef('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchOption[]>([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const hasCoordinate = typeof latitude === 'number' && typeof longitude === 'number';
    const map = L.map(mapElementRef.current, {
      center: hasCoordinate ? [latitude, longitude] : defaultCenter,
      zoom: hasCoordinate ? 16 : 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (event) => {
      onChangeRef.current({
        latitude: Number(event.latlng.lat.toFixed(7)),
        longitude: Number(event.latlng.lng.toFixed(7)),
      });
    });

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof latitude !== 'number' || typeof longitude !== 'number') return;

    const position: L.LatLngExpression = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { draggable: true, icon: outletMarkerIcon }).addTo(map);
      markerRef.current.on('dragend', () => {
        const next = markerRef.current?.getLatLng();
        if (!next) return;
        onChangeRef.current({
          latitude: Number(next.lat.toFixed(7)),
          longitude: Number(next.lng.toFixed(7)),
        });
      });
    } else {
      markerRef.current.setLatLng(position);
    }

    map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
  }, [latitude, longitude]);

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      onChangeRef.current({
        latitude: Number(position.coords.latitude.toFixed(7)),
        longitude: Number(position.coords.longitude.toFixed(7)),
      });
    });
  }

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!onSearch || query.length < 3) return;
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setSearching(true);
    setSearchError('');
    try {
      const results = await onSearch(query);
      if (searchRequestRef.current !== requestId) return;
      setSearchResults(results);
      if (!results.length) setSearchError('Alamat tidak ditemukan.');
    } catch (error) {
      if (searchRequestRef.current !== requestId) return;
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : 'Gagal mencari alamat.');
    } finally {
      if (searchRequestRef.current === requestId) setSearching(false);
    }
  }

  useEffect(() => {
    const query = searchQuery.trim();
    if (!onSearch || query.length < 3) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    if (selectedSearchAddressRef.current === query) return;

    const timeout = window.setTimeout(() => {
      void handleSearch();
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, onSearch]);

  function selectSearchResult(result: MapSearchOption) {
    selectedSearchAddressRef.current = result.address;
    setSearchQuery(result.address);
    setSearchResults([]);
    setSearchError('');
    onChangeRef.current({
      latitude: Number(result.latitude.toFixed(7)),
      longitude: Number(result.longitude.toFixed(7)),
      address: result.address,
    });
  }

  function clearSearch() {
    selectedSearchAddressRef.current = '';
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="text-xs font-semibold text-slate-500">{description}</p>
        </div>
        <button className="admin-btn-ghost" type="button" onClick={useCurrentLocation}>
          Pakai Lokasi Saya
        </button>
      </div>
      {onSearch ? (
        <div className="mb-3">
          <div className="admin-map-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="Cari alamat, tempat, jalan, atau area..."
            />
            {searchQuery ? (
              <button type="button" onClick={clearSearch} title="Bersihkan pencarian">
                <X size={14} />
              </button>
            ) : null}
            <button type="button" className="admin-map-search-submit" onClick={() => void handleSearch()} disabled={searching || searchQuery.trim().length < 3}>
              {searching ? 'Mencari...' : 'Cari'}
            </button>
          </div>
          {searchResults.length ? (
            <div className="admin-map-search-results">
              {searchResults.map((result) => (
                <button key={result.id} type="button" onClick={() => selectSearchResult(result)}>
                  <span className="admin-map-search-result-main">
                    <strong>{result.address.split(',')[0]}</strong>
                  </span>
                  <span className="admin-map-search-result-address">{result.address}</span>
                  <span className="admin-map-search-result-meta">
                    {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                    {result.provider ? ` - ${result.provider}` : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {searchError ? <p className="admin-map-search-error">{searchError}</p> : null}
        </div>
      ) : null}
      <div ref={mapElementRef} className="h-80 overflow-hidden rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
