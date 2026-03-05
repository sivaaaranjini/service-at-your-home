import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Custom Car Icon SVG
const carIconSvg = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTkgMTloMVY1aC0xek01IDE5SDRWNWgxek05IDlobTZ2Mkg5ek05IDEzaDZ2Mkg5ek01IDNoMTRhMiAyIDAgMCAxIDIgMnYxNGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMlY1YTIgMiAwIDAgMSAyLTJ6Ii8+PC9zdmc+`;
// A better car SVG
const carIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png', // Premium car icon
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    shadowUrl: markerShadow,
    shadowSize: [41, 41],
});

// Component to dynamically recenter the map when coordinates change
const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng, map]);
    return null;
};

const LiveTrackingMap = ({ providerLocation, providerName = "Provider" }) => {
    // Default fallback to center of India if no GPS initialized yet
    const defaultPosition = [20.5937, 78.9629];
    const isLive = providerLocation && providerLocation.lat && providerLocation.lng;

    const position = isLive
        ? [providerLocation.lat, providerLocation.lng]
        : defaultPosition;

    return (
        <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative group z-0">
            {!isLive && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[400] flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-gray-800 font-semibold drop-shadow-md">Awaiting Live GPS Signal from {providerName}...</p>
                </div>
            )}
            <MapContainer
                center={position}
                zoom={isLive ? 16 : 5}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {isLive && (
                    <>
                        <RecenterMap lat={providerLocation.lat} lng={providerLocation.lng} />
                        <Marker position={position} icon={carIcon}>
                            <Popup>
                                <div className="font-bold text-blue-600">{providerName}</div>
                                <div className="text-xs text-gray-500">Currently En Route!</div>
                            </Popup>
                        </Marker>
                    </>
                )}
            </MapContainer>
        </div>
    );
};

export default LiveTrackingMap;
