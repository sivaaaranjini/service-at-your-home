import { useState, useContext, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationContext from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead } = useContext(NotificationContext);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsReadAction = async (id, link) => {
        await markAsRead(id);
        if (link) {
            setShowDropdown(false);
            navigate(link);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors focus:outline-none"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 z-[2000] origin-top-right overflow-x-hidden"
                    >
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10">
                            <h3 className="font-bold text-gray-800">Notifications</h3>
                            <span className="text-xs text-blue-600 font-medium">{unreadCount} unread</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Bell className="mx-auto mb-2 opacity-20" size={40} />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id || notification._id}
                                        className={`p-4 transition-colors hover:bg-gray-50 flex gap-3 ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex-1">
                                            <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                {notification.message}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                                                <span>{new Date(notification.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <div className="flex gap-2">
                                                    {!notification.is_read && (
                                                        <button
                                                            onClick={() => handleMarkAsReadAction(notification.id || notification._id)}
                                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
                                                        >
                                                            <Check size={12} /> Mark Read
                                                        </button>
                                                    )}
                                                    {notification.link && (
                                                        <button
                                                            onClick={() => handleMarkAsReadAction(notification.id || notification._id, notification.link)}
                                                            className="text-gray-600 hover:text-gray-800 flex items-center gap-1 font-bold"
                                                        >
                                                            <ExternalLink size={12} /> View
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
