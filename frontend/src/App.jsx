import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import WaveTrendsChart from './components/WaveTrendsChart';
import TempTrendsChart from './components/TempTrendsChart';

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

const TEMP_TRENDS_QUERY = `
  query TempTrends($location: String!, $interval: TimeInterval!, $hoursBack: Int) {
    tempTrends(location: $location, interval: $interval, hoursBack: $hoursBack) {
      current {
        waterTemp
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
          stdDeviation
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

const [waveTrendData, setWaveTrendData] = useState({});
const [tempTrendData, setTempTrendData] = useState({});

const [loadingProgress, setLoadingProgress] = useState(0);
const [mapReady, setMapReady] = useState(false);


// Fetch function:
const fetchTrendData = async (location) => {
  try {
    console.log("Fetching trend data for:", location);
    
    // Convert location ID to the correct format for GraphQL
    const locationMap = {
      'scripps': 'Scripps',
      'torrey-pines': 'Torrey_Pines',
      'del-mar': 'Del_Mar',
      'imperial-beach': 'Imperial_Beach'
    };

    const graphqlLocation = locationMap[location];
    console.log("Using GraphQL location:", graphqlLocation);

    const waveBody = {
      query: WAVE_TRENDS_QUERY,
      variables: {
        location: graphqlLocation,
        interval: "HOURLY",
        hoursBack: 24
      }
    };

    const tempBody = {
      query: TEMP_TRENDS_QUERY,
      variables: {
        location: graphqlLocation,
        interval: "HOURLY",
        hoursBack: 24
      }
    };

    console.log("Wave request body:", waveBody);
    console.log("Temp request body:", tempBody);

    const [waveResponse, tempResponse] = await Promise.all([
      fetch('http://localhost:8000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waveBody)
      }),
      fetch('http://localhost:8000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempBody)
      })
    ]);

    const [waveData, tempData] = await Promise.all([
      waveResponse.json(),
      tempResponse.json()
    ]);

    console.log("Full wave response:", JSON.stringify(waveData, null, 2));
    console.log("Full temp response:", JSON.stringify(tempData, null, 2));

    if (waveData?.data?.waveTrends) {
      console.log("Setting wave trend data for:", location);
      setWaveTrendData(prev => ({
        ...prev,
        [location]: waveData.data.waveTrends
      }));
    } else {
      console.log("No wave trends data in response", waveData);
    }
    
    if (tempData?.data?.tempTrends) {
      console.log("Setting temp trend data for:", location);
      setTempTrendData(prev => ({
        ...prev,
        [location]: tempData.data.tempTrends
      }));
    } else {
      console.log("No temp trends data in response", tempData);
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

  const LoadingScreen = ({ progress, onComplete }) => {
    useEffect(() => {
      const timer = setInterval(() => {
        if (progress < 100) {
          onComplete(prev => Math.min(prev + 2, 100));
        }
      }, 50);
  
      return () => clearInterval(timer);
    }, [progress, onComplete]);
  
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-sky-100 to-blue-200 z-50 flex flex-col items-center justify-center transition-opacity duration-500"
        style={{ 
          opacity: progress === 100 ? 0 : 1, 
          pointerEvents: progress === 100 ? 'none' : 'auto' 
        }}
      >
        <h1 className="text-4xl font-bold text-sky-900 mb-2">The Wave Report @ SD</h1>
        <div className="w-64 h-2 bg-white/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-sky-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Loading screen overlay */}
      <div 
        className="fixed inset-0 z-50 bg-white transition-opacity duration-500"
        style={{ 
          opacity: mapReady ? 0 : 1,
          pointerEvents: mapReady ? 'none' : 'auto'
        }}
      >
        <div className="h-full flex flex-col items-center justify-center space-y-4">
          {/* Logo */}
          <svg className="w-24 h-24 mb-2" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="#0EA5E9" />
            <path d="M20 55 Q35 45, 50 55 T80 55" 
                  fill="none" 
                  stroke="white" 
                  stroke-width="4"
                  stroke-linecap="round" />
            <path d="M50 25 L60 45 L50 40 L40 45 Z" 
                  fill="white" />
            <path d="M25 65 Q40 55, 55 65 T85 65" 
                  fill="none" 
                  stroke="white" 
                  stroke-width="3"
                  stroke-linecap="round" />
          </svg>

          {/* Text */}
          <h1 className="text-4xl font-bold text-gray-900">The Wave Report</h1>
          <p className="text-gray-600 mb-8">by AA</p>

          {/* Loading bar */}
          <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      </div>
  
      {/* Main app content */}
      <div className="w-screen h-screen relative">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          className="w-full h-full"
          mapStyle="mapbox://styles/mapbox/outdoors-v12"
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
          onLoad={() => {
            setTimeout(() => {
              setLoadingProgress(100);
              setTimeout(() => setMapReady(true), 500);
            }, 500);
          }}
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
              anchor="top"
              offset={15}
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
                      <TabsTrigger value="current" className="w-1/3">Current</TabsTrigger>
                      <TabsTrigger value="wave-trends" className="w-1/3">Wave Trends</TabsTrigger>
                      <TabsTrigger value="temp-trends" className="w-1/3">Temp Trends</TabsTrigger>
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
  
                    <TabsContent value="wave-trends">
                      {waveTrendData[selectedBuoy.id] ? (
                        <WaveTrendsChart data={waveTrendData[selectedBuoy.id]} />
                      ) : (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin h-5 w-5 border-2 border-sky-500 rounded-full border-t-transparent"></div>
                          <span className="ml-2 text-slate-600">Loading trends...</span>
                        </div>
                      )}
                    </TabsContent>
  
                    <TabsContent value="temp-trends">
                      {tempTrendData[selectedBuoy.id] ? (
                        <TempTrendsChart data={tempTrendData[selectedBuoy.id]} />
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
    </>
  );
}

export default App;

