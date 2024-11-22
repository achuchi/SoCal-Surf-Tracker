import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import WaveTrendsChart from './components/WaveTrendsChart';

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

// GraphQL query for wave trends
const WAVE_TRENDS_QUERY = `
  query WaveTrends($location: String!, $interval: TimeInterval!, $hoursBack: Int) {
    waveTrends(location: $location, interval: $interval, hoursBack: $hoursBack) {
      current {
        waveHeight
        timestamp
      }
      timeSeries {
        interval
        dataPoints {
          timestamp
          value
        }
        statistics {
          minimum
          maximum
          average
        }
        trend {
          trendDirection
          changePercentage
          confidenceScore
        }
      }
    }
  }
`;

const App = () => {
  const [selectedBuoy, setSelectedBuoy] = useState(null);
  const [buoyData, setBuoyData] = useState({});
  const [trendData, setTrendData] = useState({});
  const [isLoading, setIsLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState({});
  const [countdown, setCountdown] = useState(300);
  const [viewState, setViewState] = useState({
    latitude: 32.8669,
    longitude: -117.2571,
    zoom: 10
  });

  const fetchTrendData = async (buoyId) => {
    try {
      const locationMap = {
        'scripps': 'Scripps',
        'torrey-pines': 'Torrey_Pines',
        'del-mar': 'Del_Mar',
        'imperial-beach': 'Imperial_Beach'
      };
      
      const response = await fetch('http://localhost:8000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: WAVE_TRENDS_QUERY,
          variables: {
            location: locationMap[buoyId],
            interval: "HOURLY",
            hoursBack: 24
          }
        })
      });
      
      const result = await response.json();
      
      // Add error checking for the GraphQL response
      if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        return;
      }
  
      // Only set the data if we have a valid response
      if (result.data && result.data.waveTrends) {
        setTrendData(prev => ({
          ...prev,
          [buoyId]: result.data.waveTrends
        }));
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

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
      
      // Fetch both current conditions and trend data
      const [currentResponse, ] = await Promise.all([
        fetch(`http://localhost:8000/api/buoys/${backendLocation}`),
        fetchTrendData(buoyId)
      ]);
      
      if (!currentResponse.ok) {
        throw new Error(`HTTP error! status: ${currentResponse.status}`);
      }
      
      const data = await currentResponse.json();
      
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
          The Wave Report @ SD
        </h1>
      </div>

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
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
              setCountdown(300);
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
          anchor="top"  // Changed to "top"
          offset={15}   // Added offset
       >
            <div className="p-4 w-[450px] max-w-[95vw]">
              <div className="flex justify-between items-start mb-4 px-1">
                <h3 className="font-bold text-lg text-slate-700">
                  {selectedBuoy.name}
                </h3>
                <div style={{ color: selectedBuoy.color }} className="text-xl">
                  📍
                </div>
              </div>

              {isLoading[selectedBuoy.id] ? (
                <div className="flex items-center justify-center p-4 space-x-2">
                  <div className="animate-spin h-5 w-5 border-2 border-sky-500 rounded-full border-t-transparent"></div>
                  <span className="text-slate-600">Loading data...</span>
                </div>
              ) : errors[selectedBuoy.id] ? (
                <div className="p-4 bg-red-50 rounded-lg mx-1">
                  <p className="text-red-500 text-sm">{errors[selectedBuoy.id]}</p>
                  <button 
                    onClick={() => fetchBuoyData(selectedBuoy.id)}
                    className="mt-2 text-sm text-sky-500 hover:text-sky-600"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <Tabs defaultValue="current" className="w-full">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="current" className="w-1/2">Current</TabsTrigger>
                    <TabsTrigger value="trends" className="w-1/2">Trends</TabsTrigger>
                  </TabsList>

                  <TabsContent value="current">
                    <div className="grid grid-cols-2 gap-3 px-1">
                      <div className="bg-cyan-50 p-3 rounded-lg border border-sky-100">
                        <p className="text-sm text-slate-600">Wave Height</p>
                        <p className="text-xl font-bold text-slate-700">
                          {buoyData[selectedBuoy.id]?.waveHeight}
                          <span className="text-sm font-normal ml-1">ft</span>
                        </p>
                      </div>
                      <div className="bg-cyan-50 p-3 rounded-lg border border-sky-100">
                        <p className="text-sm text-slate-600">Wave Period</p>
                        <p className="text-xl font-bold text-slate-700">
                          {buoyData[selectedBuoy.id]?.wavePeriod}
                          <span className="text-sm font-normal ml-1">s</span>
                        </p>
                      </div>
                      <div className="col-span-2 bg-cyan-50 p-3 rounded-lg border border-sky-100">
                        <p className="text-sm text-slate-600">Water Temperature</p>
                        <p className="text-xl font-bold text-slate-700">
                          {buoyData[selectedBuoy.id]?.waterTemp}
                          <span className="text-sm font-normal ml-1">°F</span>
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trends">
                    {trendData[selectedBuoy.id] ? (
                      <WaveTrendsChart data={trendData[selectedBuoy.id]} />
                    ) : (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin h-5 w-5 border-2 border-sky-500 rounded-full border-t-transparent"></div>
                        <span className="ml-2 text-slate-600">Loading trends...</span>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}

              <div className="mt-4 pt-3 border-t border-sky-100 px-1">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <div>
                    <p>Last updated: {lastUpdated[selectedBuoy.id]}</p>
                    <p>Next update in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</p>
                  </div>
                  <button 
                    onClick={() => {
                      fetchBuoyData(selectedBuoy.id);
                      setCountdown(300);
                    }}
                    className="px-3 py-1 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
                  >
                    Refresh now
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        )}

        <div className="absolute bottom-4 right-4 z-10 bg-sky-50 rounded-lg shadow-lg p-4 border border-sky-100">
          <h3 className="font-bold text-slate-700 mb-2">Buoy Locations</h3>
          {BUOY_LOCATIONS.map(buoy => (
            <div 
              key={buoy.id} 
              className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-sky-100 p-2 rounded transition-colors"
              onClick={() => {
                setSelectedBuoy(buoy);
                setCountdown(300);
                fetchBuoyData(buoy.id);
                setViewState({
                  ...viewState,
                  latitude: buoy.latitude,
                  longitude: buoy.longitude,
                  zoom: 12,
                  transitionDuration: 1000,
                  transitionEasing: t => t * (2 - t)
                });
              }}
            >
              <div style={{ color: buoy.color }}>📍</div>
              <span className="text-sm text-slate-600">{buoy.name}</span>
            </div>
          ))}
        </div>
      </Map>
    </div>
  );
};

export default App;