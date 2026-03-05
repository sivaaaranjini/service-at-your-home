import { io } from 'socket.io-client';

const socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`, {
    transports: ['websocket', 'polling'], // Prioritize websocket for stability on Render
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 5000
});

// Debug logs
socket.on('connect', () => {
    console.log('[SOCKET] Connected to Server:', socket.id);
});

socket.on('disconnect', () => {
    console.log('[SOCKET] Disconnected from Server');
});

socket.on('connect_error', (error) => {
    console.error('[SOCKET] Connection Error:', error);
});

export default socket;
