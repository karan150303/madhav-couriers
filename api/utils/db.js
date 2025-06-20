const mongoose = require('mongoose');

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:Snaka%40786@madhav.kfaoq1n.mongodb.net/madhav?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Export the connection
module.exports = mongoose;
