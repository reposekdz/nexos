const mongoose = require('mongoose');
const redis = require('redis');

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 100,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB Connected Successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB Disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    setTimeout(connectDB, 5000);
  }
};

// Redis Connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

redisClient.on('connect', () => console.log('✅ Redis Connected'));
redisClient.on('error', (err) => console.error('❌ Redis Error:', err));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Redis Connection Failed:', error.message);
  }
};

module.exports = { connectDB, connectRedis, redisClient };
