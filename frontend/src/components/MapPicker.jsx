import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { Navigation } from 'lucide-react';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ mapCenter }) {
  const map = useMap();

  useEffect(() => {
    if (mapCenter) {
      map.setView(mapCenter, 15);
    }
  }, [mapCenter, map]);

  return null;
}

function LocationMarker({ position, setPosition, initialPosition }) {
  const [markerPosition, setMarkerPosition] = useState(position || initialPosition);

  useMapEvents({
    click(e) {
      const newPos = [e.latlng.lat, e.latlng.lng];
      setMarkerPosition(newPos);
      setPosition(newPos);
    },
  });

  return markerPosition === null ? null : (
    <Marker position={markerPosition}>
      <Popup>
        Selected Location<br />
        Lat: {markerPosition[0].toFixed(6)}<br />
        Lng: {markerPosition[1].toFixed(6)}
      </Popup>
    </Marker>
  );
}

export function MapPicker({ onLocationSelect, initialLocation, className }) {
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Center of India
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Track if we've initialized to prevent calling callback on mount
  const hasInitialized = useRef(false);
  const prevPositionRef = useRef(null);

  // Helper function to compare coordinates
  const areCoordinatesEqual = (coords1, coords2) => {
    if (!coords1 || !coords2) return false;
    const lat1 = Array.isArray(coords1) ? coords1[0] : coords1.lat;
    const lng1 = Array.isArray(coords1) ? coords1[1] : coords1.lng;
    const lat2 = Array.isArray(coords2) ? coords2[0] : coords2.lat;
    const lng2 = Array.isArray(coords2) ? coords2[1] : coords2.lng;
    return lat1 === lat2 && lng1 === lng2;
  };

  // Initialize position from initialLocation only once on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    
    let coords = null;
    
    if (initialLocation && Array.isArray(initialLocation) && initialLocation.length === 2) {
      coords = initialLocation;
    } else if (initialLocation && initialLocation.lat && initialLocation.lng) {
      coords = [initialLocation.lat, initialLocation.lng];
    }
    
    if (coords) {
      setPosition(coords);
      setMapCenter(coords);
      prevPositionRef.current = coords;
      hasInitialized.current = true;
    } else {
      // Try to get user's current location only if no initial location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newCoords = [pos.coords.latitude, pos.coords.longitude];
            setPosition(newCoords);
            setMapCenter(newCoords);
            prevPositionRef.current = newCoords;
            hasInitialized.current = true;
          },
          (err) => {
            console.log('Geolocation error:', err);
            hasInitialized.current = true;
            // Keep default center
          }
        );
      } else {
        hasInitialized.current = true;
      }
    }
  }, []); // Empty dependency array - run only once on mount

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setPosition(coords);
          setMapCenter(coords);
          setIsGettingLocation(false);
        },
        (err) => {
          console.log('Geolocation error:', err);
          setIsGettingLocation(false);
          alert('Unable to get your current location. Please check your browser settings.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      setIsGettingLocation(false);
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Call the callback only when position changes from user interaction
  // and only if it's actually different from the previous position
  useEffect(() => {
    // Skip if not initialized yet
    if (!hasInitialized.current) return;
    
    // Skip if position hasn't actually changed
    if (areCoordinatesEqual(position, prevPositionRef.current)) return;
    
    // Update previous position
    prevPositionRef.current = position;
    
    // Call the callback
    if (position && onLocationSelect) {
      onLocationSelect({
        lat: position[0],
        lng: position[1]
      });
    }
  }, [position, onLocationSelect]);

  return (
    <div className={className}>
      <div className="mb-2 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Click on the map to select your location
        </div>
        <Button
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <Navigation className="h-3 w-3" />
          {isGettingLocation ? 'Getting Location...' : 'Current Location'}
        </Button>
      </div>
      <div className="h-64 w-full border rounded-lg overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={position}
            setPosition={setPosition}
            initialPosition={initialLocation}
          />
          <MapController mapCenter={mapCenter} />
        </MapContainer>
      </div>
      {position && (
        <div className="mt-2 text-sm text-gray-700">
          Selected coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
      )}
    </div>
  );
}

export default MapPicker;