import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';

// Initialize socket connection outside the component so it persists,
// or inside useEffect if you only want it active while modal is open.
// Doing it inside is safer for cleanup across different bookings.

const ChatModal = ({ booking, onClose }) => {
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const scrollRef = useRef();

    useEffect(() => {
        // Connect to the socket server
        const newSocket = io(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`);
        setSocket(newSocket);

        // Join the room for this specific booking ID
        newSocket.emit('join_room', booking._id);

        // Listen for incoming messages in real-time
        newSocket.on('receive_message', (messageData) => {
            setMessages((prev) => [...prev, messageData]);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [booking._id]);

    useEffect(() => {
        // Fetch historical messages from the database
        const fetchMessages = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const res = await axios.get(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/${booking._id}`, config);
                setMessages(res.data);
            } catch (error) {
                console.error("Chat Fetch Error:", error.response || error);
                toast.error(error.response?.data?.message || 'Could not load chat history');
            }
        };
        fetchMessages();
    }, [booking._id, user.token]);

    // Auto-scroll to bottom of chat when a new message arrives
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            bookingId: booking._id,
            text: newMessage,
            sender: {
                _id: user._id,
                name: user.name,
                role: user.role
            } // Formatted to look like the populated DB response
        };

        try {
            // First, optimistically emit through WebSocket for instant UI
            socket.emit('send_message', messageData);
            setMessages((prev) => [...prev, messageData]);
            setNewMessage('');

            // Then persist to database asynchronously
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages`, {
                bookingId: booking._id,
                text: messageData.text
            }, config);

        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md h-[500px] flex flex-col shadow-xl overflow-hidden relative">

                {/* Header */}
                <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md z-10">
                    <div>
                        <h2 className="text-lg font-bold">
                            {user.role === 'admin' ? 'Audit Chat Logs' : `Chat with ${user.role === 'customer' ? 'Provider' : 'Customer'}`}
                        </h2>
                        <p className="text-xs text-blue-100 truncate">
                            Booking: {booking.serviceId?.serviceName || 'Service'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold leading-none cursor-pointer">
                        &times;
                    </button>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-10 text-sm italic">
                            No messages yet. Say hi! 👋
                        </div>
                    )}
                    {messages.map((msg, idx) => {
                        const isMe = msg.sender?._id === user._id;
                        return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[75%] px-4 py-2 rounded-lg text-sm ${isMe ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1">
                                    {isMe ? 'You' : msg.sender?.name || 'User'}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area */}
                {user.role !== 'admin' ? (
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2">
                        <input
                            type="text"
                            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-50"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 disabled:bg-gray-400 transition"
                        >
                            ➤
                        </button>
                    </form>
                ) : (
                    <div className="p-3 bg-gray-100 border-t text-center text-sm text-gray-500">
                        Read-only transcript view for Administrators.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatModal;
