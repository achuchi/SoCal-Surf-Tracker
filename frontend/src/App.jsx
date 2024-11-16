import React, { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState({});
  const [countdown, setCountdown] = useState(300);

  const fetchBuoyData = async (buoyId) => {
    setIsLoading(prev => ({ ...prev, [buoyId]: true }));
    setErrors(prev => ({ ...prev, [buoyId]: null }));

    try {
      const locationMap = {
        'scripps': 'Scripps',
        'torrey-pines': 'Torrey_Pines',
        'del-mar': 'Del_Mar',
        'imperial-beach': 'Imperial_Beach'
      };
      
      const backendLocation = locationMap[buoyId];
      const response = await fetch(`http://localhost:8000/api/buoys/${backendLocation}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setBuoyData(prev => ({
        ...prev,
        [buoyId]: {
          waveHeight: data.current.wave_height,
          wavePeriod: data.current.wave_period,
          waterTemp: data.current.water_temp
        }
      }));
      
      setLastUpdated(prev => ({
        ...prev,
        [buoyId]: new Date().toLocaleTimeString()
      }));

    } catch (error) {
      console.error('Error fetching buoy data:', error);
      setErrors(prev => ({
        ...prev,
        [buoyId]: 'Failed to load buoy data'
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, [buoyId]: false }));
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (selectedBuoy) {
      fetchBuoyData(selectedBuoy.id);
      const intervalId = setInterval(() => {
        fetchBuoyData(selectedBuoy.id);
      }, 5 * 60 * 1000);

      return () => clearInterval(intervalId);
    }
  }, [selectedBuoy]);

  // Countdown effect
  useEffect(() => {
    if (selectedBuoy) {
      const countdownInterval = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 300);
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [selectedBuoy, lastUpdated]);

  return (
    <div className="w-screen h-screen relative">
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
              setCountdown(300); // Reset countdown on new selection
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
              
              {isLoading[selectedBuoy.id] ? (
                <div className="flex items-center justify-center p-4 space-x-2">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  <span className="text-gray-500">Loading data...</span>
                </div>
              ) : errors[selectedBuoy.id] ? (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-red-500 text-sm">{errors[selectedBuoy.id]}</p>
                  <button 
                    onClick={() => fetchBuoyData(selectedBuoy.id)}
                    className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                  >
                    Try again
                  </button>
                </div>
              ) : buoyData[selectedBuoy.id] ? (
                <>
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
                  <div className="mt-4 text-xs text-gray-500">
                    <p>Last updated: {lastUpdated[selectedBuoy.id]}</p>
                    <p>Next update in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</p>
                    <button 
                      onClick={() => {
                        fetchBuoyData(selectedBuoy.id);
                        setCountdown(300);
                      }}
                      className="mt-1 text-blue-500 hover:text-blue-600"
                    >
                      Refresh now
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 italic">No data available</p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default App;