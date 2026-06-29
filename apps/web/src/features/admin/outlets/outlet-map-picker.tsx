import { Link, MapPin, Search, X } from 'lucide-react';
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

const defaultCenter: L.LatLngExpression = [-2.548926, 118.0148634];

const outletMarkerIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:999px;background:var(--admin-accent,#d9580c);border:4px solid #fff;box-shadow:0 10px 24px rgba(15,23,42,.28);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function toValidCoordinate(latitude: number | null | undefined, longitude: number | null | undefined): [number, number] | null {
  const valid = (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
  return valid ? [latitude, longitude] : null;
}

/**
 * Parse Google Maps URL and extract latitude/longitude.
 *
 * Supported URL formats:
 * 1. @lat,lng — e.g. https://www.google.com/maps/@-7.499463,112.498679,17z
 * 2. /place/.../@lat,lng — e.g. https://www.google.com/maps/place/.../@-7.499463,112.498679,17z
 * 3. ?q=lat,lng — e.g. https://maps.google.com/?q=-7.499463,112.498679
 * 4. ll=lat,lng — e.g. https://maps.google.com/?ll=-7.499463,112.498679
 * 5. !3d lat !4d lng — e.g. embedded in data= parameters
 */
export function parseGoogleMapsUrl(input: string): { latitude: number; longitude: number } | null {
  const s = input.trim();

  // Must contain google.com/maps or maps.google
  if (!s.includes('google.com/maps') && !s.includes('maps.google')) return null;

  // Priority 1: Exact Place Pin (!3dlat...!4dlng) embedded in Google Maps place data
  const dataPinPattern = /!3d(-?\d+\.?\d*).*?!4d(-?\d+\.?\d*)/;
  const dataPinMatch = dataPinPattern.exec(s);
  if (dataPinMatch) {
    const lat = parseFloat(dataPinMatch[1]);
    const lng = parseFloat(dataPinMatch[2]);
    if (toValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Priority 2: Query pin (?q=lat,lng or &q=lat,lng)
  const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const qMatch = qPattern.exec(s);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (toValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Priority 3: Location parameter (ll=lat,lng)
  const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const llMatch = llPattern.exec(s);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (toValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Priority 4: Fallback to Viewport / Camera Center (@lat,lng)
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = atPattern.exec(s);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (toValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}

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
  const [gmapsUrlInput, setGmapsUrlInput] = useState('');
  const [gmapsUrlError, setGmapsUrlError] = useState('');
  const [gmapsUrlSuccess, setGmapsUrlSuccess] = useState('');
  const [showGmapsPanel, setShowGmapsPanel] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const coordinate = toValidCoordinate(latitude, longitude);
    const map = L.map(mapElementRef.current, {
      center: coordinate ?? defaultCenter,
      zoom: coordinate ? 16 : 5,
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
    const coordinate = toValidCoordinate(latitude, longitude);
    if (!map || !coordinate) return;

    const position: L.LatLngExpression = coordinate;
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
      if (!results.length) setSearchError('Alamat tidak ditemukan. Coba paste link Google Maps di bawah.');
    } catch (error) {
      if (searchRequestRef.current !== requestId) return;
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : 'Gagal mencari alamat. Coba paste link Google Maps di bawah.');
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

  /** Apply a pasted Google Maps URL — extract lat/lng and move the map marker. */
  function applyGmapsUrl() {
    const parsed = parseGoogleMapsUrl(gmapsUrlInput);
    if (!parsed) {
      setGmapsUrlError('URL tidak dikenali. Pastikan Anda menempelkan link dari Google Maps (share → copy link).');
      setGmapsUrlSuccess('');
      return;
    }
    setGmapsUrlError('');
    setGmapsUrlSuccess(`Berhasil! Koordinat: ${parsed.latitude.toFixed(6)}, ${parsed.longitude.toFixed(6)}`);
    onChangeRef.current({ latitude: parsed.latitude, longitude: parsed.longitude });
  }

  /** Handle paste event directly in the URL input — immediately try to parse. */
  function handleGmapsUrlPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text');
    const parsed = parseGoogleMapsUrl(pasted);
    if (parsed) {
      setGmapsUrlError('');
      setGmapsUrlSuccess(`Berhasil! Koordinat: ${parsed.latitude.toFixed(6)}, ${parsed.longitude.toFixed(6)}`);
      setGmapsUrlInput(pasted);
      onChangeRef.current({ latitude: parsed.latitude, longitude: parsed.longitude });
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="text-xs font-semibold text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="admin-btn-ghost"
            type="button"
            title="Tempel link dari Google Maps untuk otomatis mengisi koordinat"
            onClick={() => {
              setShowGmapsPanel((v) => !v);
              setGmapsUrlError('');
              setGmapsUrlSuccess('');
            }}
          >
            <Link size={13} className="mr-1 inline" />
            Dari Google Maps
          </button>
          <button className="admin-btn-ghost" type="button" onClick={useCurrentLocation}>
            Pakai Lokasi Saya
          </button>
        </div>
      </div>

      {/* ── Google Maps URL panel ─────────────────────────────── */}
      {showGmapsPanel ? (
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="mb-1 text-xs font-bold text-blue-800">Tempel Link Google Maps</p>
          <p className="mb-2 text-xs text-blue-600">
            Buka Google Maps → cari lokasi → klik <strong>Bagikan</strong> → <strong>Salin Link</strong>, lalu tempel di bawah ini.
            <br />
            Koordinat akan otomatis terisi saat Anda menempel (Ctrl+V / paste).
          </p>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="https://maps.google.com/maps/place/.../@-7.499463,112.498679,17z/..."
              value={gmapsUrlInput}
              onChange={(e) => {
                setGmapsUrlInput(e.target.value);
                setGmapsUrlError('');
                setGmapsUrlSuccess('');
              }}
              onPaste={handleGmapsUrlPaste}
            />
            <button
              type="button"
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!gmapsUrlInput.trim()}
              onClick={applyGmapsUrl}
            >
              Terapkan
            </button>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-500 hover:bg-slate-100"
              onClick={() => {
                setShowGmapsPanel(false);
                setGmapsUrlInput('');
                setGmapsUrlError('');
                setGmapsUrlSuccess('');
              }}
              title="Tutup"
            >
              <X size={13} />
            </button>
          </div>
          {gmapsUrlError ? (
            <p className="mt-2 text-xs font-semibold text-red-600">{gmapsUrlError}</p>
          ) : null}
          {gmapsUrlSuccess ? (
            <p className="mt-2 text-xs font-semibold text-green-700">{gmapsUrlSuccess}</p>
          ) : null}
        </div>
      ) : null}

      {/* ── Normal search panel ───────────────────────────────── */}
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
          {searchError ? (
            <div className="mt-1">
              <p className="admin-map-search-error">{searchError}</p>
              {!showGmapsPanel ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-blue-600 underline hover:text-blue-800"
                  onClick={() => setShowGmapsPanel(true)}
                >
                  <Link size={11} className="mr-1 inline" />
                  Coba tempel link Google Maps sebagai alternatif
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Leaflet map ───────────────────────────────────────── */}
      <div ref={mapElementRef} className="z-5 h-80 overflow-hidden rounded-xl border border-slate-200 bg-white" />

      {/* Coordinate display hint */}
      {toValidCoordinate(latitude, longitude) ? (
        <p className="mt-1 text-right text-xs text-slate-400">
          <MapPin size={10} className="mr-0.5 inline" />
          {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
        </p>
      ) : null}
    </div>
  );
}
