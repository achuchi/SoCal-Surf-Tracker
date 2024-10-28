import pandas as pd
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

from Pandas_NOAA_BuoyData import BuoyDataLord

app = FastAPI(title="Buoy Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


processor = BuoyDataLord()
print("Available buoy locations:", processor.buoy_locations)

@app.get("/")
async def root():
    return {
        "status": "online",
        "time": datetime.now().isoformat(),
        "message": "Buoy Tracker API is running"
    }

@app.get("/api/buoys/current")
async def get_current_conditions():
    try:
        data = processor.fetch_all_buoys()

        formatted_data = {}
        for location, df in data.items():
            if df is not None and not df.empty:
                # Function to safely convert to float
                def safe_float(value):
                    try:
                        if pd.isna(value):  # Check if value is NaN
                            return None
                        return float(value)
                    except:
                        return None

                formatted_data[location] = {
                    'wave_height': safe_float(df['WVHT'].iloc[0]),
                    'wave_period': safe_float(df['DPD'].iloc[0]),
                    'water_temp': safe_float(df['WTMP'].iloc[0]),
                    'wind_speed': safe_float(df['WSPD'].iloc[0]),
                    'wind_direction': safe_float(df['WDIR'].iloc[0]),
                    'timestamp': df['datetime'].iloc[0].isoformat()
                }

        return JSONResponse(formatted_data)
    except Exception as e:
        print(f"Error in get_current_conditions: {str(e)}")  # Debug print
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch buoy data: {str(e)}"}
        )

@app.get("/api/buoys/{location}")
async def get_location_data(location: str):
    try:
        data = processor.fetch_all_buoys()
        
        # Make the location check case-insensitive
        location_map = {loc.lower(): loc for loc in data.keys()}
        
        if location.lower() not in location_map:
            return JSONResponse(
                status_code=404,
                content={
                    "error": f"Location {location} not found",
                    "available_locations": list(data.keys())
                }
            )
        
        actual_location = location_map[location.lower()]
        df = data[actual_location]
        
        if df is not None and not df.empty:
            # Function to safely convert to float
            def safe_float(value):
                try:
                    if pd.isna(value):  # Check if value is NaN
                        return None
                    return float(value)
                except:
                    return None

            result = {
                'current': {
                    'wave_height': safe_float(df['WVHT'].iloc[0]),
                    'wave_period': safe_float(df['DPD'].iloc[0]),
                    'water_temp': safe_float(df['WTMP'].iloc[0]),
                    'wind_speed': safe_float(df['WSPD'].iloc[0]),
                    'wind_direction': safe_float(df['WDIR'].iloc[0]),
                    'timestamp': df['datetime'].iloc[0].isoformat()
                },
                'history': [
                    {
                        'wave_height': safe_float(row['WVHT']),
                        'wave_period': safe_float(row['DPD']),
                        'water_temp': safe_float(row['WTMP']),
                        'wind_speed': safe_float(row['WSPD']),
                        'wind_direction': safe_float(row['WDIR']),
                        'timestamp': row['datetime'].isoformat()
                    }
                    for row in df.head(24).to_dict('records')
                ]
            }
            return JSONResponse(result)
            
        else:
            return JSONResponse(
                status_code=404,
                content={"error": "No data available for this location"}
            )
    
    except Exception as e:
        print(f"Error in get_location_data: {str(e)}")  # Debug print
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch data for {location}: {str(e)}"}
        )

if __name__ == "__main__":
    print("Starting Surf Conditions API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
