import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import socket from '../utils/socket';
import { toast } from 'react-toastify';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();

            // Join the user's private room for personalized notifications
            socket.emit('join_user_room', user._id);

            const handleNewNotification = (notification) => {
                console.log('[NOTIFICATION] Received:', notification);
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                
                // Show a toast for the new notification
                toast.info(notification.message, {
                    position: "bottom-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: "colored",
                });
            };

            socket.on('new_notification', handleNewNotification);

            return () => {
                socket.off('new_notification', handleNewNotification);
            };
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        // Optional: Implement a backend endpoint for this if needed
        // For now, we can just mark individual ones or leave as is
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, fetchNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
