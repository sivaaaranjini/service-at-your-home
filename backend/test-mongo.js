const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

console.log("Attempting to connect to:", process.env.MONGO_URI.replace(/:([^:@]{3,})@/, ':***@')); // Hide password in logs

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
})
    .then(() => {
        console.log("✅ SUCCESS: Connected to MongoDB Atlas!");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ FAILED TO CONNECT TO ATLAS:");
        console.error(err.message);
        if (err.name === 'MongoServerSelectionError') {
            console.error("\n---> Diagnosis: Your computer cannot reach the Atlas cluster. This is typically due to:");
            console.error("    1. Your IP Address is not whitelisted in the Atlas Network Access panel.");
            console.error("    2. Your Internet Service Provider (ISP) or Antivirus is blocking port 27017.");
            console.error("    3. Your Database Username/Password is incorrect.");
        }
        process.exit(1);
    });
