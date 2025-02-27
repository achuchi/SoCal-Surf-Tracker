import tensorflow as tf
from tensorflow import keras
print("TensorFlow version:", tf.__version__)
print("Keras version:", keras.__version__)

from sklearn.preprocessing import MinMaxScaler
scaler = MinMaxScaler()
print("scikit-learn test: MinMaxScaler initialized successfully")