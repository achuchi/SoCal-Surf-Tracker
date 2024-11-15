# SoCal Surf Conditions Tracker

A full-stack web application that provides real-time surf conditions across Southern California beaches using public NOAA buoy data. The application features an interactive map interface with live wave height, period, and temperature data from multiple monitoring stations.

## Features
- Real-time wave data fetching from NOAA buoy stations
- Interactive map interface showing buoy locations
- Detailed surf conditions including:
  - Wave height
  - Wave period
  - Water temperature
  - Wind conditions
- Historical data tracking and visualization
- RESTful API endpoints for data access

## Technology Stack
### Backend (IMPLEMENTED AS OF 10/28/2024)
- Python
- FastAPI for API development
- Pandas for data processing
- Real-time data fetching from NOAA buoys

### Frontend (WIP)
- React
- Mapbox GL for interactive mapping
- Recharts for data visualization
- Tailwind CSS for styling

## Installation

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install required packages
pip install -r requirements.txt

# Start the FastAPI server
python main.py
