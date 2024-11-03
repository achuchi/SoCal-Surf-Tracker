import React, { useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const BUOY_LOCATIONS = [
  {
    id: 'scripps',
    name: 'Scripps',
    latitude: 32.8669,
    longitude: -117.2571,
    color: '#FF4B4B'
  },
  {
    id: 'torrey-pines',
    name: 'Torrey Pines',
    latitude: 32.9337,
    longitude: -117.2795,
    color: '#4B9EFF'
  },
  {
    id: 'del-mar',
    name: 'Del Mar',
    latitude: 32.9595,
    longitude: -117.2801,
    color: '#4BFF4B'
  },
  {
    id: 'imperial-beach',
    name: 'Imperial Beach',
    latitude: 32.5797,
    longitude: -117.1347,
    color: '#FFB74B'
  }
];

const App = () => {
  const [selectedBuoy, setSelectedBuoy] = useState(null);
  const [buoyData, setBuoyData] = useState({});

  const fetchBuoyData = async (buoyId) => {
    try {
      const response = await fetch(`http://localhost:8000/buoy/${buoyId}`);
      const data = await response.json();
      setBuoyData(prev => ({
        ...prev,
        [buoyId]: data
      }));
    } catch (error) {
      console.error('Error fetching buoy data:', error);
    }
  };

  return (
    <div className="w-screen h-screen relative">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 rounded-lg shadow-lg p-4">
        <h1 className="text-2xl font-bold text-gray-800">
          San Diego Surf Report
        </h1>
      </div>

      <Map
        initialViewState={{
          latitude: 32.8669,
          longitude: -117.2571,
          zoom: 10
        }}
        className="w-full h-full"
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      >
        {BUOY_LOCATIONS.map(buoy => (
          <Marker
            key={buoy.id}
            latitude={buoy.latitude}
            longitude={buoy.longitude}
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedBuoy(buoy);
              fetchBuoyData(buoy.id);
            }}
          >
            <div 
              className="cursor-pointer transform transition-transform duration-150 hover:scale-110"
              style={{ color: buoy.color }}
            >
              📍
            </div>
          </Marker>
        ))}

        {selectedBuoy && (
          <Popup
            latitude={selectedBuoy.latitude}
            longitude={selectedBuoy.longitude}
            onClose={() => setSelectedBuoy(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="p-3">
              <h3 className="font-bold text-lg mb-2 text-gray-800">
                {selectedBuoy.name}
              </h3>
              {buoyData[selectedBuoy.id] ? (
                <div className="space-y-2">
                  <p className="text-gray-700">
                    Wave Height: {buoyData[selectedBuoy.id].waveHeight}ft
                  </p>
                  <p className="text-gray-700">
                    Wave Period: {buoyData[selectedBuoy.id].wavePeriod}s
                  </p>
                  <p className="text-gray-700">
                    Water Temp: {buoyData[selectedBuoy.id].waterTemp}°F
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Loading buoy data...
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default App;