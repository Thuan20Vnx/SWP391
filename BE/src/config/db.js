const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error("MONGO_URI is missing in .env file");
        }

        const conn = await mongoose.connect(mongoUri);

        console.log(`MongoDB connected successfully: ${conn.connection.host}`);
        console.log(`Database name: ${conn.connection.name}`);
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);
        process.exit(1);
    }
};

module.exports = connectDB;