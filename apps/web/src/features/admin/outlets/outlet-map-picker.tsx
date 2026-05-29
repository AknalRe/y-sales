import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type OutletMapPickerProps = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (position: { latitude: number; longitude: number }) => void;
};

const defaultCenter: L.LatLngExpression = [-6.2, 106.816666];

const outletMarkerIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:999px;background:var(--admin-accent,#d9580c);border:4px solid #fff;box-shadow:0 10px 24px rgba(15,23,42,.28);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function OutletMapPicker({ latitude, longitude, onChange }: OutletMapPickerProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-900">Pilih Titik Outlet</p>
          <p className="text-xs font-semibold text-slate-500">Klik peta atau geser marker untuk mengisi koordinat.</p>
        </div>
        <button className="admin-btn-ghost" type="button" onClick={useCurrentLocation}>
          Pakai Lokasi Saya
        </button>
      </div>
      <div ref={mapElementRef} className="h-80 overflow-hidden rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
