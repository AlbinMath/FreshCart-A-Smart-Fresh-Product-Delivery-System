import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

async function checkUser() {
  try {
    dotenv.config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const userId = 'Ytyuq6ZGPRSi6Z6HWqutuZXIeZn2';
    // Search by uid field instead of _id
    const user = await User.findOne({ uid: userId }).select('licenseInfo');
    
    if (user) {
      console.log('User found. License info:', JSON.stringify(user.licenseInfo, null, 2));
    } else {
      console.log('User not found');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
  }
}

checkUser();