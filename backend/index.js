const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allow CORS from multiple origins if specified as comma-separated in .env, otherwise default to single string
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://service-at-your-home-mu.vercel.app", "http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});
app.set('io', io);

// Middleware
app.use(express.json());
const corsOptions = {
    origin: ["https://service-at-your-home-mu.vercel.app", "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight across-the-board

app.use((req, res, next) => {
    console.log(`[TRAFFIC] ${req.method} ${req.url}`);
    next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const offerRoutes = require('./routes/offerRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/messages', require('./routes/messageRoutes'));



app.get('/', (req, res) => {
    res.send('Service at Your Home API is running...');
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific booking room
    socket.on('join_room', (bookingId) => {
        socket.join(bookingId);
        console.log(`User ${socket.id} joined room ${bookingId}`);
    });

    // Join a private room for the user to receive personal notifications
    socket.on('join_user_room', (userId) => {
        socket.join(userId);
        console.log(`User ${socket.id} joined private room ${userId}`);
    });

    // Handle sending message
    socket.on('send_message', (data) => {
        // data = { bookingId, senderId, text }
        // Broadcast the message to everyone in the room except the sender
        socket.to(data.bookingId).emit('receive_message', data);
    });

    // Handle Live GPS Tracking (Phase 5)
    socket.on('update_location', (data) => {
        // data = { bookingId, lat, lng }
        console.log(`[GPS_SIGNAL] Provider Update | Booking: ${data.bookingId} | Lat: ${data.lat} | Lng: ${data.lng}`);
        // Broadcast the provider's coordinates directly to the customer in the same room
        socket.to(data.bookingId).emit('receive_location', data);
    });

    socket.on('update_customer_location', (data) => {
        // data = { bookingId, lat, lng }
        console.log(`[GPS_SIGNAL] Customer Update | Booking: ${data.bookingId} | Lat: ${data.lat} | Lng: ${data.lng}`);
        // Broadcast the customer's coordinates to the provider
        socket.to(data.bookingId).emit('receive_customer_location', data);
    });

    // Handle Admin Global Broadcasts
    socket.on('admin_broadcast', (message) => {
        console.log(`[BROADCAST] ${message}`);
        // Broadcast to all connected clients
        io.emit('receive_broadcast', message);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Old MongoDB Connection logic removed - Migrating to Supabase PostgreSQL

const startReminderJob = require('./jobs/reminderJob');
startReminderJob();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
