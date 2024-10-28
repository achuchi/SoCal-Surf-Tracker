

import pandas as pd
import requests
from datetime import datetime, timedelta
import io

class BuoyDataLord:
    def __init__(self):
        self.buoy_locations = {
            'Scripps': '46254',
            'Torrey_Pines': '46273',
            'Del_Mar': '46266',
            'Imperial_Beach': '46235'
        }

        self.columns = [
            'YY', 'MM', 'DD', 'hh', 'mm',    # Date and time
            'WDIR',                           # Wind direction (degrees)
            'WSPD',                           # Wind speed (m/s)
            'GST',                            # Gust speed (m/s)
            'WVHT',                           # Wave height (m)
            'DPD',                            # Dominant wave period (sec)
            'APD',                            # Average wave period (sec)
            'MWD',                            # Wave direction (degrees)
            'PRES',                           # Pressure (hPa)
            'ATMP',                           # Air temperature (deg C)
            'WTMP',                           # Water temperature (deg C)
            'DEWP',                           # Dewpoint temperature (deg C)
            'VIS',                            # Visibility (nautical miles)
            'PTDY',                           # Pressure tendency (hPa)
            'TIDE'                            # Water level (ft)
        ]

    def fetch_buoy_data(self, station_id):
    
        url = f'https://www.ndbc.noaa.gov/data/realtime2/{station_id}.txt'
        print(f"Attempting to fetch data from: {url}")
        
        try:
            response = requests.get(url, timeout=10)
            print(f"Response status code: {response.status_code}")
            
            if response.status_code == 200:
                # Read the CSV with fixed whitespace separator
                data = pd.read_csv(io.StringIO(response.text), 
                                sep='\s+',  # Changed from delim_whitespace
                                skiprows=2,
                                names=self.columns,
                                na_values=['MM'])
                
                # Convert YY to full year if necessary (assuming 20XX)
                data['YY'] = data['YY'].apply(lambda x: 2000 + x if x < 100 else x)
                
                # First create strings of the date components
                data['date_string'] = data['YY'].astype(str) + '-' + \
                                    data['MM'].astype(str) + '-' + \
                                    data['DD'].astype(str) + ' ' + \
                                    data['hh'].astype(str) + ':' + \
                                    data['mm'].astype(str)
                
                # Convert to datetime
                data['datetime'] = pd.to_datetime(data['date_string'])
                
                # Drop the temporary column and individual date columns
                data = data.drop(['date_string', 'YY', 'MM', 'DD', 'hh', 'mm'], axis=1)
                
                return data
            else:
                print(f"Bad status code: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"Network error fetching data for station {station_id}: {e}")
            return None
        except pd.errors.ParserError as e:
            print(f"Error parsing data for station {station_id}: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error for station {station_id}: {type(e).__name__} - {str(e)}")
            return None
                


    def fetch_all_buoys(self):
        
        all_data = {}

        for location, station_id in self.buoy_locations.items():
            data = self.fetch_buoy_data(station_id)
            if data is not None:
                data['location'] = location
                all_data[location] = data

        return all_data
    
    def analyze_wave_conditions(self, data):

        analysis = {}

        for location, df in data.items():
            analysis[location] = {
                'current_conditions': {
                    'wave_height': df['WVHT'].iloc[0],
                    'wave_period': df['SwP'].iloc[0],
                    'water_temp': df['WTMP'].iloc[0]
                },
                'summary_stats': {
                    'max_wave_height': df['WVHT'].max(),
                    'avg_wave_height': df['WVHT'].mean(),
                    'max_wave_period': df['SwP'].max(),
                    'avg_wave_period': df['SwP'].mean()
                },
                'last_updated': df['datetime'].iloc[0]
            }
            
        return analysis
    
    def trend_data(self, data, hours=72):
        
        trend_data = {}

        for location, df in data.items():
            cutoff_time = datetime.now() - timedelta(hours=hours)
            mask = df['datetime'] >= cutoff_time
            trend_data[location] = df[mask]

        return trend_data
    


if __name__ == "__main__":
    buoyprocessor = BuoyDataLord()


    all_buoy_data = buoyprocessor.fetch_all_buoys()
    
   
if __name__ == "__main__":
    processor = BuoyDataLord()
    all_data = processor.fetch_all_buoys()
    
    # First check if we got any data at all
    if not all_data:
        print("No data was retrieved from any buoy")
    else:
        # Print some basic info about the data
        for location, data in all_data.items():
            print(f"\nChecking {location} data...")  # Debug print
            
            try:
                if data is not None and not data.empty:
                    print(f"\n{location}:")
                    print(f"Number of records: {len(data)}")
                    print(f"Latest data point time: {data['datetime'].iloc[0]}")
                    print(f"Wave height: {data['WVHT'].iloc[0]} meters")
                    print(f"Wave period: {data['DPD'].iloc[0]} seconds")
                    print(f"Water temp: {data['WTMP'].iloc[0]} °C")
                else:
                    print(f"No valid data for {location}")
            except Exception as e:
                print(f"Error processing data for {location}: {str(e)}")