import pandas as pd
import numpy as np
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import strawberry
from strawberry.fastapi import GraphQLRouter
from typing import List, Optional
from datetime import datetime, timedelta
from enum import Enum
import uvicorn
from Pandas_NOAA_BuoyData import BuoyDataLord

# All Strawberry type definitions
@strawberry.enum
class TimeInterval(Enum):
    HOURLY = "1H"
    DAILY = "1D"
    WEEKLY = "1W"

@strawberry.type
class BuoyMeasurement:
    wave_height: Optional[float]
    wave_period: Optional[float]
    water_temp: Optional[float]
    wind_speed: Optional[float]
    wind_direction: Optional[float]
    timestamp: str

@strawberry.type
class BuoyLocation:
    location: str
    data: BuoyMeasurement

@strawberry.type
class TrendPoint:
    timestamp: str
    value: float

@strawberry.type
class Statistics:
    minimum: float
    maximum: float
    average: float
    std_deviation: Optional[float]

@strawberry.type
class TrendAnalysis:
    trend_direction: str  # "increasing", "decreasing", or "stable"
    change_percentage: float
    confidence_score: float  # 0-1 score indicating trend reliability

@strawberry.type
class TimeSeriesData:
    interval: str
    data_points: List[TrendPoint]
    statistics: Statistics
    trend: TrendAnalysis

@strawberry.type
class WaveAnalysis:
    current: BuoyMeasurement
    time_series: TimeSeriesData

@strawberry.type
class BuoyData:
    current: BuoyMeasurement
    history: List[BuoyMeasurement]

@strawberry.type
class Query:
    @strawberry.field
    def current_conditions(self) -> List[BuoyLocation]:
        processor = BuoyDataLord()
        data = processor.fetch_all_buoys()
        
        formatted_data = []
        for location, df in data.items():
            if df is not None and not df.empty:
                measurement = _format_measurement(df.iloc[0])
                formatted_data.append(
                    BuoyLocation(
                        location=location,
                        data=BuoyMeasurement(**measurement)
                    )
                )
        
        return formatted_data

    @strawberry.field
    def wave_trends(
        self, 
        location: str, 
        interval: TimeInterval,
        hours_back: Optional[int] = 24
    ) -> Optional[WaveAnalysis]:
        try:
            print(f"Fetching wave trends for {location}, interval: {interval.value}, hours back: {hours_back}")
            
            processor = BuoyDataLord()
            data = processor.fetch_all_buoys()
            
            print(f"Available locations: {list(data.keys())}")
            
            location_map = {loc.lower(): loc for loc in data.keys()}
            if location.lower() not in location_map:
                print(f"Location {location} not found in {location_map.keys()}")
                return None
                
            actual_location = location_map[location.lower()]
            df = data[actual_location]
            
            if df is None or df.empty:
                print(f"No data found for location {actual_location}")
                return None

            print(f"DataFrame columns: {df.columns}")
            print(f"DataFrame shape: {df.shape}")
            
            # Convert datetime and set as index
            df['datetime'] = pd.to_datetime(df['datetime'])
            df = df.set_index('datetime')

            # Filter for requested time period
            start_time = datetime.now() - timedelta(hours=hours_back)
            df = df[df.index >= start_time]
            
            print(f"Filtered DataFrame shape: {df.shape}")

            # Check if we have the WVHT column
            if 'WVHT' not in df.columns:
                print(f"WVHT column not found. Available columns: {df.columns}")
                return None

            # Resample data based on interval
            resampled = df.resample(interval.value)['WVHT'].agg([
                'mean', 'min', 'max', 'std'
            ]).fillna(method='ffill')
            
            print(f"Resampled data shape: {resampled.shape}")

            # Calculate trend
            trend_direction = "stable"
            change_pct = 0.0
            confidence = 0.0

            if len(resampled) > 1:
                # Linear regression for trend
                x = np.arange(len(resampled))
                y = resampled['mean'].values
                z = np.polyfit(x, y, 1)
                slope = z[0]

                # Calculate trend direction and strength
                if abs(slope) > 0.01:
                    trend_direction = "increasing" if slope > 0 else "decreasing"
                    
                # Calculate percentage change
                first_val = resampled['mean'].iloc[0]
                last_val = resampled['mean'].iloc[-1]
                if first_val != 0:  # Prevent division by zero
                    change_pct = ((last_val - first_val) / first_val) * 100

                # Calculate confidence based on R-squared
                correlation_matrix = np.corrcoef(x, y)
                correlation_xy = correlation_matrix[0,1]
                confidence = correlation_xy**2

            print(f"Trend analysis completed: direction={trend_direction}, change={change_pct}%, confidence={confidence}")

            # Create time series data points
            data_points = [
                TrendPoint(
                    timestamp=index.isoformat(),
                    value=float(row['mean'])
                )
                for index, row in resampled.iterrows()
            ]

            # Create statistics
            stats = Statistics(
                minimum=float(resampled['min'].min()),
                maximum=float(resampled['max'].max()),
                average=float(resampled['mean'].mean()),
                std_deviation=float(resampled['std'].mean()) if 'std' in resampled.columns else None
            )

            # Create trend analysis
            trend = TrendAnalysis(
                trend_direction=trend_direction,
                change_percentage=round(change_pct, 2),
                confidence_score=round(confidence, 2)
            )

            # Create time series
            time_series = TimeSeriesData(
                interval=interval.value,
                data_points=data_points,
                statistics=stats,
                trend=trend
            )

            # Get current measurement using the modified _format_measurement
            current = BuoyMeasurement(**_format_measurement(df.iloc[-1]))

            print("Successfully created WaveAnalysis object")
            return WaveAnalysis(
                current=current,
                time_series=time_series
            )

        except Exception as e:
            print(f"Error in wave_trends: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return None

    @strawberry.field
    def location_data(self, location: str) -> Optional[BuoyData]:
        processor = BuoyDataLord()
        data = processor.fetch_all_buoys()
        
        location_map = {loc.lower(): loc for loc in data.keys()}
        if location.lower() not in location_map:
            return None
            
        actual_location = location_map[location.lower()]
        df = data[actual_location]
        
        if df is not None and not df.empty:
            current = _format_measurement(df.iloc[0])
            history = [
                _format_measurement(row) 
                for _, row in df.head(24).iterrows()
            ]
            
            return BuoyData(
                current=BuoyMeasurement(**current),
                history=[BuoyMeasurement(**measurement) for measurement in history]
            )
        return None

# Helper function used by both REST and GraphQL endpoints
def _format_measurement(data) -> dict:
        def safe_float(value):
            try:
                if pd.isna(value):
                    return None
                return float(value)
            except:
                return None

        # If data is a Series with a datetime index, use the index
        if isinstance(data, pd.Series):
            timestamp = data.name.isoformat() if hasattr(data.name, 'isoformat') else str(data.name)
        else:
            # For DataFrame rows, use the index
            timestamp = data.name.isoformat() if hasattr(data.name, 'isoformat') else str(data.name)

        return {
            'wave_height': safe_float(data['WVHT']),
            'wave_period': safe_float(data['DPD']),
            'water_temp': safe_float(data['WTMP']),
            'wind_speed': safe_float(data['WSPD']),
            'wind_direction': safe_float(data['WDIR']),
            'timestamp': timestamp
        }

# Create FastAPI app
app = FastAPI(title="Buoy Tracker API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processor
processor = BuoyDataLord()
print("Available buoy locations:", processor.buoy_locations)

# Create GraphQL schema and add route
schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")

# Existing REST endpoints
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
                formatted_data[location] = _format_measurement(df.iloc[0])

        return JSONResponse(formatted_data)
    except Exception as e:
        print(f"Error in get_current_conditions: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch buoy data: {str(e)}"}
        )

@app.get("/api/buoys/{location}")
async def get_location_data(location: str):
    try:
        data = processor.fetch_all_buoys()
        
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
            result = {
                'current': _format_measurement(df.iloc[0]),
                'history': [
                    _format_measurement(row)
                    for _, row in df.head(24).iterrows()
                ]
            }
            return JSONResponse(result)
            
        else:
            return JSONResponse(
                status_code=404,
                content={"error": "No data available for this location"}
            )
    
    except Exception as e:
        print(f"Error in get_location_data: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch data for {location}: {str(e)}"}
        )

if __name__ == "__main__":
    print("Starting Surf Conditions API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
