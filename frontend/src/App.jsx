import React from 'react';
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        initialViewState={{
          latitude: 32.8669,  // Centered on Scripps
          longitude: -117.2571,
          zoom: 10
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      >
        {/* Scripps Marker */}
        <Marker
          latitude={32.8669}
          longitude={-117.2571}
        >
          <div style={{
            color: 'red',
            fontSize: '24px',
            cursor: 'pointer'
          }}>
            📍
          </div>
        </Marker>
      </Map>
    </div>
  );
}

export default App;