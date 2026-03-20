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
import { MessageSquare, QrCode, AlertTriangle, FileText, Trash2, ShieldOff, PlusCircle, ArrowUpRight, Wallet, X, RotateCcw, XCircle, Star } from 'lucide-react';
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

    useEffect(() => {
        socket.on('receive_location', (data) => {
            setLiveLocations(prev => ({ ...prev, [data.bookingId]: { lat: data.lat, lng: data.lng } }));
        });
        return () => { socket.off('receive_location'); };
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
        }
        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); if (simInterval) clearInterval(simInterval); };
    }, [bookings, user, isSimulating]);

    useEffect(() => {
        if (user) {
            fetchBookings();
            if (user.role === 'admin') { fetchUnapprovedProviders(); fetchComplaints(); fetchAllUsers(); fetchAllServices(); }
            if (user.role === 'provider') fetchMyServices();
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-12">
                <motion.h1 initial={{ x: -20 }} animate={{ x: 0 }} className="text-4xl font-black text-gray-900 tracking-tight">
                    {user.role === 'customer' && 'My Bookings'}
                    {user.role === 'provider' && 'My Jobs'}
                    {user.role === 'admin' && 'Admin Dashboard'}
                </motion.h1>
                <div className="bg-blue-50 px-4 py-2 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    <span className="text-sm font-bold text-blue-700 uppercase tracking-widest">{user.role}</span>
                </div>
            </div>

            {user.role === 'admin' && <AnalyticsCharts bookings={bookings} role={user.role} token={user.token} />}

            {user.role === 'provider' && user.isProviderApproved && (
                <div className="mb-12">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-to-br from-green-500 to-emerald-700 rounded-3xl p-8 mb-10 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 border-4 border-white">
                        <div>
                            <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Available Balance</p>
                            <h3 className="text-6xl font-black">₹{bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.serviceId?.price || 0), 0).toLocaleString()}</h3>
                        </div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toast.info('Payout requests are processed on the 1st of every month.')} className="bg-white text-green-700 font-black px-10 py-5 rounded-2xl shadow-xl hover:bg-gray-50 transition-colors">Request Payout</motion.button>
                    </motion.div>

                    <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-gray-800"><PlusCircle size={28} className="text-blue-600" /> Offering New Service</h2>
                    <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleAddService} className="bg-white p-8 rounded-3xl shadow-xl mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 border border-gray-100">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Service Title</label>
                            <input name="serviceName" placeholder="e.g. Master Plumbing" required className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-semibold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Category</label>
                            <select name="category" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-semibold">
                                <option value="Cleaning">🧽 Cleaning</option>
                                <option value="Plumbing">🚰 Plumbing</option>
                                <option value="Electrician">⚡ Electrician</option>
                                <option value="Gardening">🌻 Gardening</option>
                            </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Work Description</label>
                            <textarea name="description" placeholder="Describe your expertise..." rows="3" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-semibold"></textarea>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Base Price (₹)</label>
                            <input type="number" name="price" placeholder="500" required className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-semibold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Service Area</label>
                            <input name="location" placeholder="City or Neighborhood" required className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-semibold" />
                        </div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="md:col-span-2 bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-blue-700">Create My Listing</motion.button>
                    </motion.form>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="text-center md:text-left">
                                <h2 className="text-2xl font-black mb-2">Instant Verification</h2>
                                <p className="text-gray-500 mb-6 max-w-sm">Customers scan this code to verify your arrival and start the service timer safely.</p>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setIsSimulating(!isSimulating)} className={`px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${isSimulating ? 'bg-red-100 text-red-600 border-2 border-red-200' : 'bg-indigo-600 text-white'}`}>
                                    {isSimulating ? <RotateCcw size={20} className="animate-spin" /> : <ArrowUpRight size={20} />}
                                    {isSimulating ? 'Live Simulation Active' : 'Test Real-time Tracking'}
                                </motion.button>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-3xl border-2 border-blue-100 shadow-inner">
                                <QRCodeSVG value={user._id} size={160} />
                                <p className="text-[10px] text-center mt-2 font-black text-blue-400 uppercase tracking-tighter">Your unique Provider ID</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col justify-center text-center">
                            <h3 className="text-xl font-black mb-2">Service Portfolio</h3>
                            <p className="text-sm text-gray-500 mb-6">You have {myServices.length} active listings on the marketplace.</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {myServices.map(s => (
                                    <span key={s._id} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{s.serviceName}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-black mb-6 text-gray-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Wallet size={24} /></div>
                        Job Pipeline
                    </h2>
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit mb-8 shadow-inner">
                        {['New Requests', 'Active Jobs', 'Past Jobs'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2.5 px-6 rounded-xl text-sm font-black transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}>{tab}</button>
                        ))}
                    </div>
                </div>
            )}

            {user.role === 'admin' && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-12 mb-16">
                    <section>
                        <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-red-600"><AlertTriangle /> Pending Approvals</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {unapprovedProviders.map(p => (
                                <motion.div layout id={`provider-${p._id}`} key={p._id} className="p-6 bg-white rounded-3xl shadow-lg border-2 border-orange-50 flex flex-col gap-4 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                                    <div className="z-10">
                                        <h3 className="font-black text-lg">{p.name}</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase">{p.email}</p>
                                    </div>
                                    <button onClick={() => handleApproveProvider(p._id)} className="w-full bg-black text-white py-3 rounded-2xl font-black text-sm hover:bg-gray-800 transition-colors z-10">Authorize Access</button>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-red-500"><ShieldOff /> Active Disputes</h2>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {complaints.map(c => (
                                    <div key={c._id} className="p-5 bg-red-50 rounded-2xl border-l-8 border-red-500">
                                        <p className="font-black text-red-900 mb-1">Issue reported by Customer</p>
                                        <p className="text-sm text-red-700 leading-relaxed mb-4">{c.description}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleResolveComplaint(c._id, 'dismissed')} className="px-4 py-2 bg-white text-gray-500 rounded-xl text-xs font-black shadow-sm uppercase">Dismiss</button>
                                            <button onClick={() => handleResolveComplaint(c._id, 'refunded')} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-sm uppercase">Process Refund</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl text-white">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-blue-400"><MessageSquare size={28} /> Admin Broadcast</h2>
                            <p className="text-gray-400 text-sm mb-6 font-bold uppercase tracking-wider">Send an urgent alert to all active users</p>
                            <form onSubmit={handleBroadcast} className="space-y-4">
                                <textarea className="w-full bg-gray-800 border-2 border-gray-700 p-5 rounded-2xl text-white outline-none focus:border-blue-500 transition-colors" rows="4" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Type global notification..."></textarea>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg">Emit Broadcast Signal</motion.button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            )}

            {(user.role === 'customer' || (user.role === 'provider' && user.isProviderApproved)) && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8">
                    <h2 className="text-3xl font-black mb-8 text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><FileText size={24} /></div>
                        Booking Ledger
                    </h2>
                    
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Service Item</th>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Schedule</th>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Total cost</th>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {displayedBookings.map(booking => (
                                        <motion.tr layout key={booking._id} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-800 group-hover:text-blue-600 transition-colors">{booking.serviceId?.serviceName}</span>
                                                    <span className="text-xs text-gray-400 font-bold uppercase md:hidden">{new Date(booking.date).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 hidden md:table-cell">
                                                <span className="text-sm font-bold text-gray-600">{new Date(booking.date).toLocaleDateString()}</span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${
                                                    booking.status === 'Completed' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                    booking.status === 'Pending' ? 'bg-orange-100 text-orange-700 border border-orange-200 animate-pulse' :
                                                    booking.status === 'Paid' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>{booking.status}</span>
                                            </td>
                                            <td className="p-6 font-black text-gray-900">₹{booking.serviceId?.price}</td>
                                            <td className="p-6">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {user.role === 'customer' && booking.status === 'Pending' && (
                                                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => handlePay(booking._id, booking.serviceId?.price)} className="p-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-100 hover:bg-green-700"><Wallet size={18} /></motion.button>
                                                    )}
                                                    
                                                    {user.role === 'provider' && (
                                                        <select value={booking.status} onChange={(e) => handleUpdateBookingStatus(booking._id, e.target.value)} className="bg-gray-50 border-none text-xs font-black rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600">
                                                            <option value="Pending">Pending</option>
                                                            <option value="Accepted">Accepted</option>
                                                            <option value="OnTheWay">On The Way</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Paid">Paid</option>
                                                            <option value="Completed">Completed</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                        </select>
                                                    )}

                                                    {['Accepted', 'OnTheWay', 'In Progress', 'Paid'].includes(booking.status) && (
                                                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => setActiveChatBooking(booking)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 relative">
                                                            <MessageSquare size={18} />
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                                                        </motion.button>
                                                    )}

                                                    {user.role === 'customer' && ['Accepted', 'OnTheWay'].includes(booking.status) && (
                                                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => { setSelectedBookingId(booking._id); setShowScanner(true); }} className="p-3 bg-black text-white rounded-xl shadow-lg hover:bg-gray-800"><QrCode size={18} /></motion.button>
                                                    )}

                                                    {user.role === 'customer' && booking.status === 'Completed' && (
                                                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => { setSelectedBookingForReview(booking._id); setShowReviewModal(true); }} className="p-3 bg-yellow-400 text-white rounded-xl shadow-lg hover:bg-yellow-500"><Star size={18} /></motion.button>
                                                    )}

                                                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => generateInvoice(booking)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 focus:ring-2 ring-blue-300"><FileText size={18} /></motion.button>
                                                    
                                                    {user.role === 'customer' && booking.status !== 'Cancelled' && (
                                                        <button onClick={() => { setSelectedBookingForComplaint(booking._id); setShowComplaintModal(true); }} className="text-red-500 hover:text-red-700 transition-colors tooltip flex items-center justify-center p-3" title="Report Issue">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

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
                                        <LiveTrackingMap providerLocation={liveLocations[booking._id]} providerName="Service Pro" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
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
                            <h2 className="text-2xl font-black text-red-600 mb-2 flex items-center gap-2 px-1"><AlertTriangle size={24} /> Report Incident</h2>
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

            <ReviewsList reviews={[]} />

        </motion.div>
    );
};

export default Dashboard;
