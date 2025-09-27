import { useState, useRef, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const MapComponent = ({ onLocationSelect, initialLocation }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);

    // Default to Mumbai coordinates if no initial location
    const defaultLocation = initialLocation || { lat: 19.0760, lng: 72.8777 };

    // Create marker
    const newMarker = new google.maps.Marker({
      position: defaultLocation,
      map: mapInstance,
      draggable: true,
      title: 'Selected Location'
    });

    setMarker(newMarker);

    // Add click listener to map
    mapInstance.addListener('click', (event) => {
      const clickedLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };

      newMarker.setPosition(clickedLocation);
      onLocationSelect(clickedLocation);
    });

    // Add drag listener to marker
    newMarker.addListener('dragend', (event) => {
      const draggedLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      onLocationSelect(draggedLocation);
    });

    // Center map on location
    mapInstance.setCenter(defaultLocation);
    mapInstance.setZoom(15);

    // Call onLocationSelect with initial location
    onLocationSelect(defaultLocation);
  }, [onLocationSelect, initialLocation]);

  const onUnmount = useCallback(() => {
    setMap(null);
    if (marker) {
      marker.setMap(null);
    }
  }, [marker]);

  return (
    <div ref={mapRef} style={{ height: '300px', width: '100%' }} />
  );
};

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return <div className="flex items-center justify-center h-64">Loading map...</div>;
    case Status.FAILURE:
      return <div className="flex items-center justify-center h-64 text-red-500">Failed to load map</div>;
    case Status.SUCCESS:
      return <MapComponent />;
  }
};

export function MapPicker({ onLocationSelect, initialLocation, className }) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    onLocationSelect(location);
  };

  const handleManualInput = (field, value) => {
    const newLocation = {
      ...selectedLocation,
      [field]: parseFloat(value)
    };
    setSelectedLocation(newLocation);
    onLocationSelect(newLocation);
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`p-4 border rounded-lg bg-gray-50 ${className}`}>
        <p className="text-sm text-gray-600 mb-2">
          Map integration requires Google Maps API key. Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              value={selectedLocation?.lat || ''}
              onChange={(e) => handleManualInput('lat', e.target.value)}
              placeholder="-90 to 90"
            />
          </div>
          <div>
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="any"
              value={selectedLocation?.lng || ''}
              onChange={(e) => handleManualInput('lng', e.target.value)}
              placeholder="-180 to 180"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border rounded-lg overflow-hidden">
        <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
          <MapComponent onLocationSelect={handleLocationSelect} initialLocation={initialLocation} />
        </Wrapper>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            type="number"
            step="any"
            value={selectedLocation?.lat || ''}
            onChange={(e) => handleManualInput('lat', e.target.value)}
            placeholder="-90 to 90"
          />
        </div>
        <div>
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            type="number"
            step="any"
            value={selectedLocation?.lng || ''}
            onChange={(e) => handleManualInput('lng', e.target.value)}
            placeholder="-180 to 180"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <MapPin className="h-4 w-4" />
        <span>Click on the map or drag the marker to select your location</span>
      </div>
    </div>
  );
}