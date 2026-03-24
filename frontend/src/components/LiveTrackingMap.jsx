import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// A better car SVG
const carIcon = typeof window !== 'undefined' ? new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png', // Premium car icon
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    shadowUrl: markerShadow,
    shadowSize: [41, 41],
}) : null;

const houseIcon = typeof window !== 'undefined' ? new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/5973/5973800.png', // House icon
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    shadowUrl: markerShadow,
    shadowSize: [41, 41],
}) : null;

// Component to dynamically recenter the map when coordinates change
const RecenterMap = ({ providerLoc, customerLoc, userRole }) => {
    const map = useMap();
    useEffect(() => {
        // For Provider: Center on the Customer (Destination)
        // For Customer/Admin: Center on the Provider (Moving target)
        const target = userRole === 'provider' ? customerLoc : providerLoc;
        if (target && target.lat && target.lng) {
            console.log(`[MAP] Recentering to Target (${userRole}):`, target);
            map.flyTo([target.lat, target.lng], 16, { animate: true, duration: 1.5 });
        } else if (providerLoc && providerLoc.lat && providerLoc.lng) {
             // Fallback to provider if customer location isn't available yet
             map.flyTo([providerLoc.lat, providerLoc.lng], 16, { animate: true, duration: 1.5 });
        }
    }, [providerLoc, customerLoc, userRole, map]);
    return null;
};

const LiveTrackingMap = ({ providerLocation, customerLocation, providerName = "Provider", userRole }) => {
    // Default fallback to center of India if no GPS initialized yet
    const defaultPosition = [20.5937, 78.9629];
    const isProviderLive = !!(providerLocation && providerLocation.lat && providerLocation.lng);
    const isCustomerLive = !!(customerLocation && customerLocation.lat && customerLocation.lng);

    const position = isProviderLive
        ? [providerLocation.lat, providerLocation.lng]
        : isCustomerLive ? [customerLocation.lat, customerLocation.lng] : defaultPosition;

    if (typeof window === 'undefined') return null;

    return (
        <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative group z-0">
            {!isProviderLive && !isCustomerLive && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-gray-800 font-semibold drop-shadow-md">Awaiting Live GPS Signal...</p>
                </div>
            )}
            <MapContainer
                center={position}
                zoom={(isProviderLive || isCustomerLive) ? 16 : 5}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RecenterMap providerLoc={providerLocation} customerLoc={customerLocation} userRole={userRole} />
                
                {isProviderLive && (
                    <>
                        <Circle center={[providerLocation.lat, providerLocation.lng]} radius={100} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }} />
                        <Marker position={[providerLocation.lat, providerLocation.lng]} icon={carIcon || undefined}>
                            <Popup>
                                <div className="font-bold text-blue-600">{providerName}</div>
                                <div className="text-xs text-gray-500 font-semibold italic">📍 Tracking Live...</div>
                            </Popup>
                        </Marker>
                    </>
                )}

                {isCustomerLive && (
                    <Marker position={[customerLocation.lat, customerLocation.lng]} icon={houseIcon || undefined}>
                        <Popup>
                            <div className="font-bold text-indigo-600">Service Destination</div>
                            <div className="text-xs text-gray-500">Customer is waiting here</div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};

export default LiveTrackingMap;
