import pandas as pd
import numpy as np  
import requests
from datetime import datetime, timedelta
import io
import tensorflow as tf  
from sklearn.preprocessing import MinMaxScaler

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


class FocusedWavePredictor:
    def __init__(self, sequence_length=24):
        self.sequence_length = sequence_length
        self.height_scaler = MinMaxScaler(feature_range=(0, 1))
        self.temp_scaler = MinMaxScaler(feature_range=(0, 1))
        self.height_model = self._build_model()
        self.temp_model = self._build_model()
        
    def _build_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.LSTM(32, activation='relu', 
                               input_shape=(self.sequence_length, 1), 
                               return_sequences=True),
            tf.keras.layers.Dropout(0.1),
            tf.keras.layers.LSTM(16, activation='relu'),
            tf.keras.layers.Dense(24)
        ])
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        return model

    def prepare_sequences(self, data, scaler, column):
        """Prepare sequences for single feature prediction"""
        scaled_data = scaler.fit_transform(data[[column]])
        
        X, y = [], []
        for i in range(len(scaled_data) - self.sequence_length - 24):
            X.append(scaled_data[i:(i + self.sequence_length)])
            y.append(scaled_data[i + self.sequence_length:i + self.sequence_length + 24])
            
        return np.array(X), np.array(y)

    def train(self, historical_data, epochs=30, batch_size=32):
        """Train models for both wave height and temperature"""
        # Prepare and train wave height model
        X_height, y_height = self.prepare_sequences(historical_data, 
                                                  self.height_scaler, 'WVHT')
        height_history = self.height_model.fit(
            X_height, y_height,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            verbose=0
        )
        
        # Prepare and train temperature model
        X_temp, y_temp = self.prepare_sequences(historical_data, 
                                              self.temp_scaler, 'WTMP')
        temp_history = self.temp_model.fit(
            X_temp, y_temp,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            verbose=0
        )
        
        return {
            'height_accuracy': 1 - min(height_history.history['val_mae']),
            'temp_accuracy': 1 - min(temp_history.history['val_mae'])
        }

    def predict(self, current_data):
        """Generate predictions for both wave height and temperature"""
        # Prepare recent sequences
        recent_height = self.height_scaler.transform(
            current_data[['WVHT']].tail(self.sequence_length)
        )
        recent_temp = self.temp_scaler.transform(
            current_data[['WTMP']].tail(self.sequence_length)
        )
        
        # Generate predictions
        height_pred = self.height_model.predict(
            recent_height.reshape(1, self.sequence_length, 1)
        )
        temp_pred = self.temp_model.predict(
            recent_temp.reshape(1, self.sequence_length, 1)
        )
        
        # Inverse transform predictions
        height_pred = self.height_scaler.inverse_transform(height_pred)[0]
        temp_pred = self.temp_scaler.inverse_transform(temp_pred)[0]
        
        # Calculate confidence scores
        confidence = self._calculate_confidence(current_data)
        
        # Format predictions
        current_time = current_data['datetime'].iloc[-1]
        return {
            'wave_height': [
                {
                    'timestamp': (current_time + timedelta(hours=i+1)).isoformat(),
                    'value': float(height_pred[i]),
                    'confidence': float(confidence[i])
                }
                for i in range(24)
            ],
            'temperature': [
                {
                    'timestamp': (current_time + timedelta(hours=i+1)).isoformat(),
                    'value': float(temp_pred[i]),
                    'confidence': float(confidence[i])
                }
                for i in range(24)
            ]
        }
    
    def _calculate_confidence(self, current_data):
        """Calculate confidence scores that decay over the prediction horizon"""
        # Base confidence on recent data stability
        recent_height_std = current_data['WVHT'].tail(24).std()
        recent_temp_std = current_data['WTMP'].tail(24).std()
        
        base_confidence = 1.0 - min(
            (recent_height_std + recent_temp_std) / 
            (current_data['WVHT'].mean() + current_data['WTMP'].mean()),
            0.5
        )
        
        # Apply time decay to confidence
        time_decay = np.exp(-np.arange(24) / 24)
        confidence_scores = base_confidence * time_decay
        
        return np.clip(confidence_scores, 0.3, 0.95)