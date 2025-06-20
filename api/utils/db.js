const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:Snaka%40786@madhav.kfaoq1n.mongodb.net/madhav?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit process if can't connect
  });

// Connection events
mongoose.connection.on('connected', () => 
  console.log('Mongoose connected to DB'));

mongoose.connection.on('error', (err) => 
  console.error('Mongoose connection error:', err));

mongoose.connection.on('disconnected', () => 
  console.log('Mongoose disconnected'));

// Graceful shutdown
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Mongoose connection closed through app termination');
    process.exit(0);
  });
});

module.exports = mongoose;
