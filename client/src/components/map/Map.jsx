import { MapContainer, TileLayer } from "react-leaflet";
import "./map.scss";
import "leaflet/dist/leaflet.css";
import Pin from "../pin/Pin";
import L from 'leaflet';

// Fix for missing marker icons in production
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

function Map({ items }) {
  // Default center coordinates (India center as fallback)
  const defaultCenter = [20.5937, 78.9629];
  
  // If no items, return empty state
  if (!items || items.length === 0) {
    return (
      <div className="mapEmptyState">
        <h3>No locations to display</h3>
        <p>Properties will appear on the map when found.</p>
      </div>
    );
  }
  
  // Find first valid coordinates or use default
  const getMapCenter = () => {
    const validItem = items.find(item => 
      item.latitude && item.longitude && 
      !isNaN(parseFloat(item.latitude)) && 
      !isNaN(parseFloat(item.longitude))
    );
    
    if (validItem) {
      return [parseFloat(validItem.latitude), parseFloat(validItem.longitude)];
    }
    
    return defaultCenter;
  };
  
  // Filter items with valid coordinates
  const validItems = items.filter(item => 
    item.latitude && item.longitude && 
    !isNaN(parseFloat(item.latitude)) && 
    !isNaN(parseFloat(item.longitude))
  );

  return (
    <MapContainer
      center={getMapCenter()}
      zoom={items.length === 1 ? 12 : 7}
      scrollWheelZoom={false}
      className="map"
      key={`map-${items.length}-${items.map(i => i.id).join('-')}`} // Force re-render when items change
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validItems.map((item) => (
        <Pin item={item} key={item.id} />
      ))}
    </MapContainer>
  );
}

export default Map;
