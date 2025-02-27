import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler  # Fixed import
from datetime import datetime, timedelta
from Pandas_NOAA_BuoyData import BuoyDataLord

def test_prediction_model():
    print("Starting ML model test...")
    
    # 1. Get some real buoy data
    buoy_processor = BuoyDataLord()
    data = buoy_processor.fetch_all_buoys()
    
    # Take Scripps data as test case
    scripps_data = data.get('Scripps')
    if scripps_data is None or scripps_data.empty:
        print("No data available for Scripps buoy")
        return
    
    print(f"\nData loaded. Shape: {scripps_data.shape}")
    print("\nFirst few rows of wave height data:")
    print(scripps_data[['datetime', 'WVHT']].head())
    
    # 2. Build a simple LSTM model
    sequence_length = 24
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(sequence_length, 1)),  # Fixed input layer
        tf.keras.layers.LSTM(32),
        tf.keras.layers.Dense(24)
    ])
    
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    print("\nModel built successfully")
    print(model.summary())
    
    # 3. Prepare data
    scaler = MinMaxScaler()  # Using sklearn's MinMaxScaler
    wave_data = scripps_data['WVHT'].values.reshape(-1, 1)
    scaled_data = scaler.fit_transform(wave_data)
    
    # Create sequences
    X, y = [], []
    for i in range(len(scaled_data) - sequence_length - 24):
        X.append(scaled_data[i:i + sequence_length])
        y.append(scaled_data[i + sequence_length:i + sequence_length + 24])
    
    X = np.array(X)
    y = np.array(y)
    
    print(f"\nPrepared {len(X)} training sequences")
    print(f"X shape: {X.shape}")
    print(f"y shape: {y.shape}")
    
    # 4. Train model (with a small subset for quick testing)
    print("\nTraining model...")
    history = model.fit(
        X[:100], y[:100],  # Using only 100 sequences for quick test
        epochs=5,
        batch_size=32,
        validation_split=0.2,
        verbose=1
    )
    
    # 5. Make a test prediction
    print("\nMaking test prediction...")
    last_sequence = X[-1:]
    predicted_scaled = model.predict(last_sequence)
    predicted_values = scaler.inverse_transform(predicted_scaled[0].reshape(-1, 1))
    
    # Get actual values for comparison
    actual_values = wave_data[-24:]
    
    print("\nPrediction vs Actual (next 24 hours):")
    for i in range(min(5, len(predicted_values))):  # Show first 5 hours
        print(f"Hour {i+1}:")
        print(f"  Predicted: {predicted_values[i][0]:.2f} meters")
        print(f"  Actual: {actual_values[i][0]:.2f} meters")
    
    # Calculate and print error metrics
    mse = np.mean((predicted_values[:5] - actual_values[:5]) ** 2)
    print(f"\nMean Square Error (first 5 hours): {mse:.4f}")

if __name__ == "__main__":
    try:
        test_prediction_model()
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        import traceback
        print(traceback.format_exc())