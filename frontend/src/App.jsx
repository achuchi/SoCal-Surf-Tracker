import React from 'react'

function App() {
  // Try multiple ways to check environment variables
  console.log("Starting app...")
  console.log("Test value:", import.meta.env.VITE_TEST)
  console.log("All env:", import.meta.env)

  return (
    <div>
      <h1>Environment Test</h1>
      <div style={{padding: '20px', background: '#f0f0f0', margin: '20px'}}>
        <p>VITE_TEST value: {import.meta.env.VITE_TEST || 'Not found'}</p>
        <p>MAPBOX token exists: {import.meta.env.VITE_MAPBOX_TOKEN ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}

export default App

