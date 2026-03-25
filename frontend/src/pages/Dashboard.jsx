import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import QRScanner from '../components/QRScanner';
import AnalyticsCharts from '../components/AnalyticsCharts';
import LiveTrackingMap from '../components/LiveTrackingMap';
import generateInvoice from '../utils/generateInvoice';
import socket from '../utils/socket';
import { LayoutDashboard, Users, MessageSquare, QrCode, ClipboardList, TriangleAlert, Star, CircleCheck, Clock, ShieldCheck, MapPin, User, Settings, LogOut, FileText, ShieldOff, CirclePlus, ArrowUpRight, CreditCard, X, RotateCcw, CircleX, Wallet, UserCheck, Trash2, Tag, BarChart3, Briefcase, History, UserCog } from 'lucide-react';
import ReviewsList from '../components/ReviewsList';
import ChatModal from '../components/ChatModal';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [unapprovedProviders, setUnapprovedProviders] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [myServices, setMyServices] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [complaintText, setComplaintText] = useState('');
    const [selectedBookingForComplaint, setSelectedBookingForComplaint] = useState(null);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [activeChatBooking, setActiveChatBooking] = useState(null);
    const [liveLocations, setLiveLocations] = useState({});
    const [activeTab, setActiveTab] = useState('New Requests');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
    const [rating, setRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);
    const [customerLocations, setCustomerLocations] = useState({});
    const [payouts, setPayouts] = useState([]);
    const [offers, setOffers] = useState([]);
    const [adminSection, setAdminSection] = useState('analytics'); // analytics, users, providers, payouts, bookings, broadcast, disputes, discounts
    const [providerSection, setProviderSection] = useState('revenue'); // revenue, new_requests, active_jobs, past_jobs, portfolio, add_service, payouts, live, feedback

    useEffect(() => {
        socket.on('receive_location', (data) => {
            console.log('[DEBUG] Received Provider Location:', data);
            setLiveLocations(prev => ({ ...prev, [data.bookingId]: { lat: data.lat, lng: data.lng } }));
        });
        socket.on('receive_customer_location', (data) => {
            console.log('[DEBUG] Received Customer Location:', data);
            setCustomerLocations(prev => ({ ...prev, [data.bookingId]: { lat: data.lat, lng: data.lng } }));
        });
        return () => { 
            socket.off('receive_location'); 
            socket.off('receive_customer_location');
        };
    }, []);

    useEffect(() => {
        const joinActiveRooms = () => {
            if (user && bookings.length > 0) {
                const activeStatuses = ['Accepted', 'OnTheWay', 'In Progress', 'Paid'];
                bookings.forEach(booking => { if (activeStatuses.includes(booking.status)) socket.emit('join_room', booking._id); });
            }
        };
        joinActiveRooms();
        socket.on('connect', joinActiveRooms);
        return () => { socket.off('connect', joinActiveRooms); };
    }, [bookings, user]);

    useEffect(() => {
        let watchId;
        let simInterval;
        if (user?.role === 'provider' && user?.isProviderApproved) {
            const activeTrips = bookings.filter(b => b.status === 'OnTheWay');
            if (activeTrips.length > 0) {
                if (isSimulating) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        const baseLat = pos.coords.latitude;
                        const baseLng = pos.coords.longitude;
                        let step = 0;
                        simInterval = setInterval(() => {
                            const lat = baseLat + (step * 0.0005);
                            const lng = baseLng + (step * 0.0005);
                            activeTrips.forEach(trip => { socket.emit('update_location', { bookingId: trip._id, lat, lng }); });
                            step++;
                        }, 3000);
                    });
                } else if ('geolocation' in navigator) {
                    watchId = navigator.geolocation.watchPosition((p) => {
                        activeTrips.forEach(trip => { socket.emit('update_location', { bookingId: trip._id, lat: p.coords.latitude, lng: p.coords.longitude }); });
                    });
                }
            }
        } else if (user?.role === 'customer') {
            // Customer shares their home/live location when provider is coming or job is active
            const activeBookings = bookings.filter(b => ['Accepted', 'OnTheWay', 'In Progress'].includes(b.status));
            if (activeBookings.length > 0 && 'geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition((p) => {
                    activeBookings.forEach(b => {
                        socket.emit('update_customer_location', { bookingId: b._id, lat: p.coords.latitude, lng: p.coords.longitude });
                    });
                }, (err) => console.error("Customer Geo Error:", err), { enableHighAccuracy: true });
            }
        }
        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); if (simInterval) clearInterval(simInterval); };
    }, [bookings, user, isSimulating]);

    useEffect(() => {
        if (user) {
            fetchBookings();
            if (user.role === 'admin') { 
                fetchUnapprovedProviders(); fetchComplaints(); fetchAllUsers(); fetchAllServices(); fetchPayouts(); fetchOffers();
            }
            if (user.role === 'provider') {
                fetchMyServices();
                fetchMyPayouts();
            }
        }
    }, [user]);

    const fetchMyServices = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services/my-services`, { headers: { Authorization: `Bearer ${user.token}` } });
            setMyServices(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchUnapprovedProviders = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users`, { headers: { Authorization: `Bearer ${user.token}` } });
            setUnapprovedProviders(res.data.filter(u => u.role === 'provider' && !u.isProviderApproved));
        } catch (e) { console.error(e); }
    };

    const handleApproveProvider = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/approve-provider/${id}`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Provider approved'); fetchUnapprovedProviders();
        } catch (e) { toast.error('Approval failed'); }
    };

    const fetchComplaints = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/complaints`, { headers: { Authorization: `Bearer ${user.token}` } });
            setComplaints(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users`, { headers: { Authorization: `Bearer ${user.token}` } });
            setAllUsers(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchAllServices = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services`);
            setAllServices(res.data);
        } catch (e) { console.error(e); }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('User deleted'); fetchAllUsers(); fetchUnapprovedProviders();
        } catch (e) { toast.error('Failed to delete user'); }
    };

    const handleDeleteService = async (id) => {
        if (!window.confirm('Delete this service?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Service deleted'); fetchAllServices();
        } catch (e) { toast.error('Failed to delete service'); }
    };

    const handleRemoveMyService = async (id) => {
        if (!window.confirm('Remove this service?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Service removed'); fetchMyServices();
        } catch (e) { toast.error('Failed to remove service'); }
    };

    const handleResolveComplaint = async (id, action) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/complaints/${id}/resolve`, { action }, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success(`Complaint resolved: ${action}`); fetchComplaints();
        } catch (e) { toast.error('Failed to resolve complaint'); }
    };

    const handleBroadcast = (e) => {
        e.preventDefault();
        if (!broadcastMessage.trim()) return;
        socket.emit('admin_broadcast', broadcastMessage);
        setBroadcastMessage('');
        toast.success('Broadcast sent');
    };

    const handleSubmitComplaint = async () => {
        if (!complaintText.trim()) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/complaints`, { bookingId: selectedBookingForComplaint, description: complaintText }, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Complaint submitted'); setShowComplaintModal(false); setComplaintText('');
        } catch (e) { toast.error('Failed to submit complaint'); }
    };

    const fetchOffers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/offers`);
            setOffers(res.data);
        } catch (e) { console.error(e); }
    };

    const handleAddOffer = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const offerData = {
            title: formData.get('title'),
            description: formData.get('description'),
            discount_percentage: formData.get('discount_percentage'),
            service_id: formData.get('service_id') || null,
            expiry_date: formData.get('expiry_date') || null
        };
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/offers`, offerData, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Offer created'); e.target.reset(); fetchOffers();
        } catch (e) { toast.error('Failed to create offer'); }
    };

    const handleDeleteOffer = async (id) => {
        if (!window.confirm('Delete this offer?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/offers/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Offer removed'); fetchOffers();
        } catch (e) { toast.error('Failed to delete offer'); }
    };

    const fetchPayouts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/payouts`, { headers: { Authorization: `Bearer ${user.token}` } });
            setPayouts(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchMyPayouts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/my-payouts`, { headers: { Authorization: `Bearer ${user.token}` } });
            setPayouts(res.data);
        } catch (e) { console.error(e); }
    };

    const handleProcessPayout = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/payouts/${id}`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Payout marked as paid');
            fetchPayouts();
        } catch (e) { toast.error('Payout processing failed'); }
    };

    const handleAddService = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const serviceData = { serviceName: formData.get('serviceName'), category: formData.get('category'), description: formData.get('description'), price: formData.get('price'), location: formData.get('location') };
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services`, serviceData, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Service added'); e.target.reset(); fetchMyServices();
        } catch (e) { toast.error('Failed to add service'); }
    };

    const fetchBookings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings`, { headers: { Authorization: `Bearer ${user.token}` } });
            setBookings(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleUpdateBookingStatus = async (bookingId, newStatus) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/${bookingId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success(`Updated to ${newStatus}`); fetchBookings();
        } catch (e) { toast.error('Failed to update status'); }
    };

    const handlePay = async (bookingId, amount) => {
        alert(`Initiating payment for ₹${amount}`);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/verify`, { bookingId, razorpay_order_id: 'test', razorpay_payment_id: 'test', razorpay_signature: 'test' }, { headers: { Authorization: `Bearer ${user.token}` } });
        } catch (e) { console.error(e); }
    };

    const handleSubmitReview = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reviews`, { bookingId: selectedBookingForReview, rating, comment: reviewComment }, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Review submitted'); setShowReviewModal(false); setReviewComment(''); setRating(5); fetchBookings();
        } catch (e) { toast.error('Failed to submit review'); }
    };

    const handleScan = async (scannedData) => {
        if (!selectedBookingId) return;
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/verify-provider`, { bookingId: selectedBookingId, scannedProviderId: scannedData }, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success(res.data.message); setShowScanner(false); fetchBookings();
        } catch (e) { toast.error('Verification failed'); }
    };

    if (loading) return <div className="p-8 text-center text-blue-600 font-bold animate-pulse">Loading Your Workspace...</div>;

    const displayedBookings = user?.role === 'provider' ? bookings.filter(b => {
        if (activeTab === 'New Requests') return b.status === 'Pending';
        if (activeTab === 'Active Jobs') return ['Accepted', 'OnTheWay', 'In Progress', 'Paid'].includes(b.status);
        if (activeTab === 'Past Jobs') return ['Completed', 'Cancelled', 'Refunded'].includes(b.status);
        return true;
    }) : bookings;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
            {user?.role === 'admin' && (
                <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8f9fc] font-sans">
                    {/* Light Sidebar */}
                    <motion.aside initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="lg:w-72 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col z-20">
                        {/* Logo / Brand Section */}
                        <div className="p-8 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <ShieldCheck size={24} />
                                </div>
                                <span className="text-xl font-bold text-gray-900 tracking-tight">SafeLine</span>
                            </div>
                        </div>

                        <div className="px-4 flex-1 space-y-1">
                            {[
                                { id: 'analytics', label: 'Analytics Financial', icon: <LayoutDashboard size={20} /> },
                                { id: 'users', label: 'Manage Users', icon: <Users size={20} /> },
                                { id: 'manageProviders', label: 'Manage Provider', icon: <UserCheck size={20} /> },
                                { id: 'providers', label: 'Provider Intake', icon: <Clock size={20} />, badge: unapprovedProviders.length },
                                { id: 'payouts', label: 'Payout', icon: <Wallet size={20} /> },
                                { id: 'bookings', label: 'Booking Ledger', icon: <ClipboardList size={20} /> },
                                { id: 'broadcast', label: 'Broadcast', icon: <MessageSquare size={20} /> },
                                { id: 'discounts', label: 'Offers & Discounts', icon: <Tag size={20} /> },
                                { id: 'disputes', label: 'Issues', icon: <ShieldOff size={20} />, badge: complaints.length },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setAdminSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left relative group ${
                                        adminSection === item.id 
                                        ? 'bg-indigo-50 text-indigo-600' 
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`${adminSection === item.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
                                        {item.icon}
                                    </div>
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge > 0 && adminSection !== item.id && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}

                            <div className="pt-8 border-t border-gray-100 mt-8 mx-4">
                                <button onClick={() => window.location.href = '/logout'} className="w-full flex items-center gap-3 px-0 py-3 text-sm font-semibold text-red-500 hover:text-red-600 transition-all">
                                    <LogOut size={20} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 mt-auto">
                           <div className="bg-white/5 rounded-3xl p-6 flex items-center justify-between">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Stable</span>
                                <Settings size={16} className="text-gray-500 hover:text-white cursor-pointer transition-colors" />
                           </div>
                        </div>
                    </motion.aside>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto max-h-screen">
                        <header className="flex justify-between items-center px-12 py-6 bg-white border-b border-gray-100">
                            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                                <span className="hover:text-gray-600 cursor-pointer">Dashboard</span>
                                <span>&rsaquo;</span>
                                <span className="text-gray-900 font-semibold capitalize">
                                    {adminSection === 'manageProviders' ? 'Manage Provider' : 
                                     adminSection === 'analytics' ? 'Analytics Financial' :
                                     adminSection === 'bookings' ? 'Booking Ledger' :
                                     adminSection === 'disputes' ? 'Issues' :
                                     adminSection === 'users' ? 'Manage Users' :
                                     adminSection === 'payouts' ? 'Payout' :
                                     adminSection === 'broadcast' ? 'Broadcast' :
                                     adminSection.replace(/([A-Z])/g, ' $1')}
                                </span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900 leading-none">{user?.name || 'admin'}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">admin • Super Admin</p>
                                </div>
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border border-gray-200">
                                    <User size={20} />
                                </div>
                            </div>
                        </header>

                        <div className="p-12">
                            <div className="mb-10 flex justify-between items-end">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight capitalize">
                                        {adminSection === 'manageProviders' ? 'Manage Provider' : 
                                         adminSection === 'analytics' ? 'Analytics Financial' :
                                         adminSection === 'bookings' ? 'Booking Ledger' :
                                         adminSection === 'disputes' ? 'Issues' :
                                         adminSection === 'users' ? 'Manage Users' :
                                         adminSection === 'payouts' ? 'Payout' :
                                         adminSection === 'broadcast' ? 'Broadcast' :
                                         adminSection.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">Global governance and {adminSection} management</p>
                                </div>
                            </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={adminSection}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {adminSection === 'analytics' && (
                                    <div className="space-y-12">
                                        <AnalyticsCharts bookings={bookings} role={user?.role} token={user?.token} />
                                        
                                        {/* Desktop Live Maps Section inside Analytics */}
                                        {bookings.some(b => b.status === 'OnTheWay') && (
                                            <div className="mt-12 bg-white/5 backdrop-blur-sm p-10 rounded-[3.5rem] border-2 border-dashed border-gray-200">
                                                <h2 className="text-xl font-black text-gray-900 mb-10 flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center animate-pulse"><MapPin size={24} /></div>
                                                    Live Fleet Matrix
                                                </h2>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                    {bookings.filter(b => b.status === 'OnTheWay').map(booking => (
                                                        <div key={booking._id} className="bg-white p-6 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 hover:border-blue-200 transition-all">
                                                            <div className="flex justify-between items-center mb-6 px-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">🚙</div>
                                                                    <div>
                                                                        <h4 className="font-black text-gray-900 text-base leading-tight tracking-tight">{booking.serviceId?.serviceName}</h4>
                                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em] mt-0.5">Operator Dispatch Active</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Real-time Relay</p>
                                                                    <p className="text-xs font-bold text-gray-400">ID: #{booking._id.slice(-6)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="rounded-[2.5rem] overflow-hidden shadow-inner ring-4 ring-gray-50 bg-gray-100 min-h-[300px]">
                                                                <LiveTrackingMap 
                                                                    providerLocation={liveLocations[booking._id]} 
                                                                    customerLocation={customerLocations[booking._id]} 
                                                                    providerName={booking.providerId?.name || "Provider"} 
                                                                    userRole={user?.role}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {adminSection === 'payouts' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-6">
                                                <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm"><CreditCard size={40} /></div>
                                                <div>
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">Payout</h2>
                                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">Revenue & Escrow Governance</p>
                                                </div>
                                            </div>
                                            <div className="bg-white px-10 py-5 rounded-[2.5rem] shadow-xl border border-gray-50 flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Platform Reserve</p>
                                                    <p className="text-3xl font-black text-gray-900 leading-none tracking-tighter">₹{payouts.filter(p => p.payout_status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}</p>
                                                </div>
                                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse"><Wallet size={24} /></div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                <h3 className="text-sm font-bold text-gray-800">Organization Directory</h3>
                                                <p className="text-xs text-gray-400 mt-1 font-medium">Real-time listing of all provisioned tenant environments.</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ORGANIZATION</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">ESCROW VALUE</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">TENANT ADMIN</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">ACTIONS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {payouts.map(payout => (
                                                            <tr key={payout._id} className="hover:bg-gray-50/30 transition-all group">
                                                                <td className="px-8 py-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                            <ShieldCheck size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900 text-sm leading-tight">{payout.booking?.provider?.name || 'Unknown Entity'}</p>
                                                                            <p className="text-[10px] text-gray-400 font-medium mt-1">{payout.booking?.service?.service_name || 'Operational Module'}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6 text-center text-sm font-bold text-gray-700">₹{payout.amount}</td>
                                                                <td className="px-8 py-6 text-center">
                                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                        payout.payout_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                                                    }`}>
                                                                        {payout.payout_status === 'Paid' ? 'admin' : 'In Escrow'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-6 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {payout.payout_status === 'Pending' ? (
                                                                            <button 
                                                                                onClick={() => handleProcessPayout(payout._id)}
                                                                                className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-700 uppercase hover:bg-gray-50 transition-all"
                                                                            >
                                                                                MANAGE
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold text-emerald-500 px-3 uppercase">SETTLED</span>
                                                                        )}
                                                                        <button className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors">
                                                                            <MapPin size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {payouts.length === 0 && (
                                                            <tr>
                                                                <td colSpan="4" className="px-8 py-24 text-center">
                                                                    <p className="text-sm font-medium text-gray-400 italic">No registry signals detected.</p>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {adminSection === 'providers' && (
                                    <div className="space-y-10">
                                        <div className="mb-10 px-2 flex items-center gap-5">
                                            <div className="p-5 bg-orange-100 text-orange-600 rounded-[2rem] shadow-sm"><Clock size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Provider Intake</h2>
                                                <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">Onboarding Verification Queue</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                            {unapprovedProviders.map(p => (
                                                <motion.div layout id={`provider-${p._id}`} key={p._id} className="p-10 bg-white rounded-[3.5rem] shadow-xl border border-orange-50 flex flex-col gap-8 relative overflow-hidden group hover:border-orange-200 transition-all hover:translate-y-[-4px]">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-bl-[5rem] -mr-12 -mt-12 transition-transform group-hover:scale-125"></div>
                                                    <div className="z-10 bg-gradient-to-br from-gray-50 to-white w-16 h-16 rounded-[2rem] flex items-center justify-center text-3xl shadow-inner border border-gray-100">👤</div>
                                                    <div className="z-10">
                                                        <h3 className="font-black text-2xl text-gray-950 leading-tight uppercase tracking-tight">{p.name}</h3>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1.5 italic opacity-80">{p.email}</p>
                                                    </div>
                                                    <button onClick={() => handleApproveProvider(p._id)} className="w-full bg-[#1a2332] text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl hover:shadow-orange-200 z-10">Review & Authorize</button>
                                                </motion.div>
                                            ))}
                                            {unapprovedProviders.length === 0 && (
                                                <div className="md:col-span-3 py-32 bg-white rounded-[4rem] border-2 border-dashed border-gray-100 text-center grayscale opacity-40">
                                                    <div className="text-7xl mb-6">✨</div>
                                                    <p className="text-2xl font-black uppercase tracking-widest text-gray-400 italic">Queue Clear: All Status Verified</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {adminSection === 'disputes' && (
                                    <div className="space-y-10">
                                        <div className="flex items-center gap-5 px-2">
                                            <div className="p-5 bg-red-100 text-red-600 rounded-[2rem] shadow-sm"><ShieldOff size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">Issues</h2>
                                                <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">High-Priority Incident Queue</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-8">
                                            {complaints.length === 0 ? (
                                                <div className="bg-white p-24 rounded-[3.5rem] shadow-xl border border-gray-100 text-center grayscale opacity-40">
                                                    <div className="text-7xl mb-6 flex justify-center">🕊️</div>
                                                    <p className="text-2xl font-black italic font-serif text-gray-400 uppercase tracking-widest">Protocol Status: Harmonious</p>
                                                </div>
                                            ) : (
                                                complaints.map(c => (
                                                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={c._id} className="p-10 bg-white rounded-[3rem] shadow-xl border border-red-50 relative group overflow-hidden hover:border-red-200 transition-all">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                                                        <div className="relative z-10">
                                                            <div className="flex justify-between items-center mb-8">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                                                    <p className="font-black text-red-900 text-sm uppercase tracking-widest">Incident #ID-{c._id.slice(-6)}</p>
                                                                </div>
                                                                <span className="bg-red-600 text-white text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-tighter shadow-lg shadow-red-200">Critical Priority</span>
                                                            </div>
                                                            <div className="bg-red-50/50 p-8 rounded-[2rem] border-l-8 border-red-500 mb-10">
                                                                <p className="text-xl text-red-950 leading-relaxed font-bold italic">"{c.description}"</p>
                                                            </div>
                                                            <div className="flex gap-4">
                                                                <button onClick={() => handleResolveComplaint(c._id, 'dismissed')} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black text-xs uppercase hover:bg-gray-200 transition-all active:scale-95 tracking-widest">Insignificant Action</button>
                                                                <button onClick={() => handleResolveComplaint(c._id, 'refunded')} className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl shadow-red-200 hover:bg-red-700 hover:-translate-y-1 transition-all active:scale-95 tracking-widest">Execute Full Refund</button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {adminSection === 'broadcast' && (
                                    <div className="bg-[#1a2332] p-16 rounded-[4rem] shadow-2xl text-white relative overflow-hidden ring-8 ring-white/5">
                                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                                        <div className="relative z-10 max-w-3xl">
                                            <div className="mb-12 flex items-center gap-6">
                                                <div className="p-6 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-[2.5rem] shadow-2xl shadow-indigo-600/30 animate-pulse"><MessageSquare size={44} /></div>
                                                <div>
                                                    <h2 className="text-3xl font-black tracking-tight leading-none mb-2 uppercase">Broadcast</h2>
                                                    <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em] opacity-80">Unified Master Messaging Protocol</p>
                                                </div>
                                            </div>
                                            <p className="text-gray-400 text-xl mb-12 leading-relaxed font-bold">Transmit an instantaneous, encrypted alert to all active nodes across the ServiceAtYourHome ecosystem.</p>
                                            <form onSubmit={handleBroadcast} className="space-y-8">
                                                <div className="relative group">
                                                    <textarea className="w-full bg-white/5 border-2 border-white/10 p-10 rounded-[2.5rem] text-white outline-none focus:border-indigo-500 focus:bg-white/10 transition-all text-xl font-bold placeholder:text-gray-600 shadow-inner" rows="6" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Type global transmission content..."></textarea>
                                                    <div className="absolute bottom-6 right-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">Admin Authorization Required</div>
                                                </div>
                                                <motion.button whileHover={{ scale: 1.02, backgroundColor: '#4f46e5' }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-indigo-600 text-white py-8 rounded-[2rem] font-black text-2xl shadow-2xl shadow-indigo-900/40 uppercase tracking-[0.2em] transition-all">Execute Broadcast</motion.button>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {adminSection === 'discounts' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4 px-2">
                                            <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm"><Tag size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">Offers & Discounts</h2>
                                                <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">Promotional Strategy & Governance</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-1">
                                                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 sticky top-8">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-6">Create New Offer</h3>
                                                    <form onSubmit={handleAddOffer} className="space-y-5">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Offer Title</label>
                                                            <input name="title" required placeholder="e.g. Holi Special" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Discount %</label>
                                                            <input name="discount_percentage" type="number" required placeholder="20" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Service (Optional)</label>
                                                            <select name="service_id" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm">
                                                                <option value="">All Services</option>
                                                                {allServices.map(s => <option key={s._id} value={s._id}>{s.serviceName}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expiry Date</label>
                                                            <input name="expiry_date" type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm" />
                                                        </div>
                                                        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4">Provision Offer</button>
                                                    </form>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-2 space-y-6">
                                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                                    <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                                        <div>
                                                            <h3 className="text-sm font-bold text-gray-800">Active Promotions</h3>
                                                            <p className="text-xs text-gray-400 mt-1 font-medium">Currently active market incentives.</p>
                                                        </div>
                                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">{offers.length} ACTIVE</span>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                                                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">OFFER CONFIG</th>
                                                                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">VALUE</th>
                                                                    <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">ACTION</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50">
                                                                {offers.map(offer => (
                                                                    <tr key={offer._id} className="hover:bg-gray-50/30 transition-all group">
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                                    <Tag size={18} />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="font-bold text-gray-900 text-sm leading-tight">{offer.title}</p>
                                                                                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                                                                                        {offer.service_id ? 'Targeted Service' : 'Platform-Wide'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6 text-center text-sm font-black text-indigo-600">
                                                                            {offer.discount_percentage}% OFF
                                                                        </td>
                                                                        <td className="px-8 py-6 text-right">
                                                                            <button onClick={() => handleDeleteOffer(offer._id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                                                                <Trash2 size={18} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {offers.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan="3" className="px-8 py-20 text-center text-gray-400 italic text-sm">No promotional assets provisioned.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {adminSection === 'users' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4 px-2">
                                            <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm"><Users size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">Manage Users</h2>
                                                <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">Verified Member Directory</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                <h3 className="text-sm font-bold text-gray-800">Customer Records</h3>
                                                <p className="text-xs text-gray-400 mt-1 font-medium">Global governance of consumer-level identity assets.</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">CONSUMER</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">STATUS</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">ACTIONS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {allUsers.filter(u => u.role === 'customer').map(u => (
                                                            <tr key={u._id} className="hover:bg-gray-50/30 transition-all group">
                                                                <td className="px-8 py-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                            <User size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900 text-sm leading-tight">{u.name}</p>
                                                                            <p className="text-[10px] text-gray-400 font-medium mt-1">{u.email}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600">
                                                                        Verified
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-6 text-right">
                                                                    <button onClick={() => handleDeleteUser(u._id)} className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-red-500 uppercase hover:bg-red-50 transition-all">
                                                                        CLOSE ACCOUNT
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {adminSection === 'manageProviders' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4 px-2">
                                            <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm"><UserCheck size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">Manage Provider</h2>
                                                <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">Certified Service Personnel</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                <h3 className="text-sm font-bold text-gray-800">Approved Providers</h3>
                                                <p className="text-xs text-gray-400 mt-1 font-medium">Directory of authenticated domain experts in the network.</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PROVIDER</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">SERVICES</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">PROTOCOL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {allUsers.filter(u => u.role === 'provider' && u.isProviderApproved).map(u => (
                                                            <tr key={u._id} className="hover:bg-gray-50/30 transition-all group">
                                                                <td className="px-8 py-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                            <ShieldCheck size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900 text-sm leading-tight">{u.name}</p>
                                                                            <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">ID: {u._id.slice(-6)}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6 text-center">
                                                                    <span className="text-[10px] font-bold text-gray-500">{u.email}</span>
                                                                </td>
                                                                <td className="px-8 py-6 text-right">
                                                                    <button onClick={() => handleDeleteUser(u._id)} className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-red-500 uppercase hover:bg-red-50 transition-all">
                                                                        REVOKE ACCESS
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {adminSection === 'bookings' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4 px-2">
                                            <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm"><FileText size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">Booking Ledger</h2>
                                                <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">Global Transactional Oversight</p>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                <h3 className="text-sm font-bold text-gray-800">Booking Ledger</h3>
                                                <p className="text-xs text-gray-400 mt-1 font-medium">Platform-wide transactional history and life-cycle events.</p>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ASSET ENTITY</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">HANDSHAKE</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">STATUS</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">GROSS VALUE</th>
                                                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">GOVERNANCE</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {bookings.map(booking => (
                                                            <tr key={booking._id} className="hover:bg-gray-50/30 transition-all group">
                                                                <td className="px-8 py-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                            <FileText size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900 text-sm leading-tight">{booking.serviceId?.serviceName || 'Legacy Entity'}</p>
                                                                            <p className="text-[10px] text-gray-400 font-medium mt-1">{booking.serviceId?.category || 'General Protocol'}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6 text-sm text-gray-600 font-medium">
                                                                    {new Date(booking.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                                                </td>
                                                                <td className="px-8 py-6 text-center">
                                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                        booking.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 
                                                                        booking.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                                                    }`}>
                                                                        {booking.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-6 font-bold text-gray-900 text-sm">₹{booking.serviceId?.price}</td>
                                                                <td className="px-8 py-6 text-right">
                                                                    <button className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-400 uppercase cursor-not-allowed">
                                                                        INTERCEPT
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        )}
       
            {user?.role === 'provider' && user?.isProviderApproved && (
                <div className="flex min-h-screen bg-[#f8fafc]">
                    {/* Provider Sidebar */}
                    <div className="w-80 bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen overflow-y-scroll scrollbar-hide">
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-10">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">
                                    <UserCog size={22} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">Pro-Console</h1>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 opacity-70">CONTROL PANEL V2.0</p>
                                </div>
                            </div>

                            <nav className="space-y-1.5">
                                {[
                                    { id: 'revenue', label: 'Overview', icon: BarChart3, color: 'text-emerald-500' },
                                    { id: 'new_requests', label: 'New Requests', icon: MessageSquare, color: 'text-amber-500' },
                                    { id: 'active_jobs', label: 'Active Jobs', icon: Clock, color: 'text-blue-500' },
                                    { id: 'past_jobs', label: 'Past Jobs', icon: History, color: 'text-slate-400' },
                                    { id: 'payouts', label: 'Payouts', icon: Wallet, color: 'text-indigo-500' },
                                    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, color: 'text-indigo-500' },
                                    { id: 'add_service', label: 'Create Listing', icon: CirclePlus, color: 'text-indigo-500' },
                                    { id: 'live', label: 'Live Matrix', icon: MapPin, color: 'text-rose-500' },
                                    { id: 'feedback', label: 'Feedback', icon: Star, color: 'text-yellow-500' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setProviderSection(item.id)}
                                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                                            providerSection === item.id 
                                            ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                        }`}
                                    >
                                        <item.icon size={18} className={providerSection === item.id ? item.color : 'text-slate-300 group-hover:text-slate-400'} />
                                        <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                                        {providerSection === item.id && <motion.div layoutId="providerActiveDot" className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="mt-auto p-8 border-t border-slate-50">
                            <div className="bg-slate-50 p-6 rounded-3xl flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 font-bold shadow-sm border border-slate-100">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-black text-slate-800 truncate">{user.name}</p>
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Status: Online</span>
                                </div>
                            </div>
                            <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-black text-xs uppercase tracking-widest">
                                <LogOut size={20} /> Sign Out
                            </button>
                        </div>
                    </div>

                    {/* Provider Main Content */}
                    <div className="flex-1 p-16 h-screen overflow-y-auto scroll-smooth">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={providerSection}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-6xl mx-auto"
                            >
                                {providerSection === 'revenue' && (
                                    <div className="space-y-12">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Revenue Insights</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Fiscal Performance Ledger</p>
                                            </div>
                                            <div className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-50 flex items-center gap-3">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                Live Ledger
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {[
                                                { label: 'Total Earnings', value: bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.serviceId?.price || 0), 0), icon: BarChart3, color: 'bg-emerald-500', sub: 'Gross Revenue' },
                                                { label: 'In Escrow', value: bookings.filter(b => b.payment_status === 'Paid' && b.status !== 'Cancelled').reduce((sum, b) => sum + (b.serviceId?.price || 0), 0) - payouts.filter(p => p.payout_status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0), icon: Clock, color: 'bg-amber-500', sub: 'Pending Settlement' },
                                                { label: 'Disbursed', value: payouts.filter(p => p.payout_status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0), icon: Wallet, color: 'bg-indigo-500', sub: 'Bank Distributed' }
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden group">
                                                    <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-[0.03] rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700`}></div>
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-${stat.color.split('-')[1]}-200 ${stat.color}`}>
                                                            <stat.icon size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                                            <p className="text-xs font-bold text-slate-300 uppercase leading-none mt-0.5">{stat.sub}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-4xl font-black text-slate-800 tracking-tighter">₹{stat.value.toLocaleString()}</span>
                                                        <span className="text-[10px] font-black text-slate-400">INR</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/60 border border-slate-50">
                                            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3"><Users size={24} className="text-indigo-600" /> Recent Handshakes</h3>
                                            <AnalyticsCharts bookings={bookings.filter(b => b.status === 'Completed')} />
                                        </div>
                                    </div>
                                )}

                                {(providerSection === 'new_requests' || providerSection === 'active_jobs' || providerSection === 'past_jobs') && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-6 mb-4">
                                            <div className="p-5 bg-indigo-100 text-indigo-600 rounded-3xl shadow-sm">
                                                {providerSection === 'new_requests' ? <MessageSquare size={36} /> : 
                                                 providerSection === 'active_jobs' ? <Clock size={36} /> : <History size={36} />}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                                    {providerSection === 'new_requests' ? 'New Requests' : 
                                                     providerSection === 'active_jobs' ? 'Active Matrix' : 'Job History'}
                                                </h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">
                                                    {providerSection === 'new_requests' ? 'Incoming Service Orders' : 
                                                     providerSection === 'active_jobs' ? 'Real-time Deployment Cycle' : 'Platform Transaction History'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client / Service</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Handshake Date</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol Status</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Value</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Governance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {bookings
                                                            .filter(b => {
                                                                if (providerSection === 'new_requests') return ['Pending', 'Accepted'].includes(b.status);
                                                                if (providerSection === 'active_jobs') return ['OnTheWay', 'In Progress', 'Paid'].includes(b.status);
                                                                if (providerSection === 'past_jobs') return ['Completed', 'Cancelled'].includes(b.status);
                                                                return true;
                                                            })
                                                            .map(booking => (
                                                                <tr key={booking._id} className="hover:bg-slate-50/50 transition-all group">
                                                                    <td className="px-8 py-8">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-800 text-sm mb-1">{booking.serviceId?.serviceName || 'Legacy Entity'}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{booking.userId?.name || 'Anonymous Client'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-8">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-extrabold text-slate-600 mb-0.5">{new Date(booking.date).toLocaleDateString()}</span>
                                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{booking.time} Relay</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-8 text-center">
                                                                        <select 
                                                                            value={booking.status} 
                                                                            onChange={(e) => handleUpdateBookingStatus(booking._id, e.target.value)}
                                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-2 transition-all ${
                                                                                booking.status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                                                                booking.status === 'Cancelled' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                                                                                'bg-amber-50 border-amber-200 text-amber-600 focus:border-indigo-500'
                                                                            }`}
                                                                        >
                                                                            <option value="Pending">Pending</option>
                                                                            <option value="Accepted">Accepted</option>
                                                                            <option value="OnTheWay">On The Way</option>
                                                                            <option value="In Progress">In Progress</option>
                                                                            <option value="Paid">Paid</option>
                                                                            <option value="Completed">Completed</option>
                                                                            <option value="Cancelled">Cancelled</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-8 py-8 font-black text-slate-800 text-sm tracking-tight">₹{booking.serviceId?.price || booking.serviceId?.price}</td>
                                                                    <td className="px-8 py-8 text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <button onClick={() => setActiveChatBooking(booking)} className="p-3 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 rounded-2xl transition-all"><MessageSquare size={16} /></button>
                                                                            <button onClick={() => generateInvoice(booking)} className="p-3 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-emerald-600 rounded-2xl transition-all"><FileText size={16} /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'payouts' && (
                                    <div className="space-y-12">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Payout Management</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Fund Extraction & History</p>
                                            </div>
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }} 
                                                whileTap={{ scale: 0.95 }}
                                                onClick={async () => {
                                                    try {
                                                        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/request-payout`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
                                                        toast.success('Withdrawal request submitted for review.');
                                                        fetchMyPayouts();
                                                    } catch (e) {
                                                        toast.error(e.response?.data?.message || 'Withdrawal request failed');
                                                    }
                                                }}
                                                className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center gap-3"
                                            >
                                                <Wallet size={18} /> Execute Withdrawal
                                            </motion.button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Current Withdrawable Balance</p>
                                                <div className="flex items-baseline gap-3 mb-10">
                                                    <span className="text-6xl font-black tracking-tighter">₹{payouts.filter(p => p.payout_status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0)}</span>
                                                    <span className="text-sm font-bold text-slate-500 opacity-60">Pending Settlement</span>
                                                </div>
                                                <div className="flex items-center gap-6 pt-10 border-t border-white/5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">Processing Queue</span>
                                                        <span className="text-lg font-bold text-slate-200">₹{payouts.filter(p => p.payout_status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0)}</span>
                                                    </div>
                                                    <div className="w-px h-10 bg-white/5"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">Verification Status</span>
                                                        <span className="text-lg font-bold text-emerald-400">KYC Validated</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-50">
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-6">Payout History</h3>
                                                <div className="space-y-6 max-h-[250px] overflow-y-auto pr-4 scrollbar-hide">
                                                    {payouts.map(p => (
                                                        <div key={p._id} className="flex justify-between items-center group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                                    <ClipboardList size={18} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 uppercase tabular-nums">Batch {p._id.slice(-6)}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(p.created_at || Date.now()).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-slate-800">₹{p.amount?.toLocaleString()}</p>
                                                                <span className={`text-[9px] font-black uppercase tracking-widest ${p.payout_status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{p.payout_status}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {payouts.length === 0 && <p className="text-center text-slate-400 italic text-xs py-10">No disbursement activity recorded.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'portfolio' && (
                                    <div className="space-y-12">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Service Portfolio</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Service-Level Governance Portfolio</p>
                                            </div>
                                            <button onClick={() => setProviderSection('add_service')} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center gap-3">
                                                <CirclePlus size={18} /> Provision New Entity
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {myServices.map(s => (
                                                <div key={s._id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500"></div>
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{s.category}</span>
                                                        <span className="ml-auto text-sm font-black text-slate-800">₹{s.price}</span>
                                                    </div>
                                                    <h3 className="text-xl font-black text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">{s.serviceName}</h3>
                                                    <p className="text-xs text-slate-400 font-bold mb-8 line-clamp-2 h-8">{s.description}</p>
                                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={12} className="text-indigo-400" />
                                                            <span className="text-[10px] font-black text-slate-400 capitalize">{s.location}</span>
                                                        </div>
                                                        <button onClick={() => handleRemoveMyService(s._id)} className="p-3 bg-white text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-slate-100">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {myServices.length === 0 && (
                                                <div className="col-span-full py-32 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Briefcase size={32} className="text-slate-200" /></div>
                                                    <h4 className="text-xl font-black text-slate-800 mb-2">Portfolio Empty</h4>
                                                    <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 font-bold uppercase tracking-widest leading-loose">No service entities have been provisioned in your domain namespace.</p>
                                                    <button onClick={() => setProviderSection('add_service')} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100">Genesis Implementation</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'add_service' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4">
                                            <div className="p-5 bg-emerald-100 text-emerald-600 rounded-3xl shadow-sm"><CirclePlus size={36} /></div>
                                            <div>
                                                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Genesis Entity</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Instantiate New Market Solution</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleAddService} className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Service Identity</label>
                                                <input name="serviceName" placeholder="e.g. Master Domain Cleanse" required className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm tabular-nums" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Operational Category</label>
                                                <select name="category" className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm uppercase tracking-widest appearance-none">
                                                    <option value="Cleaning">🧽 Sanitization Hub</option>
                                                    <option value="Plumbing">🚰 Hydro-Logistics</option>
                                                    <option value="Electrician">⚡ Kinetic Systems</option>
                                                    <option value="Gardening">🌻 Biological Maintenance</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Executive Overview</label>
                                                <textarea name="description" placeholder="Technical specifications and value proposition..." rows="4" className="w-full p-8 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700 leading-relaxed"></textarea>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Base Pricing Model (₹)</label>
                                                <input type="number" name="price" placeholder="1000" required className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Deployment Area</label>
                                                <input name="location" placeholder="City or District Namespace" required className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm uppercase tracking-widest" />
                                            </div>
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="md:col-span-2 bg-slate-900 text-white py-8 rounded-[2rem] font-black text-lg shadow-2xl shadow-slate-900/40 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4">
                                                <CirclePlus size={24} /> Commit Entry to Network
                                            </motion.button>
                                        </form>
                                    </div>
                                )}

                                {providerSection === 'live' && (
                                    <div className="space-y-12">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-6">
                                                <div className="p-5 bg-rose-100 text-rose-600 rounded-3xl shadow-sm"><MapPin size={36} /></div>
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fleet Matrix</h2>
                                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Real-time Node Telemetry</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Sync</span>
                                                    <span className={`text-[10px] font-black uppercase ${isSimulating ? 'text-rose-500' : 'text-emerald-500'}`}>{isSimulating ? 'Live Emulation' : 'Native GPS'}</span>
                                                </div>
                                                <button onClick={() => setIsSimulating(!isSimulating)} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${isSimulating ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-600 text-white shadow-indigo-100'}`}>
                                                    {isSimulating ? 'Terminate Test' : 'Run Field Test'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-1 space-y-8">
                                                <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><QrCode size={24} className="text-indigo-400" /></div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Node ID</p>
                                                            <p className="text-sm font-black tabular-nums tracking-tighter">{user._id}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-6 rounded-[2rem] flex items-center justify-center shadow-inner">
                                                        <QRCodeSVG value={user._id} size={180} />
                                                    </div>
                                                    <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-8 opacity-60">Verification Credentials</p>
                                                </div>

                                                <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-6 flex justify-between items-center">
                                                        Active Relays
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px]">{bookings.filter(b => b.status === 'OnTheWay').length}</span>
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {bookings.filter(b => b.status === 'OnTheWay').map(b => (
                                                            <div key={b._id} className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100">
                                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100"><Users size={18} /></div>
                                                                <div>
                                                                    <p className="text-xs font-black text-slate-800 truncate max-w-[120px]">{b.serviceId?.serviceName}</p>
                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tabular-nums">ID: {b._id.slice(-6)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {bookings.filter(b => b.status === 'OnTheWay').length === 0 && <p className="text-center text-slate-400 text-[10px] italic py-4">No active nodes in field.</p>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-2 bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 h-[600px] relative">
                                                {bookings.some(b => b.status === 'OnTheWay') ? (
                                                    <div className="h-full w-full">
                                                        {bookings.filter(b => b.status === 'OnTheWay').slice(0, 1).map(booking => (
                                                            <LiveTrackingMap 
                                                                key={booking._id}
                                                                providerLocation={liveLocations[booking._id]} 
                                                                customerLocation={customerLocations[booking._id]} 
                                                                providerName={user.name} 
                                                                userRole="provider"
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center">
                                                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6 opacity-30"><ShieldOff size={44} className="text-slate-400" /></div>
                                                        <h4 className="text-xl font-black text-slate-800 opacity-20 uppercase tracking-widest">No Active Matrix</h4>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-8 left-8 right-8 bg-slate-900/90 backdrop-blur-md p-6 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-3 h-3 rounded-full ${bookings.some(b => b.status === 'OnTheWay') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                                        <span className="text-xs font-black uppercase tracking-widest">{bookings.some(b => b.status === 'OnTheWay') ? 'Synchronizing Telemetry' : 'Relay Standby'}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60 tabular-nums">Coordinates: 0.00°N 0.00°E</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'feedback' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4">
                                            <div className="p-5 bg-yellow-100 text-yellow-600 rounded-3xl shadow-sm"><Star size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Market Reputation</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Consumer Satisfaction Metrics</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
                                            <div className="flex flex-col md:flex-row items-center gap-16 mb-16">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-5xl font-black text-slate-900 tracking-tighter mb-2">4.9</p>
                                                    <div className="flex gap-1 text-xl text-yellow-400 mb-4">
                                                        {[1, 2, 3, 4, 5].map(s => <span key={s}>★</span>)}
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Rating</p>
                                                </div>
                                                <div className="flex-1 space-y-4 w-full">
                                                    {[
                                                        { label: 'Integrity', value: 98, color: 'bg-emerald-500' },
                                                        { label: 'Technical Proficiency', value: 94, color: 'bg-indigo-500' },
                                                        { label: 'Timeline Protocol', value: 91, color: 'bg-amber-500' }
                                                    ].map((m, i) => (
                                                        <div key={i} className="space-y-2">
                                                            <div className="flex justify-between text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                                                <span>{m.label}</span>
                                                                <span>{m.value}%</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 1, delay: i*0.2 }} className={`h-full ${m.color}`}></motion.div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-12 border-t border-slate-50">
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10">Historical Feedback Stream</h3>
                                                <ReviewsList providerId={user._id} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            )}


            {user?.role === 'customer' && (
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex justify-between items-center mb-12">
                        <motion.h1 initial={{ x: -20 }} animate={{ x: 0 }} className="text-2xl font-bold text-gray-800 tracking-tight font-sans">
                            My Bookings
                        </motion.h1>
                        <div className="bg-blue-50 px-4 py-2 rounded-full flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                            <span className="text-sm font-bold text-blue-700 uppercase tracking-widest">CUSTOMER</span>
                        </div>
                    </div>

                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8">
                        <h2 className="text-xl font-black mb-8 text-gray-900 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><FileText size={24} /></div>
                            My Booking History
                        </h2>
                    
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">SERVICE</th>
                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">DATE & TIME</th>
                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">STATUS</th>
                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">AMOUNT</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedBookings.map(booking => (
                                <tr key={booking._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors">
                                    <td className="p-4 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-sm">{booking.serviceId?.serviceName || 'Unknown Service'}</span>
                                            <span className="text-xs text-gray-400 font-medium">{booking.serviceId?.category || 'General'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="flex flex-col text-xs font-semibold text-gray-600">
                                            <span>{new Date(booking.date).toLocaleDateString()}</span>
                                            <span className="text-gray-400 font-medium">{booking.time || '00:00'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                            booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                            booking.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                                            ['In Progress', 'OnTheWay', 'Accepted'].includes(booking.status) ? 'bg-blue-50 text-blue-600' :
                                            booking.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>{booking.status === 'Completed' ? 'Completed' : booking.status}</span>
                                    </td>
                                    <td className="p-4 align-top font-bold text-gray-700 text-sm">₹{booking.serviceId?.price}</td>
                                    <td className="p-4 align-top">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {user.role === 'customer' && ['Pending', 'Accepted', 'OnTheWay', 'In Progress', 'Completed'].includes(booking.status) && booking.payment_status !== 'Paid' && (
                                                <button onClick={() => handlePay(booking._id, booking.serviceId?.price)} className="flex items-center gap-2 px-4 py-2 bg-[#00b894] text-white rounded-md text-xs font-bold hover:bg-[#00a383] transition shadow-sm whitespace-nowrap">
                                                    <CreditCard size={14} strokeWidth={3} /> Pay Now
                                                </button>
                                            )}
                                            
                                            {user.role === 'provider' && (
                                                <select value={booking.status} onChange={(e) => handleUpdateBookingStatus(booking._id, e.target.value)} className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-md px-2 py-1 outline-none">
                                                    <option value="Pending">Pending</option>
                                                    <option value="Accepted">Accepted</option>
                                                    <option value="OnTheWay">On The Way</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            )}

                                            {user.role === 'customer' && booking.status === 'Completed' && (
                                                <button onClick={() => { setSelectedBookingForReview(booking._id); setShowReviewModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#ffeaa7] text-[#d63031] rounded-md text-xs font-bold hover:bg-[#ffe082] transition shadow-sm whitespace-nowrap">
                                                    <Star size={14} fill="#d63031" /> Review
                                                </button>
                                            )}

                                            <button onClick={() => generateInvoice(booking)} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#81ecec] text-[#00cec9] rounded-md text-xs font-bold hover:bg-[#e0ffff] transition whitespace-nowrap">
                                                <FileText size={14} /> Invoice
                                            </button>

                                            {['Accepted', 'OnTheWay', 'In Progress', 'Paid', 'Completed'].includes(booking.status) && (
                                                <button onClick={() => setActiveChatBooking(booking)} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#a29bfe] text-[#6c5ce7] rounded-md text-xs font-bold hover:bg-[#f0f0ff] transition relative whitespace-nowrap">
                                                    <MessageSquare size={14} /> Chat
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                                                </button>
                                            )}

                                            {user.role === 'customer' && ['Accepted', 'OnTheWay', 'In Progress'].includes(booking.status) && (
                                                <button onClick={() => { setSelectedBookingId(booking._id); setShowScanner(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#2d3436] text-white rounded-md text-xs font-bold hover:bg-black transition shadow-sm whitespace-nowrap">
                                                    <QrCode size={14} /> Scan QR
                                                </button>
                                            )}

                                            {user?.role === 'customer' && booking.status !== 'Cancelled' && (
                                                <button onClick={() => { setSelectedBookingForComplaint(booking._id); setShowComplaintModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-[#eb4d4b] rounded-md text-xs font-bold hover:bg-red-50 transition uppercase tracking-wider">
                                                    <TriangleAlert size={12} className="text-orange-500" /> Report Issue
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>

                    {/* Desktop Live Maps Section */}
                    {bookings.some(b => b.status === 'OnTheWay') && (
                        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-12">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div> Live Fleet Matrix</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {bookings.filter(b => b.status === 'OnTheWay').map(booking => (
                                    <div key={booking._id} className="bg-white p-4 rounded-[2rem] shadow-xl border border-blue-50">
                                        <div className="flex justify-between items-center mb-4 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black">🚙</div>
                                                <div>
                                                    <h4 className="font-black text-gray-800 text-sm leading-tight">{booking.serviceId?.serviceName}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.role === 'customer' ? 'Provider en route' : 'Sharing your location'}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter shadow-inner">Active Relay</span>
                                        </div>
                                        <LiveTrackingMap 
                                            providerLocation={liveLocations[booking._id]} 
                                            customerLocation={customerLocations[booking._id]} 
                                            providerName={booking.providerId?.name || "Provider"} 
                                            userRole={user?.role}
                                        />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {showScanner && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[2000] p-4">
                        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative">
                            <button onClick={() => setShowScanner(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"><X size={24} /></button>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><QrCode size={32} /></div>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight">Identity Hub</h2>
                                <p className="text-sm text-gray-500 mt-2">Scan the provider's screen to unlock service</p>
                            </div>
                            <div className="rounded-3xl overflow-hidden border-4 border-blue-50 shadow-inner bg-black">
                                <QRScanner onScan={handleScan} />
                            </div>
                            <button onClick={() => setShowScanner(false)} className="mt-8 w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-colors">Abort Access</button>
                        </motion.div>
                    </motion.div>
                )}

                {showComplaintModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[2000] p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
                            <h2 className="text-2xl font-black text-red-600 mb-2 flex items-center gap-2 px-1"><TriangleAlert size={24} /> Report Incident</h2>
                            <p className="text-sm text-gray-500 mb-6 px-1">Our L1-Support team will review this investigation within 24 hours.</p>
                            <textarea className="w-full bg-red-50 border-2 border-red-100 p-5 rounded-3xl text-red-900 outline-none focus:border-red-500 transition-colors font-semibold" rows="4" value={complaintText} onChange={(e) => setComplaintText(e.target.value)} placeholder="Explain the issue in detail..."></textarea>
                            <div className="flex gap-4 mt-8">
                                <button onClick={() => setShowComplaintModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-sm uppercase">Cancel</button>
                                <button onClick={handleSubmitComplaint} className="flex-2 bg-red-600 text-white py-4 px-8 rounded-2xl font-black text-sm uppercase shadow-lg shadow-red-200">Submit Report</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {showReviewModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[2000] p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl text-center">
                            <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Star size={40} fill="currentColor" /></div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">Rate Your Pro</h2>
                            <p className="text-sm text-gray-500 mb-8 mt-1">Help the community by sharing your experience!</p>
                            <div className="flex justify-center gap-3 text-4xl mb-8">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <motion.button key={s} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => setRating(s)} className={`${s <= rating ? 'text-yellow-400' : 'text-gray-200'} transition-colors drop-shadow-sm`}>★</motion.button>
                                ))}
                            </div>
                            <textarea className="w-full bg-gray-50 border-2 border-transparent p-5 rounded-3xl text-gray-800 outline-none focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-50 transition-all font-semibold" rows="3" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="What stood out the most?"></textarea>
                            <div className="flex flex-col gap-3 mt-8">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmitReview} className="w-full bg-yellow-400 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-yellow-100">Post Public Review</motion.button>
                                <button onClick={() => setShowReviewModal(false)} className="text-gray-400 text-xs font-black uppercase tracking-widest hover:text-gray-600 transition-colors py-2">Skip for now</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                
                {activeChatBooking && (
                    <ChatModal booking={activeChatBooking} onClose={() => setActiveChatBooking(null)} />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Dashboard;
