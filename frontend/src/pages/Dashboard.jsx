import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import QRScanner from '../components/QRScanner';
import AnalyticsCharts from '../components/AnalyticsCharts';
import LiveTrackingMap from '../components/LiveTrackingMap';
import generateInvoice from '../utils/generateInvoice';
import socket from '../utils/socket';
import {
    LayoutDashboard, Users, MessageSquare, QrCode, ClipboardList,
    TriangleAlert, Star, CircleCheck, Clock, ShieldCheck,
    MapPin, User, Settings, LogOut, FileText, ShieldOff,
    CirclePlus, ArrowUpRight, CreditCard, X, RotateCcw,
    CircleX, Wallet, UserCheck, Trash2, Tag, BarChart3,
    Briefcase, History, UserCog, Calendar, Crown, Zap,
    ArrowRight, Trophy, Truck, Wrench, Home
} from 'lucide-react';
import ReviewsList from '../components/ReviewsList';
import ChatModal from '../components/ChatModal';
import ImageUpload from '../components/ImageUpload';
import { serviceCategories } from '../data/serviceCategories';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, isSidebarOpen, setSidebarOpen, toggleSidebar } = useContext(AuthContext);
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [activeTab, setActiveTab] = useState(user?.role === 'provider' ? 'revenue' : 'bookings');
    const [customerSection, setCustomerSection] = useState(searchParams.get('tab') || 'bookings'); // explore, custom_jobs, bookings, subscriptions, settings

    // Sync customerSection with URL query param
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['explore', 'custom_jobs', 'bookings', 'subscriptions', 'settings'].includes(tab)) {
            setCustomerSection(tab);
        }
    }, [searchParams]);

    const updateTab = (newTab) => {
        setSearchParams({ tab: newTab });
        setCustomerSection(newTab);
    };

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);

    const handlePostJob = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const jobData = {
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            budget: formData.get('budget'),
            address: formData.get('address')
        };
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/custom-jobs`, jobData, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Custom job posted successfully!');
            setShowJobModal(false);
            fetchMyCustomJobs();
        } catch (e) { toast.error('Failed to post job'); }
    };

    const handleSubmitBid = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const bidData = {
            bid_amount: formData.get('bid_amount'),
            estimated_days: formData.get('estimated_days'),
            message: formData.get('message')
        };
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/custom-jobs/${selectedJobForBid.id}/bid`, bidData, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Bid submitted successfully!');
            setShowBidModal(false);
            fetchMarketplaceJobs();
        } catch (e) { toast.error(e.response?.data?.message || 'Failed to submit bid'); }
    };

    const handleAcceptBid = async (bidId) => {
        if (!window.confirm('Accept this bid? Other bids will be rejected.')) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/custom-jobs/bids/${bidId}/accept`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Bid accepted! A new booking has been created.');
            fetchMyCustomJobs();
            fetchBookings();
        } catch (e) { toast.error('Failed to accept bid'); }
    };
    const [rating, setRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);
    const [customerLocations, setCustomerLocations] = useState({});
    const [stats, setStats] = useState({ totalRevenue: 0, pendingPayouts: 0, completedJobs: 0, activeJobs: 0 });
    const [payouts, setPayouts] = useState([]);
    const [offers, setOffers] = useState([]);
    const [adminSection, setAdminSection] = useState('analytics'); // analytics, users, providers, payouts, bookings, broadcast, disputes, discounts
    const [providerSection, setProviderSection] = useState('revenue'); // revenue, new_requests, active_jobs, past_jobs, portfolio, add_service, payouts, live, feedback
    const [serviceImageUrl, setServiceImageUrl] = useState('');
    const [selectedAddCategory, setSelectedAddCategory] = useState('');
    const [availability, setAvailability] = useState({ start_time: '09:00', end_time: '18:00', blocked_dates: [] });
    const [newBlockedDate, setNewBlockedDate] = useState('');
    const [mySubscriptions, setMySubscriptions] = useState([]);
    const [expandedMapId, setExpandedMapId] = useState(null);
    const [allUserSubscriptions, setAllUserSubscriptions] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [customJobs, setCustomJobs] = useState([]);
    const [openJobs, setOpenJobs] = useState([]);
    const [activeJobBids, setActiveJobBids] = useState({});
    const [showJobModal, setShowJobModal] = useState(false);

    // Helpers for Live Tracking & ETA calculation
    const calculateDistance = (pLat, pLng, cLat, cLng) => {
        if (!pLat || !pLng || !cLat || !cLng) return null;
        const R = 6371; // Earth's radius in KM
        const dLat = (cLat - pLat) * Math.PI / 180;
        const dLng = (cLng - pLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(pLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(0.1, R * c); // Distance in KM
    };

    const calculateETA = (distance) => {
        if (!distance) return null;
        const avgSpeed = 20; // 20km/h for urban areas
        const timeInHours = distance / avgSpeed;
        return Math.max(1, Math.round(timeInHours * 60)); // ETA in Minutes (at least 1 min)
    };
    const [showBidModal, setShowBidModal] = useState(false);
    const [selectedJobForBid, setSelectedJobForBid] = useState(null);

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
            if (user.role === 'customer') {
                fetchBookings();
                fetchMySubscriptions();
                fetchMyCustomJobs();
            }
            if (user.role === 'admin') {
                fetchUnapprovedProviders(); fetchComplaints(); fetchAllUsers(); fetchAllServices(); fetchPayouts(); fetchOffers();
                fetchAllUserSubscriptions();
                fetchSubscriptionPlans();
                fetchBookings(); // This will trigger setLoading(false)
            }
            if (user.role === 'provider') {
                fetchBookings();
                fetchMyServices();
                fetchMyPayouts();
                fetchAvailability();
                fetchMarketplaceJobs();
            }
        }
    }, [user]);

    const fetchAllUserSubscriptions = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/admin/all`, { headers: { Authorization: `Bearer ${user.token}` } });
            setAllUserSubscriptions(res.data);
        } catch (e) { console.error("Error fetching all subscriptions:", e); }
    };

    const fetchSubscriptionPlans = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/plans`);
            setAllPlans(res.data);
        } catch (e) { console.error("Error fetching plans:", e); }
    };

    const fetchMyCustomJobs = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/custom-jobs/my-jobs`, { headers: { Authorization: `Bearer ${user.token}` } });
            if (Array.isArray(res.data)) {
                setCustomJobs(res.data);
                res.data.forEach(job => { if (job.id) fetchBidsForJob(job.id); });
            }
        } catch (e) {
            console.error("Error fetching custom jobs:", e);
            setCustomJobs([]);
        }
    };

    const fetchMarketplaceJobs = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/custom-jobs/open`, { headers: { Authorization: `Bearer ${user.token}` } });
            setOpenJobs(res.data);
        } catch (e) { console.error("Error fetching marketplace:", e); }
    };

    const fetchBidsForJob = async (jobId) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/custom-jobs/${jobId}/bids`, { headers: { Authorization: `Bearer ${user.token}` } });
            setActiveJobBids(prev => ({ ...prev, [jobId]: res.data }));
        } catch (e) { console.error("Error fetching bids:", e); }
    };

    const fetchMySubscriptions = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/my-active`, { headers: { Authorization: `Bearer ${user.token}` } });
            setMySubscriptions(res.data);
        } catch (e) { console.error("Error fetching subscriptions:", e); }
    };

    const fetchAvailability = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/availability/${user.id || user._id}`);
            if (res.data.settings) setAvailability(res.data.settings);
        } catch (e) { console.error("Error fetching availability:", e); }
    };

    const handleUpdateAvailability = async (e) => {
        if (e) e.preventDefault();
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/availability`, availability, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            toast.success('Schedule updated successfully');
        } catch (e) { toast.error('Failed to update schedule'); }
    };

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

    const handleSubmitReview = async () => {
        if (!reviewComment.trim()) return toast.warn('Please provide a comment');
        if (!selectedBookingForReview) return toast.error('Booking ID is missing');
        
        console.log(`[DEBUG_FRONTEND] Review Submission | BookingID: ${selectedBookingForReview}`);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/reviews`, {
                bookingId: selectedBookingForReview,
                rating,
                comment: reviewComment
            }, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Review posted successfully');
            setShowReviewModal(false);
            setReviewComment('');
            setRating(5);
            fetchBookings();
        } catch (e) { 
            const errorMsg = e.response?.data?.message || 'Failed to post review';
            toast.error(errorMsg);
            console.error('[REVIEW_POST_ERROR]', e);
        }
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
        const serviceData = {
            serviceName: formData.get('serviceName'),
            category: formData.get('category'),
            description: formData.get('description'),
            price: formData.get('price'),
            location: formData.get('location'),
            image_url: serviceImageUrl
        };
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services`, serviceData, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success('Service added');
            e.target.reset();
            setServiceImageUrl('');
            fetchMyServices();
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
        if (import.meta.env.VITE_MOCK_PAYMENT === 'true') {
            toast.info("Simulating payment (Mock Mode)...");
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/verify`, {
                    bookingId,
                    razorpay_order_id: 'test',
                    razorpay_payment_id: 'test',
                    razorpay_signature: 'test'
                }, config);
                toast.success("Mock Payment successful!");
                fetchBookings();
            } catch (err) { toast.error("Mock payment failed"); }
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            // 1. Create Order
            const { data: order } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/create-order`, { bookingId, amount }, config);
            // ... (rest of the real Razorpay flow)
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
                amount: order.amount,
                currency: order.currency,
                name: 'SafeLine Service',
                description: `Payment for booking #${bookingId.slice(-6)}`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/verify`, {
                            bookingId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        }, config);
                        toast.success("Payment successful! Service unlocked.");
                        fetchBookings();
                    } catch (err) { toast.error("Payment verification failed"); }
                },
                prefill: { name: user.name, email: user.email },
                theme: { color: '#4f46e5' },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) { toast.error(error.response?.data?.message || "Failed to initiate payment"); }
    };


    const handleScan = async (scannedData) => {
        if (!selectedBookingId) return;
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings/verify-provider`, { bookingId: selectedBookingId, scannedProviderId: scannedData }, { headers: { Authorization: `Bearer ${user.token}` } });
            toast.success(res.data.message); setShowScanner(false); fetchBookings();
        } catch (e) { toast.error('Verification failed'); }
    };

    if (loading) return <div className="p-8 text-center text-blue-600 font-bold animate-pulse">{t('home.loading_details')}</div>;

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
                                { id: 'analytics', label: t('dashboard.sidebar.analytics'), icon: <LayoutDashboard size={20} /> },
                                { id: 'users', label: t('dashboard.sidebar.users'), icon: <Users size={20} /> },
                                { id: 'manageProviders', label: t('dashboard.sidebar.manage_providers'), icon: <UserCheck size={20} /> },
                                { id: 'providers', label: t('dashboard.sidebar.provider_intake'), icon: <Clock size={20} />, badge: unapprovedProviders.length },
                                { id: 'payouts', label: t('dashboard.sidebar.payout'), icon: <Wallet size={20} /> },
                                { id: 'bookings', label: t('dashboard.sidebar.booking_ledger'), icon: <ClipboardList size={20} /> },
                                { id: 'broadcast', label: t('dashboard.sidebar.broadcast'), icon: <MessageSquare size={20} /> },
                                { id: 'discounts', label: t('dashboard.sidebar.offers'), icon: <Tag size={20} /> },
                                { id: 'subscriptions', label: "Subscriptions", icon: <Crown size={20} /> },
                                { id: 'disputes', label: t('dashboard.sidebar.issues'), icon: <ShieldOff size={20} />, badge: complaints.length },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setAdminSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left relative group ${adminSection === item.id
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
                                    <span>{t('dashboard.sidebar.sign_out')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 mt-auto">
                            <div className="bg-white/5 rounded-3xl p-6 flex items-center justify-between">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('dashboard.sidebar.protocol_stable')}</span>
                                <Settings size={16} className="text-gray-500 hover:text-white cursor-pointer transition-colors" />
                            </div>
                        </div>
                    </motion.aside>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto max-h-screen">
                        <header className="flex justify-between items-center px-12 py-6 bg-white border-b border-gray-100">
                            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                                <span className="hover:text-gray-600 cursor-pointer">{t('dashboard.header.dashboard')}</span>
                                <span>&rsaquo;</span>
                                <span className="text-gray-900 font-semibold capitalize">
                                    {adminSection === 'manageProviders' ? t('dashboard.sidebar.manage_providers') :
                                        adminSection === 'analytics' ? t('dashboard.sidebar.analytics') :
                                            adminSection === 'bookings' ? t('dashboard.sidebar.booking_ledger') :
                                                adminSection === 'disputes' ? t('dashboard.sidebar.issues') :
                                                    adminSection === 'users' ? t('dashboard.sidebar.users') :
                                                        adminSection === 'payouts' ? t('dashboard.sidebar.payout') :
                                                            adminSection === 'broadcast' ? t('dashboard.sidebar.broadcast') :
                                                                adminSection === 'subscriptions' ? "Subscriptions" :
                                                                    adminSection === 'discounts' ? t('dashboard.sidebar.offers') : t('dashboard.sidebar.provider_intake')}
                                </span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900 leading-none">{user?.name || 'admin'}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">admin • {t('dashboard.header.super_admin')}</p>
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
                                        {adminSection === 'manageProviders' ? t('dashboard.sidebar.manage_providers') :
                                            adminSection === 'analytics' ? t('dashboard.sidebar.analytics') :
                                                adminSection === 'bookings' ? t('dashboard.sidebar.booking_ledger') :
                                                    adminSection === 'disputes' ? t('dashboard.sidebar.issues') :
                                                        adminSection === 'users' ? t('dashboard.sidebar.users') :
                                                            adminSection === 'payouts' ? t('dashboard.sidebar.payout') :
                                                                adminSection === 'broadcast' ? t('dashboard.sidebar.broadcast') :
                                                                    adminSection === 'subscriptions' ? "Subscriptions" :
                                                                        adminSection.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">{t('dashboard.header.global_governance', { section: adminSection })}</p>
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
                                                        {t('dashboard.sections.analytics.live_fleet')}
                                                    </h2>
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                        {bookings.filter(b => b.status === 'OnTheWay').map(booking => (
                                                            <div key={booking._id} className="bg-white p-6 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 hover:border-blue-200 transition-all">
                                                                <div className="flex justify-between items-center mb-6 px-4">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">🚙</div>
                                                                        <div>
                                                                            <h4 className="font-black text-gray-900 text-base leading-tight tracking-tight">{booking.serviceId?.serviceName}</h4>
                                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em] mt-0.5">{t('dashboard.sections.analytics.dispatch_active')}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{t('dashboard.sections.analytics.realtime_relay')}</p>
                                                                        <p className="text-xs font-bold text-gray-400">{t('dashboard.sections.users.id')}: #{booking._id.slice(-6)}</p>
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
                                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">{t('dashboard.sidebar.payout')}</h2>
                                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('dashboard.sections.payouts.governance')}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white px-10 py-5 rounded-[2.5rem] shadow-xl border border-gray-50 flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('dashboard.sections.payouts.reserve')}</p>
                                                        <p className="text-3xl font-black text-gray-900 leading-none tracking-tighter">₹{payouts.filter(p => p.payout_status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse"><Wallet size={24} /></div>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                    <h3 className="text-sm font-bold text-gray-800">{t('dashboard.sections.payouts.directory')}</h3>
                                                    <p className="text-xs text-gray-400 mt-1 font-medium">{t('dashboard.sections.payouts.listing')}</p>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.payouts.organization')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t('dashboard.sections.payouts.escrow')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t('dashboard.sections.payouts.tenant_admin')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">{t('dashboard.sections.payouts.actions')}</th>
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
                                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${payout.payout_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                                                            }`}>
                                                                            {payout.payout_status === 'Paid' ? t('dashboard.header.super_admin') : t('dashboard.sections.payouts.in_escrow')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            {payout.payout_status === 'Pending' ? (
                                                                                <button
                                                                                    onClick={() => handleProcessPayout(payout._id)}
                                                                                    className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-700 uppercase hover:bg-gray-50 transition-all"
                                                                                >
                                                                                    {t('dashboard.sections.payouts.manage')}
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-emerald-500 px-3 uppercase">{t('dashboard.sections.payouts.settled')}</span>
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
                                                                        <p className="text-sm font-medium text-gray-400 italic">{t('dashboard.sections.payouts.no_signals')}</p>
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
                                        <div className="space-y-8">
                                            <div className="mb-8 px-2 flex items-center gap-4">
                                                <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl shadow-sm"><Clock size={24} /></div>
                                                <div>
                                                    <h2 className="text-lg font-black text-gray-900 tracking-tight leading-tight uppercase">{t('dashboard.sections.providers.intake')}</h2>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('dashboard.sections.providers.onboarding')}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {unapprovedProviders.map(p => (
                                                    <motion.div layout id={`provider-${p._id}`} key={p._id} className="p-6 bg-white rounded-3xl shadow-xl border border-orange-50 flex flex-col gap-5 relative overflow-hidden group hover:border-orange-200 transition-all hover:translate-y-[-4px]">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 rounded-bl-[3rem] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                                        <div className="z-10 bg-gradient-to-br from-gray-50 to-white w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-gray-100">👤</div>
                                                        <div className="z-10">
                                                            <h3 className="font-black text-lg text-gray-950 leading-tight uppercase tracking-tight">{p.name}</h3>
                                                            <div className="flex flex-col gap-1 mt-1.5">
                                                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] italic opacity-80">{p.email}</p>
                                                                <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest">{p.phone || 'NO PHONE REGISTERED'}</p>
                                                            </div>
                                                            {p.services && p.services.length > 0 && (
                                                                <div className="mt-4 flex flex-wrap gap-1.5">
                                                                    {p.services.map(s => (
                                                                        <span key={s._id} className="px-2 py-0.5 bg-orange-50 border border-orange-100 rounded text-[8px] font-black text-orange-500 uppercase">{s.category}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => handleApproveProvider(p._id)} className="w-full bg-[#1a2332] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-100 z-10">Authorize Access</button>
                                                    </motion.div>
                                                ))}
                                                {unapprovedProviders.length === 0 && (
                                                    <div className="md:col-span-3 py-32 bg-white rounded-[4rem] border-2 border-dashed border-gray-100 text-center grayscale opacity-40">
                                                        <div className="text-7xl mb-6">✨</div>
                                                        <p className="text-2xl font-black uppercase tracking-widest text-gray-400 italic">{t('dashboard.sections.providers.queue_clear')}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {adminSection === 'disputes' && (
                                        <div className="space-y-8">
                                            <div className="flex items-center gap-4 px-2">
                                                <div className="p-4 bg-red-100 text-red-600 rounded-2xl shadow-sm"><ShieldOff size={24} /></div>
                                                <div>
                                                    <h2 className="text-lg font-black text-gray-900 tracking-tight leading-tight uppercase text-red-950">{t('dashboard.sidebar.issues')}</h2>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('dashboard.sections.disputes.priority')}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6 max-w-2xl">
                                                {complaints.length === 0 ? (
                                                    <div className="bg-white p-20 rounded-[3rem] shadow-xl border border-gray-100 text-center grayscale opacity-40">
                                                        <div className="text-6xl mb-4 flex justify-center">🕊️</div>
                                                        <p className="text-xl font-black italic font-serif text-gray-400 uppercase tracking-[0.2em]">{t('dashboard.sections.disputes.harmonious')}</p>
                                                    </div>
                                                ) : (
                                                    complaints.map(c => (
                                                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={c._id} className="p-6 bg-white rounded-3xl shadow-xl border border-red-50 relative group overflow-hidden hover:border-red-200 transition-all">
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[3rem] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-center mb-5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                                                                        <p className="font-black text-red-900 text-[10px] uppercase tracking-widest">ID-{c._id.slice(-6)}</p>
                                                                    </div>
                                                                    <span className="bg-red-600 text-white text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg shadow-red-100">{t('dashboard.sections.disputes.critical')}</span>
                                                                </div>
                                                                <div className="bg-red-50/50 p-6 rounded-2xl border-l-[6px] border-red-500 mb-6">
                                                                    <p className="text-base text-red-950 leading-relaxed font-bold italic">"{c.description}"</p>
                                                                </div>
                                                                <div className="flex gap-3">
                                                                    <button onClick={() => handleResolveComplaint(c._id, 'dismissed')} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition-all active:scale-95 tracking-widest">{t('dashboard.sections.disputes.dismiss')}</button>
                                                                    <button onClick={() => handleResolveComplaint(c._id, 'refunded')} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-100 hover:bg-red-700 hover:-translate-y-0.5 transition-all active:scale-95 tracking-widest">{t('dashboard.sections.disputes.refund')}</button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {adminSection === 'subscriptions' && (
                                        <div className="space-y-12">
                                            <div className="flex items-center gap-6 mb-4 px-2">
                                                <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm"><Crown size={36} /></div>
                                                <div>
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase underline decoration-indigo-200 decoration-8 underline-offset-8">Subscription Management</h2>
                                                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest opacity-60">Plans, Adoption & Revenue</p>
                                                </div>
                                            </div>

                                            {/* Plan Library Section */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {allPlans.map(plan => (
                                                    <div key={plan.id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 hover:border-indigo-300 transition-all group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Crown size={100} /></div>
                                                        <div className="flex justify-between items-start mb-6">
                                                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full uppercase tracking-widest">{plan.category}</span>
                                                            <span className="text-2xl font-black text-slate-800">₹{plan.price}</span>
                                                        </div>
                                                        <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">{plan.name}</h3>
                                                        <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed line-clamp-2">{plan.description}</p>
                                                        <div className="flex items-center gap-8 py-6 border-t border-slate-50">
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Visits</p>
                                                                <p className="text-base font-black text-slate-800">{plan.total_visits}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Validity</p>
                                                                <p className="text-base font-black text-slate-800">{plan.validity_days} Days</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {allPlans.length === 0 && (
                                                    <div className="lg:col-span-3 py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                                                        <p className="text-slate-400 font-black uppercase tracking-widest italic">No Subscription Plans Found</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                                                <div className="p-10 border-b border-gray-50 bg-slate-50/30 flex justify-between items-center">
                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Active Subscriptions</h3>
                                                        <p className="text-xs text-slate-400 mt-1 font-bold italic">Tracking premium users and remaining visits</p>
                                                    </div>
                                                    <div className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                        {allUserSubscriptions.length} Active
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MEMBER</th>
                                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PLAN</th>
                                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">VISITS</th>
                                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">EXPIRY</th>
                                                                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">REVENUE</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {allUserSubscriptions.map(sub => (
                                                                <tr key={sub.id} className="hover:bg-indigo-50/20 transition-all group">
                                                                    <td className="px-10 py-8">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-110 transition-transform">
                                                                                {sub.user?.name?.charAt(0) || 'U'}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-black text-slate-900 text-sm leading-tight uppercase tracking-tight">{sub.user?.name || 'Unknown'}</p>
                                                                                <p className="text-[10px] text-slate-400 font-bold mt-1 lowercase">{sub.user?.email}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-10 py-8 text-sm font-black text-slate-800 uppercase tracking-tighter">
                                                                        <div className="flex flex-col">
                                                                            <span>{sub.plan?.name}</span>
                                                                            <span className="text-[8px] text-indigo-500 font-black uppercase tracking-widest">{sub.plan?.category}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-10 py-8">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex-1 w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(sub.remaining_visits / sub.plan?.total_visits) * 100}%` }}></div>
                                                                            </div>
                                                                            <span className="text-[10px] font-black text-slate-600 whitespace-nowrap">{sub.remaining_visits} / {sub.plan?.total_visits}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-10 py-8 text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                                                                        {new Date(sub.expires_at).toLocaleDateString()}
                                                                    </td>
                                                                    <td className="px-10 py-8 text-right text-sm font-black text-slate-900">
                                                                        ₹{sub.plan?.price}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {allUserSubscriptions.length === 0 && (
                                                                <tr>
                                                                    <td colSpan="5" className="px-10 py-32 text-center text-slate-300 font-black uppercase tracking-[0.3em] italic opacity-30">No Active Subscriptions Found</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {adminSection === 'broadcast' && (
                                        <div className="bg-[#1a2332] p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden ring-4 ring-white/5 max-w-2xl">
                                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                                            <div className="relative z-10">
                                                <div className="mb-8 flex items-center gap-5">
                                                    <div className="p-4 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-2xl shadow-xl shadow-indigo-600/20 animate-pulse"><MessageSquare size={32} /></div>
                                                    <div>
                                                        <h2 className="text-xl font-black tracking-tight leading-none mb-1 uppercase text-indigo-50">{t('dashboard.sidebar.broadcast')}</h2>
                                                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{t('dashboard.sections.broadcast.protocol')}</p>
                                                    </div>
                                                </div>
                                                <p className="text-gray-400 text-sm mb-8 leading-relaxed font-bold">{t('dashboard.sections.broadcast.transmit')}</p>
                                                <form onSubmit={handleBroadcast} className="space-y-6">
                                                    <div className="relative group">
                                                        <textarea className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-3xl text-white outline-none focus:border-indigo-500 focus:bg-white/10 transition-all text-base font-bold placeholder:text-gray-600 shadow-inner" rows="4" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder={t('dashboard.sections.broadcast.placeholder')}></textarea>
                                                        <div className="absolute bottom-4 right-6 text-[8px] font-black text-gray-600 uppercase tracking-widest">{t('dashboard.sections.broadcast.auth_required')}</div>
                                                    </div>
                                                    <motion.button whileHover={{ scale: 1.02, backgroundColor: '#4f46e5' }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-900/20 uppercase tracking-[0.2em] transition-all">{t('dashboard.sections.broadcast.execute')}</motion.button>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                    {adminSection === 'discounts' && (
                                        <div className="space-y-12">
                                            <div className="flex items-center gap-6 mb-4 px-2">
                                                <div className="p-5 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm"><Tag size={36} /></div>
                                                <div>
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">{t('dashboard.sidebar.discounts')}</h2>
                                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('dashboard.sections.offers.governance')}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                <div className="lg:col-span-1">
                                                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 sticky top-8">
                                                        <h3 className="text-lg font-bold text-gray-900 mb-6">{t('dashboard.sections.offers.create')}</h3>
                                                        <form onSubmit={handleAddOffer} className="space-y-5">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('dashboard.sections.offers.title')}</label>
                                                                <input name="title" required placeholder={t('dashboard.sections.offers.placeholder_title')} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('dashboard.sections.offers.percentage')}</label>
                                                                <input name="discount_percentage" type="number" required placeholder="20" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('dashboard.sections.offers.target')}</label>
                                                                <select name="service_id" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm">
                                                                    <option value="">{t('dashboard.sections.offers.all_services')}</option>
                                                                    {allServices.map(s => <option key={s._id} value={s._id}>{s.serviceName}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('dashboard.sections.offers.expiry')}</label>
                                                                <input name="expiry_date" type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all font-semibold text-sm" />
                                                            </div>
                                                            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4">{t('dashboard.sections.offers.provision')}</button>
                                                        </form>
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-2 space-y-6">
                                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                                        <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                                            <div>
                                                                <h3 className="text-sm font-bold text-gray-800">{t('dashboard.sections.offers.active')}</h3>
                                                                <p className="text-xs text-gray-400 mt-1 font-medium">{t('dashboard.sections.offers.listing')}</p>
                                                            </div>
                                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">{offers.length} {t('dashboard.sections.offers.active_tag')}</span>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                                                        <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.offers.config')}</th>
                                                                        <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t('dashboard.sections.offers.value')}</th>
                                                                        <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">{t('dashboard.sections.offers.action')}</th>
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
                                                                            <td colSpan="3" className="px-8 py-20 text-center text-gray-400 italic text-sm">{t('dashboard.sections.offers.no_assets')}</td>
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
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">{t('dashboard.sidebar.users')}</h2>
                                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('dashboard.sections.users.records')}</p>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                    <h3 className="text-sm font-bold text-gray-800">{t('dashboard.sections.users.directory')}</h3>
                                                    <p className="text-xs text-gray-400 mt-1 font-medium">{t('dashboard.sections.users.records')}</p>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.users.consumer')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.users.status')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">{t('dashboard.sections.users.actions')}</th>
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
                                                                            {u.isVerified ? t('dashboard.sections.users.verified') : t('dashboard.sections.users.pending')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <button onClick={() => handleDeleteUser(u._id)} className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-red-500 uppercase hover:bg-red-50 transition-all">
                                                                            {t('dashboard.sections.users.close_account')}
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
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">{t('dashboard.sidebar.manage_providers')}</h2>
                                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('dashboard.sections.providers.personnel')}</p>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                    <h3 className="text-sm font-bold text-gray-800">{t('dashboard.sections.providers.approved')}</h3>
                                                    <p className="text-xs text-gray-400 mt-1 font-medium">{t('dashboard.sections.providers.directory')}</p>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.payouts.organization')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.providers.contact')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t('dashboard.sections.providers.offerings')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">{t('dashboard.sections.providers.governance')}</th>
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
                                                                                <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">{t('dashboard.sections.users.id')}: {u._id.slice(-6)}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{u.phone || t('dashboard.sections.providers.unavailable')}</p>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-center">
                                                                        <div className="flex flex-wrap justify-center gap-1">
                                                                            {u.services && u.services.length > 0 ? u.services.map(s => (
                                                                                <span key={s._id} className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[8px] font-black uppercase">{s.service_name}</span>
                                                                            )) : <span className="text-[10px] text-gray-300 italic">{t('dashboard.sections.providers.no_listings')}</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <button onClick={() => handleDeleteUser(u._id)} className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-red-500 uppercase hover:bg-red-50 transition-all">
                                                                            {t('dashboard.sections.providers.revoke_access')}
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
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase">{t('dashboard.sidebar.booking_ledger')}</h2>
                                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">{t('dashboard.sections.bookings.oversight')}</p>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                                    <h3 className="text-sm font-bold text-gray-800">{t('dashboard.sidebar.booking_ledger')}</h3>
                                                    <p className="text-xs text-gray-400 mt-1 font-medium">{t('dashboard.sections.bookings.history')}</p>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.bookings.asset')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.bookings.handshake')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t('dashboard.sections.bookings.status')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.sections.bookings.gross_value')}</th>
                                                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">{t('dashboard.sections.bookings.governance')}</th>
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
                                                                                <p className="font-bold text-gray-900 text-sm leading-tight">{booking.serviceId?.serviceName || t('dashboard.sections.bookings.legacy_entity')}</p>
                                                                                <p className="text-[10px] text-gray-400 font-medium mt-1">{booking.serviceId?.category || t('dashboard.sections.bookings.general_protocol')}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-sm text-gray-600 font-medium">
                                                                        {new Date(booking.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                                                    </td>
                                                                    <td className="px-8 py-6 text-center">
                                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                                                                booking.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                                                            }`}>
                                                                            {booking.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-6 font-bold text-gray-900 text-sm">₹{booking.serviceId?.price}</td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <button className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-400 uppercase cursor-not-allowed">
                                                                            {t('dashboard.sections.bookings.intercept')}
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
                                    <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">Service@Home</h1>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 opacity-70">PROVIDER DASHBOARD</p>
                                </div>
                            </div>

                            <nav className="space-y-1.5">
                                {[
                                    { id: 'revenue', label: t('dashboard.provider.nav.overview'), icon: BarChart3, color: 'text-emerald-500' },
                                    { id: 'new_requests', label: t('dashboard.provider.nav.new_requests'), icon: MessageSquare, color: 'text-amber-500' },
                                    { id: 'active_jobs', label: t('dashboard.provider.nav.active_jobs'), icon: Clock, color: 'text-blue-500' },
                                    { id: 'past_jobs', label: t('dashboard.provider.nav.past_jobs'), icon: History, color: 'text-slate-400' },
                                    { id: 'payouts', label: t('dashboard.provider.nav.payouts'), icon: Wallet, color: 'text-indigo-500' },
                                    { id: 'portfolio', label: t('dashboard.provider.nav.portfolio'), icon: Briefcase, color: 'text-indigo-500' },
                                    { id: 'add_service', label: t('dashboard.provider.nav.create_listing'), icon: CirclePlus, color: 'text-indigo-500' },
                                    { id: 'live', label: t('dashboard.provider.nav.live_matrix'), icon: MapPin, color: 'text-rose-500' },
                                    { id: 'marketplace', label: 'Service Marketplace', icon: Zap, color: 'text-yellow-500' },
                                    { id: 'schedule', label: 'My Schedule', icon: Calendar, color: 'text-violet-500' },
                                    { id: 'feedback', label: t('dashboard.provider.nav.feedback'), icon: Star, color: 'text-yellow-500' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setProviderSection(item.id)}
                                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${providerSection === item.id
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
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">{t('dashboard.provider.nav.status_online')}</span>
                                </div>
                            </div>
                            <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-black text-xs uppercase tracking-widest">
                                <LogOut size={20} /> {t('dashboard.sidebar.sign_out')}
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
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{t('dashboard.provider.revenue.title')}</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">{t('dashboard.provider.revenue.subtitle')}</p>
                                            </div>
                                            <div className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-50 flex items-center gap-3">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                {t('dashboard.provider.revenue.live_ledger')}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {[
                                                { label: t('dashboard.provider.revenue.total_earnings'), value: bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.serviceId?.price || 0), 0), icon: BarChart3, color: 'bg-emerald-500', sub: t('dashboard.provider.revenue.gross_revenue') },
                                                { label: t('dashboard.provider.revenue.in_escrow'), value: bookings.filter(b => b.payment_status === 'Paid' && b.status !== 'Cancelled').reduce((sum, b) => sum + (b.serviceId?.price || 0), 0) - payouts.filter(p => p.payout_status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0), icon: Clock, color: 'bg-amber-500', sub: t('dashboard.provider.revenue.pending_settlement') },
                                                { label: t('dashboard.provider.revenue.disbursed'), value: payouts.filter(p => p.payout_status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0), icon: Wallet, color: 'bg-indigo-500', sub: t('dashboard.provider.revenue.bank_distributed') }
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
                                            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3"><Users size={24} className="text-indigo-600" /> {t('dashboard.provider.revenue.recent_handshakes')}</h3>
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
                                                    {providerSection === 'new_requests' ? t('dashboard.provider.bookings.title_new') :
                                                        providerSection === 'active_jobs' ? t('dashboard.provider.bookings.title_active') : t('dashboard.provider.bookings.title_history')}
                                                </h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">
                                                    {providerSection === 'new_requests' ? t('dashboard.provider.bookings.sub_new') :
                                                        providerSection === 'active_jobs' ? t('dashboard.provider.bookings.sub_active') : t('dashboard.provider.bookings.sub_history')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.provider.bookings.client_service')}</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.provider.bookings.date')}</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('dashboard.provider.bookings.status')}</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.provider.bookings.value')}</th>
                                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('dashboard.provider.bookings.governance')}</th>
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
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="font-bold text-slate-800 text-sm">{booking.serviceId?.serviceName || t('dashboard.provider.bookings.legacy_entity')}</span>
                                                                                {booking.payment_status === 'Paid' && (
                                                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-[6px] text-[7px] font-black uppercase tracking-widest animate-pulse">Prepaid</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Booked by: {booking.userId?.name || 'Valued Customer'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-8">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-extrabold text-slate-600 mb-0.5">{new Date(booking.date).toLocaleDateString()}</span>
                                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{booking.time}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-8 text-center">
                                                                        <select
                                                                            value={booking.status}
                                                                            onChange={(e) => handleUpdateBookingStatus(booking._id, e.target.value)}
                                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-2 transition-all ${booking.status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                                                                    booking.status === 'Cancelled' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                                                                                        'bg-amber-50 border-amber-200 text-amber-600 focus:border-indigo-500'
                                                                                }`}
                                                                        >
                                                                            <option value="Pending">{t('dashboard.statuses.pending')}</option>
                                                                            <option value="Accepted">{t('dashboard.statuses.accepted')}</option>
                                                                            <option value="OnTheWay">{t('dashboard.statuses.ontheway')}</option>
                                                                            <option value="In Progress">{t('dashboard.statuses.inprogress')}</option>
                                                                            <option value="Paid">{t('dashboard.statuses.paid')}</option>
                                                                            <option value="Completed">{t('dashboard.statuses.completed')}</option>
                                                                            <option value="Cancelled">{t('dashboard.statuses.cancelled')}</option>
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
                                {providerSection === 'marketplace' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4">
                                            <div className="p-5 bg-yellow-100 text-yellow-600 rounded-3xl shadow-sm"><Zap size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Service Marketplace</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Bid on unique custom job requests</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {openJobs.map(job => (
                                                <div key={job.id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 hover:border-yellow-200 transition-all group relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={100} /></div>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <span className="text-[10px] font-black bg-yellow-50 text-yellow-600 px-4 py-1.5 rounded-full uppercase tracking-widest">{job.category}</span>
                                                        <span className="text-xl font-black text-slate-800">Budget: ₹{job.budget}</span>
                                                    </div>
                                                    <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">{job.title}</h3>
                                                    <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed line-clamp-3">{job.description}</p>
                                                    <div className="flex flex-col gap-4 py-6 border-t border-slate-50">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={14} className="text-slate-400" />
                                                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">{job.address}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => { setSelectedJobForBid(job); setShowBidModal(true); }}
                                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-500 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            Place A Bid <ArrowRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {openJobs.length === 0 && (
                                                <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                                                    <p className="text-slate-400 font-black uppercase tracking-widest italic">No Open Requests at the Moment</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'payouts' && (
                                    <div className="space-y-12">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{t('dashboard.provider.payouts.title')}</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">{t('dashboard.provider.payouts.subtitle')}</p>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={async () => {
                                                    try {
                                                        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/request-payout`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
                                                        toast.success(t('dashboard.provider.payouts.withdraw_success'));
                                                        fetchMyPayouts();
                                                    } catch (e) {
                                                        toast.error(e.response?.data?.message || t('dashboard.provider.payouts.withdraw_fail'));
                                                    }
                                                }}
                                                className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center gap-3"
                                            >
                                                <Wallet size={18} /> {t('dashboard.provider.nav.payout_p') || 'Withdraw Now'}
                                            </motion.button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">{t('dashboard.provider.nav.withdrawable') || 'Available for Withdrawal'}</p>
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
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">Account Status</span>
                                                        <span className="text-lg font-bold text-emerald-400">KYC Verified</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-50">
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-6">{t('dashboard.provider.payouts.history_title')}</h3>
                                                <div className="space-y-6 max-h-[250px] overflow-y-auto pr-4 scrollbar-hide">
                                                    {payouts.map(p => (
                                                        <div key={p._id} className="flex justify-between items-center group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                                    <ClipboardList size={18} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 uppercase tabular-nums">{t('dashboard.provider.payouts.batch')} {p._id.slice(-6)}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(p.created_at || Date.now()).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-slate-800">₹{p.amount?.toLocaleString()}</p>
                                                                <span className={`text-[9px] font-black uppercase tracking-widest ${p.payout_status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{p.payout_status}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {payouts.length === 0 && <p className="text-center text-slate-400 italic text-xs py-10">{t('dashboard.provider.payouts.no_activity')}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'portfolio' && (
                                    <div className="space-y-12">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{t('dashboard.provider.portfolio.title')}</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">{t('dashboard.provider.portfolio.subtitle')}</p>
                                            </div>
                                            <button onClick={() => setProviderSection('add_service')} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center gap-3">
                                                <CirclePlus size={18} /> {t('dashboard.provider.nav.create_listing')}
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
                                                    <h4 className="text-xl font-black text-slate-800 mb-2">{t('dashboard.provider.portfolio.empty_title')}</h4>
                                                    <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 font-bold uppercase tracking-widest leading-loose">{t('dashboard.provider.portfolio.empty_desc')}</p>
                                                    <button onClick={() => setProviderSection('add_service')} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100">{t('dashboard.provider.portfolio.genesis_btn')}</button>
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
                                                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{t('dashboard.provider.add_service.title')}</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">{t('dashboard.provider.add_service.subtitle')}</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleAddService} className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('dashboard.provider.add_service.label_category')}</label>
                                                <select
                                                    name="category"
                                                    value={selectedAddCategory}
                                                    onChange={(e) => setSelectedAddCategory(e.target.value)}
                                                    required
                                                    className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm uppercase tracking-widest appearance-none"
                                                >
                                                    <option value="" disabled>Select a Category</option>
                                                    {serviceCategories.map((cat, idx) => (
                                                        <option key={idx} value={cat.name}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('dashboard.provider.add_service.label_name')}</label>
                                                <select name="serviceName" required className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm tabular-nums appearance-none">
                                                    <option value="" disabled>Select a Specific Service</option>
                                                    {selectedAddCategory && serviceCategories.find(c => c.name === selectedAddCategory)?.subServices.map((sub, idx) => (
                                                        <option key={idx} value={sub}>{sub}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('dashboard.provider.add_service.label_desc')}</label>
                                                <textarea name="description" placeholder={t('dashboard.provider.add_service.placeholder_desc')} rows="4" className="w-full p-8 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700 leading-relaxed"></textarea>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('dashboard.provider.add_service.label_price')}</label>
                                                <input type="number" name="price" placeholder="1000" required className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('dashboard.provider.add_service.label_location')}</label>
                                                <input name="location" placeholder={t('dashboard.provider.add_service.placeholder_location')} required className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-black text-sm uppercase tracking-widest" />
                                            </div>

                                            <div className="md:col-span-2 space-y-4">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('dashboard.provider.add_service.label_image')}</label>
                                                    {serviceImageUrl && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.15em]">{t('dashboard.provider.add_service.image_sync')}</span>}
                                                </div>
                                                <ImageUpload onUploadComplete={(url) => setServiceImageUrl(url)} />
                                            </div>
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="md:col-span-2 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-2xl shadow-slate-900/10 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4">
                                                <CirclePlus size={18} /> {t('dashboard.provider.add_service.submit_btn')}
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
                                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t('dashboard.provider.live.title')}</h2>
                                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">{t('dashboard.provider.live.subtitle')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.provider.live.protocol_sync')}</span>
                                                    <span className={`text-[10px] font-black uppercase ${isSimulating ? 'text-rose-500' : 'text-emerald-500'}`}>{isSimulating ? t('dashboard.provider.live.mode_emulation') : t('dashboard.provider.live.mode_gps')}</span>
                                                </div>
                                                <button onClick={() => setIsSimulating(!isSimulating)} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${isSimulating ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-600 text-white shadow-indigo-100'}`}>
                                                    {isSimulating ? t('dashboard.provider.live.terminate_test') : t('dashboard.provider.live.run_test')}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-1 space-y-8">
                                                <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><QrCode size={24} className="text-indigo-400" /></div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('dashboard.provider.live.node_id')}</p>
                                                            <p className="text-sm font-black tabular-nums tracking-tighter">{user._id}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-6 rounded-[2rem] flex items-center justify-center shadow-inner">
                                                        <QRCodeSVG value={user._id} size={180} />
                                                    </div>
                                                    <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-8 opacity-60">{t('dashboard.provider.live.credentials')}</p>
                                                </div>

                                                <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-6 flex justify-between items-center">
                                                        {t('dashboard.provider.live.active_relays')}
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
                                                        {bookings.filter(b => b.status === 'OnTheWay').length === 0 && <p className="text-center text-slate-400 text-[10px] italic py-4">{t('dashboard.provider.live.no_nodes')}</p>}
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
                                                        <h4 className="text-xl font-black text-slate-800 opacity-20 uppercase tracking-widest">{t('dashboard.provider.live.no_matrix')}</h4>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-8 left-8 right-8 bg-slate-900/90 backdrop-blur-md p-6 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-3 h-3 rounded-full ${bookings.some(b => b.status === 'OnTheWay') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                                        <span className="text-xs font-black uppercase tracking-widest">{bookings.some(b => b.status === 'OnTheWay') ? t('dashboard.provider.live.sync_telemetry') : t('dashboard.provider.live.relay_standby')}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60 tabular-nums">{t('dashboard.provider.live.coordinates')}: 0.00°N 0.00°E</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'schedule' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4">
                                            <div className="p-5 bg-violet-100 text-violet-600 rounded-3xl shadow-sm"><Calendar size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">My Schedule</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Manage your working hours and availability</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
                                                <h3 className="text-lg font-black text-slate-800 mb-8 uppercase tracking-widest">Working Hours</h3>
                                                <form onSubmit={handleUpdateAvailability} className="space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Start Time</label>
                                                        <input
                                                            type="time"
                                                            value={availability.start_time}
                                                            onChange={(e) => setAvailability({ ...availability, start_time: e.target.value })}
                                                            className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-violet-500/10 focus:bg-white outline-none transition-all font-black text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">End Time</label>
                                                        <input
                                                            type="time"
                                                            value={availability.end_time}
                                                            onChange={(e) => setAvailability({ ...availability, end_time: e.target.value })}
                                                            className="w-full p-6 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-violet-500/10 focus:bg-white outline-none transition-all font-black text-sm"
                                                        />
                                                    </div>
                                                    <button type="submit" className="w-full bg-violet-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all">Save Working Hours</button>
                                                </form>
                                            </div>

                                            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
                                                <h3 className="text-lg font-black text-slate-800 mb-8 uppercase tracking-widest">Blocked Dates</h3>
                                                <div className="flex gap-4 mb-8">
                                                    <input
                                                        type="date"
                                                        value={newBlockedDate}
                                                        onChange={(e) => setNewBlockedDate(e.target.value)}
                                                        className="flex-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-violet-500/10 focus:bg-white outline-none transition-all font-black text-xs"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!newBlockedDate) return;
                                                            if (availability.blocked_dates.includes(newBlockedDate)) return;
                                                            setAvailability({ ...availability, blocked_dates: [...availability.blocked_dates, newBlockedDate] });
                                                            setNewBlockedDate('');
                                                        }}
                                                        className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                                                    {availability.blocked_dates.map((date, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                                            <span className="text-xs font-black text-slate-600">{new Date(date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAvailability({ ...availability, blocked_dates: availability.blocked_dates.filter(d => d !== date) })}
                                                                className="text-slate-300 hover:text-rose-500 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {availability.blocked_dates.length === 0 && (
                                                        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-8 opacity-40">No dates blocked</p>
                                                    )}
                                                </div>
                                                {availability.blocked_dates.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleUpdateAvailability}
                                                        className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-violet-300 hover:text-violet-500 transition-all"
                                                    >
                                                        Confirm Changes
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {providerSection === 'feedback' && (
                                    <div className="space-y-12">
                                        <div className="flex items-center gap-6 mb-4">
                                            <div className="p-5 bg-yellow-100 text-yellow-600 rounded-3xl shadow-sm"><Star size={36} /></div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t('dashboard.provider.feedback.title')}</h2>
                                                <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">{t('dashboard.provider.feedback.subtitle')}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
                                            <div className="flex flex-col md:flex-row items-center gap-16 mb-16">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-5xl font-black text-slate-900 tracking-tighter mb-2">4.9</p>
                                                    <div className="flex gap-1 text-xl text-yellow-400 mb-4">
                                                        {[1, 2, 3, 4, 5].map(s => <span key={s}>★</span>)}
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.provider.feedback.aggregate')}</p>
                                                </div>
                                                <div className="flex-1 space-y-4 w-full">
                                                    {[
                                                        { label: t('dashboard.provider.feedback.metric_integrity'), value: 98, color: 'bg-emerald-500' },
                                                        { label: t('dashboard.provider.feedback.metric_proficiency'), value: 94, color: 'bg-indigo-500' },
                                                        { label: t('dashboard.provider.feedback.metric_timeline'), value: 91, color: 'bg-amber-500' }
                                                    ].map((m, i) => (
                                                        <div key={i} className="space-y-2">
                                                            <div className="flex justify-between text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                                                <span>{m.label}</span>
                                                                <span>{m.value}%</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 1, delay: i * 0.2 }} className={`h-full ${m.color}`}></motion.div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-12 border-t border-slate-50">
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10">{t('dashboard.provider.feedback.history_title')}</h3>
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
                <div className="min-h-screen bg-[#f8fafc] flex-1">
                    <div className="p-8 md:p-16 max-w-7xl mx-auto h-screen overflow-y-auto scroll-smooth">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={customerSection}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-6xl mx-auto"
                            >
                                    {customerSection === 'explore' && (
                                        <div className="space-y-12">
                                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                                                <div className="relative z-10">
                                                    <h2 className="text-4xl font-black mb-4">Welcome back, {user?.name}!</h2>
                                                    <p className="text-indigo-100 text-lg font-medium max-w-xl">What service would you like to explore today? We have certified professionals ready to help.</p>
                                                    <div className="mt-10 flex gap-4">
                                                        <button onClick={() => navigate('/services')} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-3">
                                                            Browse Marketplace <ArrowRight size={18} />
                                                        </button>
                                                        <button onClick={() => updateTab('custom_jobs')} className="bg-indigo-500/30 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500/40 transition-all flex items-center gap-3">
                                                            Post Custom Job <Zap size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                {[
                                                    { label: 'Active Bookings', value: bookings.filter(b => b.status !== 'Completed' && b.status !== 'Cancelled').length, icon: Clock, color: 'bg-amber-500' },
                                                    { label: 'Open Requests', value: customJobs.filter(j => j.status === 'Open').length, icon: MessageSquare, color: 'bg-emerald-500' },
                                                    { label: 'Total Spent', value: `₹${bookings.filter(b => b.status === 'Completed' || b.payment_status === 'Paid').reduce((sum, b) => sum + (b.total_price || b.serviceId?.price || 0), 0).toLocaleString()}`, icon: Wallet, color: 'bg-indigo-500' }
                                                ].map((stat, i) => (
                                                    <div key={i} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-50 flex items-center gap-6">
                                                        <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                                            <stat.icon size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                                            <p className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50">
                                                    <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3"><Trophy size={24} className="text-indigo-600" /> Active Subscriptions</h3>
                                                    {mySubscriptions.length > 0 ? (
                                                        <div className="space-y-6">
                                                            {mySubscriptions.slice(0, 2).map((sub, i) => (
                                                                <div key={i} className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100/50">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600"><Crown size={20} /></div>
                                                                        <div>
                                                                            <p className="font-bold text-slate-800 text-sm">{sub.plan?.name}</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub.remaining_visits} visits left</p>
                                                                        </div>
                                                                    </div>
                                                                    <button onClick={() => updateTab('subscriptions')} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Detail</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-center py-10 text-slate-400 text-xs italic">No active subscriptions found. Browse plans to save on services.</p>
                                                    )}
                                                </div>
                                                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 font-black">
                                                    <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3"><MessageSquare size={24} className="text-emerald-500" /> Recent Activity</h3>
                                                    <div className="space-y-6">
                                                        {bookings.slice(0, 3).map((b, i) => (
                                                            <div key={i} className="flex gap-4 items-start pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                                                                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500"></div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-bold text-slate-800">{b.serviceId?.serviceName || 'Custom Job'}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(b.date).toLocaleDateString()}</p>
                                                                </div>
                                                                <span className={`text-[9px] font-black px-2 py-1 rounded-md ${b.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{b.status}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {customerSection === 'bookings' && (
                                        <div className="space-y-12">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">My Service History</h2>
                                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Track your bookings and lifecycle</p>
                                                </div>
                                                <button onClick={() => navigate('/services')} className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200">
                                                    Book New Service <ArrowRight size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-8">
                                                {bookings.map(booking => {
                                                    const statuses = ['Pending', 'Accepted', 'OnTheWay', 'In Progress', 'Paid', 'Completed'];
                                                    const currentStep = statuses.indexOf(booking.status);
                                                    const isCancelled = booking.status === 'Cancelled';

                                                    const isTerminal = ['Completed', 'Cancelled'].includes(booking.status);

                                                    return (
                                                        <div key={booking._id} className={`bg-white transition-all duration-500 overflow-hidden ${
                                                            isTerminal ? 'p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100' : 'p-10 rounded-[3rem] shadow-2xl shadow-slate-100 border border-slate-50'
                                                        } group mb-8`}>
                                                            
                                                            {isTerminal ? (
                                                                /* COMPACT FINTECH TILE for TERMINAL STATES */
                                                                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                                                                    <div className="flex items-center gap-5 flex-1">
                                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                                                                            booking.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                                        }`}>
                                                                            {booking.status === 'Completed' ? <CircleCheck size={20} /> : <CircleX size={20} />}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-base font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{booking.serviceId?.serviceName || 'Custom Job'}</h4>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(booking.date).toLocaleDateString()}</span>
                                                                                <span className="text-xs font-black text-slate-900 border-l border-slate-200 pl-3">₹{(booking.total_price || (booking.serviceId?.price || 0)).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-4">
                                                                        {/* Compact Actions */}
                                                                        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                                                                            <button onClick={() => setActiveChatBooking(booking)} className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Chat"><MessageSquare size={16} /></button>
                                                                            {booking.status === 'Completed' && (
                                                                                <button onClick={() => { setSelectedBookingForReview(booking._id); setShowReviewModal(true); }} className="p-2.5 text-slate-400 hover:text-amber-500 transition-colors" title="Review"><Star size={16} /></button>
                                                                            )}
                                                                            <button onClick={() => { setSelectedBookingForComplaint(booking._id); setShowComplaintModal(true); }} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors" title="Report Issue"><TriangleAlert size={16} /></button>
                                                                        </div>

                                                                        <div className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                                                            booking.status === 'Completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                                                                        }`}>
                                                                            {booking.status === 'Completed' ? '✔ Completed' : '✖ Cancelled'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* FULL EXPANDED VIEW for ACTIVE LIFECYCLE */
                                                                <>
                                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                                                                        <div className="flex items-center gap-6">
                                                                            <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner border border-slate-100">
                                                                                <Briefcase size={28} />
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{booking.serviceId?.serviceName || 'Custom Project'}</h3>
                                                                                <div className="flex gap-4 mt-2">
                                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} /> {new Date(booking.date).toLocaleDateString()}</span>
                                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12} /> {booking.time}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Service Fee</p>
                                                                            <p className="text-3xl font-black text-slate-900">₹{(booking.total_price || (booking.serviceId?.price || 0)).toLocaleString()}</p>
                                                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md mt-2 inline-block ${booking.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                                {booking.payment_status}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="px-4 mb-12 relative">
                                                                        <div className="absolute left-0 right-0 h-1 bg-slate-50 top-1/2 -translate-y-1/2 rounded-full overflow-hidden">
                                                                            <motion.div 
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${(currentStep / (statuses.length - 1)) * 100}%` }}
                                                                                className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                                                                            />
                                                                        </div>

                                                                        <div className="relative flex justify-between">
                                                                            {statuses.map((step, idx) => {
                                                                                const Icon = [Clock, CircleCheck, Truck, Wrench, Wallet, Trophy][idx];
                                                                                const isStepCompleted = idx <= currentStep;
                                                                                const isActive = idx === currentStep;

                                                                                return (
                                                                                    <div key={idx} className="flex flex-col items-center gap-4 relative">
                                                                                        <motion.div 
                                                                                            animate={isActive ? { scale: [1, 1.2, 1], boxShadow: "0 0 20px rgba(79,70,229,0.3)" } : {}}
                                                                                            transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                                                                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 transition-all duration-500 z-10 ${
                                                                                                isStepCompleted ? 'bg-indigo-600 border-indigo-100 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-300'
                                                                                            }`}
                                                                                        >
                                                                                            <Icon size={18} />
                                                                                        </motion.div>
                                                                                        <span className={`text-[10px] font-black uppercase tracking-widest absolute -bottom-8 whitespace-nowrap transition-colors duration-500 ${
                                                                                            isStepCompleted ? 'text-slate-800' : 'text-slate-300'
                                                                                        }`}>
                                                                                            {step}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-12 pt-8 border-t border-slate-50 flex flex-wrap items-center justify-between gap-6">
                                                                        <div className="flex items-center gap-4 text-slate-400">
                                                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-bold text-slate-400 uppercase text-xs">
                                                                                {booking.providerId?.name?.charAt(0) || 'P'}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Provider Assigned</p>
                                                                                <p className="text-xs font-black text-slate-800 uppercase">{booking.providerId?.name || 'Awaiting Match'}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-3">
                                                                            <button onClick={() => setActiveChatBooking(booking)} className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all group">
                                                                                <MessageSquare size={14} className="text-slate-400 group-hover:text-indigo-600" /> Chat
                                                                            </button>

                                                                            {booking.status === 'OnTheWay' && (
                                                                                <button 
                                                                                    onClick={() => setExpandedMapId(expandedMapId === booking._id ? null : booking._id)}
                                                                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                                                        expandedMapId === booking._id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                                                    }`}
                                                                                >
                                                                                    <MapPin size={14} /> {expandedMapId === booking._id ? 'Hide Tracking' : 'View Live Tracking'}
                                                                                </button>
                                                                            )}

                                                                            {['Accepted', 'OnTheWay', 'In Progress'].includes(booking.status) && (
                                                                                <button 
                                                                                    onClick={() => { setSelectedBookingId(booking._id); setShowScanner(true); }}
                                                                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200"
                                                                                >
                                                                                    <QrCode size={14} /> Scan Pro
                                                                                </button>
                                                                            )}

                                                                            {booking.status === 'Paid' && (
                                                                                <button 
                                                                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 animate-pulse"
                                                                                >
                                                                                    Ready to Finish
                                                                                </button>
                                                                            )}

                                                                            <button 
                                                                                onClick={() => { setSelectedBookingForComplaint(booking._id); setShowComplaintModal(true); }}
                                                                                className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                                            >
                                                                                <TriangleAlert size={14} /> Issue
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <AnimatePresence>
                                                                        {expandedMapId === booking._id && (
                                                                            <motion.div 
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                className="overflow-hidden"
                                                                            >
                                                                                <div className="mt-10 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative group">
                                                                                    <div className="flex justify-between items-center mb-8">
                                                                                        <div>
                                                                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Live Tracking Perimeter</h5>
                                                                                            <p className="text-sm font-black text-slate-800 uppercase">
                                                                                                {liveLocations[booking._id] && customerLocations[booking._id] ? (
                                                                                                    `Provider is ${calculateDistance(
                                                                                                        liveLocations[booking._id].lat, liveLocations[booking._id].lng,
                                                                                                        customerLocations[booking._id].lat, customerLocations[booking._id].lng
                                                                                                    ).toFixed(1)} KM away`
                                                                                                ) : "Awaiting GPS Signal..."}
                                                                                            </p>
                                                                                        </div>
                                                                                        {liveLocations[booking._id] && customerLocations[booking._id] && (
                                                                                            <div className="bg-white px-4 py-2 rounded-xl flex items-center gap-3 border border-slate-200/50 shadow-sm">
                                                                                                <Clock size={12} className="text-indigo-600" />
                                                                                                <span className="text-[10px] font-black text-slate-800 uppercase">
                                                                                                    ETA {calculateETA(calculateDistance(
                                                                                                        liveLocations[booking._id].lat, liveLocations[booking._id].lng,
                                                                                                        customerLocations[booking._id].lat, customerLocations[booking._id].lng
                                                                                                    ))} MINS
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* REAL-TIME LEAFLET MAP INTEGRATION */}
                                                                                    <div className="h-[300px] bg-slate-50 rounded-[2.5rem] relative overflow-hidden shadow-inner border border-slate-100/50">
                                                                                        <LiveTrackingMap 
                                                                                            providerLocation={liveLocations[booking._id]} 
                                                                                            customerLocation={customerLocations[booking._id]} 
                                                                                            providerName={booking.providerId?.name || "Service Pro"}
                                                                                            userRole={user.role}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {bookings.length === 0 && (
                                                    <div className="py-32 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
                                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><ClipboardList size={32} className="text-slate-200" /></div>
                                                        <h4 className="text-xl font-black text-slate-800 mb-2">Service History Empty</h4>
                                                        <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 font-bold uppercase tracking-widest leading-loose">You haven't booked any services yet. Certified professionals are waiting to help.</p>
                                                        <button onClick={() => navigate('/services')} className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200">Explore Services</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {customerSection === 'custom_jobs' && (
                                        <div className="space-y-12">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">My Custom Job Requests</h2>
                                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Jobs currently out for bidding</p>
                                                </div>
                                                <button onClick={() => setShowJobModal(true)} className="bg-yellow-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-yellow-100">
                                                    Post New Request <CirclePlus size={18} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-8">
                                                {customJobs.map(job => (
                                                    <div key={job.id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50">
                                                        <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-50">
                                                            <div>
                                                                <div className="flex items-center gap-4 mb-3">
                                                                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full uppercase tracking-widest">{job.category}</span>
                                                                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${job.status === 'Open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{job.status}</span>
                                                                </div>
                                                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{job.title}</h3>
                                                                <p className="text-sm text-slate-500 mt-2 font-medium">{job.description}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Budget</p>
                                                                <p className="text-2xl font-black text-slate-900">₹{job.budget?.toLocaleString()}</p>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Received Bids ({activeJobBids[job.id]?.length || 0})</h4>
                                                            <div className="space-y-4">
                                                                {(activeJobBids[job.id] || []).map(bid => (
                                                                    <div key={bid.id} className="bg-slate-50 p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-8 group">
                                                                        <div className="flex items-center gap-6">
                                                                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center font-black text-indigo-600 border border-slate-100">
                                                                                {bid.provider?.name?.charAt(0)}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-black text-slate-900 uppercase tracking-tight">{bid.provider?.name}</p>
                                                                                <p className="text-xs text-slate-500 font-medium italic mt-1">"{bid.message}"</p>
                                                                                <div className="flex gap-4 mt-3">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={10} /> {bid.estimated_days} Days</span>
                                                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10} /> Certified Pro</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-8">
                                                                            <p className="text-2xl font-black text-slate-900">₹{bid.bid_amount?.toLocaleString()}</p>
                                                                            {job.status === 'Open' && (
                                                                                <button
                                                                                    onClick={() => handleAcceptBid(bid.id)}
                                                                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all"
                                                                                >
                                                                                    Accept Bid
                                                                                </button>
                                                                            )}
                                                                            {bid.status === 'Accepted' && (
                                                                                <span className="px-8 py-4 bg-emerald-100 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest">Accepted</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {(!activeJobBids[job.id] || activeJobBids[job.id].length === 0) && (
                                                                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest text-center py-6 italic opacity-50">Waiting for providers to bid...</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {customJobs.length === 0 && (
                                                    <div className="py-32 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
                                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Zap size={32} className="text-slate-200" /></div>
                                                        <h4 className="text-xl font-black text-slate-800 mb-2">No Custom Requests</h4>
                                                        <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 font-bold uppercase tracking-widest leading-loose">Have a unique problem? Post it and let professionals come to you.</p>
                                                        <button onClick={() => setShowJobModal(true)} className="bg-yellow-500 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-yellow-100">Post First Request</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {customerSection === 'subscriptions' && (
                                        <div className="space-y-12">
                                            <div className="flex justify-between items-end mb-4 px-2">
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight uppercase underline decoration-indigo-200 decoration-8 underline-offset-8">My Active Memberships</h2>
                                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest opacity-60 mt-2">Premium Protocol Access</p>
                                                </div>
                                                <div className="flex items-center gap-2 bg-indigo-50 px-6 py-3 rounded-2xl">
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{mySubscriptions.length} Plans Active</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {mySubscriptions.map(sub => (
                                                    <div key={sub.id} className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-50 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                                                        <div className="flex items-center gap-4 mb-10 relative">
                                                            <div className="w-14 h-14 bg-slate-900 text-indigo-400 rounded-2xl flex items-center justify-center shadow-2xl"><Crown size={28} /></div>
                                                            <div>
                                                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{sub.plan?.name}</h3>
                                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{sub.plan?.category}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6 relative mb-10">
                                                            <div className="flex justify-between items-end">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quota Consumption</p>
                                                                <p className="text-xl font-black text-slate-900">{sub.remaining_visits} / {sub.plan?.total_visits}</p>
                                                            </div>
                                                            <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${(sub.remaining_visits / (sub.plan?.total_visits || 1)) * 100}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"></motion.div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between py-6 border-t border-slate-50 relative">
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expires On</p>
                                                                <p className="text-xs font-black text-slate-800">{new Date(sub.expires_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <button onClick={() => navigate('/services')} className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm shadow-indigo-100">Redeem Credit</button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {mySubscriptions.length === 0 && (
                                                    <div className="col-span-full py-32 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
                                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy size={32} className="text-slate-200" /></div>
                                                        <h4 className="text-xl font-black text-slate-800 mb-2">No Membership Detected</h4>
                                                        <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 font-bold uppercase tracking-widest leading-loose">Upgrade to a plan to save up to 40% on routine maintenance.</p>
                                                        <button onClick={() => navigate('/subscriptions')} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100">Explore Plans</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {customerSection === 'settings' && (
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                                            <div className="flex justify-between items-end border-b border-slate-50 pb-10">
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Account Control Center</h2>
                                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">Manage your identity and security perimeter</p>
                                                </div>
                                                <div className="flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                                                    <ShieldCheck size={16} className="text-emerald-500" />
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verified Identity</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                                <div className="lg:col-span-1 space-y-8">
                                                    <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                                                        <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center text-4xl font-black mb-8 border border-white/10 shadow-inner">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <h3 className="text-2xl font-black tracking-tight mb-1">{user.name}</h3>
                                                        <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest opacity-80">{user.role} Account</p>
                                                        <div className="mt-10 pt-10 border-t border-white/10 space-y-4">
                                                            <div className="flex items-center gap-3 text-slate-400">
                                                                <Clock size={14} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Joined {new Date().getFullYear()}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 px-1">Security Suite</h4>
                                                        <div className="space-y-6">
                                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-indigo-600"><ShieldCheck size={16} /></div>
                                                                    <span className="text-xs font-black text-slate-800 uppercase">2FA Active</span>
                                                                </div>
                                                                <div className="w-10 h-5 bg-indigo-500 rounded-full relative p-1 cursor-pointer">
                                                                    <div className="w-3 h-3 bg-white rounded-full absolute right-1"></div>
                                                                </div>
                                                            </div>
                                                            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200">Update Password</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-2 space-y-12">
                                                    <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-slate-50">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 px-2 flex items-center gap-3"><User size={14} className="text-indigo-600" /> Identity Details</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                                                <div className="p-6 bg-slate-50 rounded-[1.5rem] font-bold text-slate-800 border border-slate-100/50">{user.name}</div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                                                <div className="p-6 bg-slate-50 rounded-[1.5rem] font-bold text-slate-800 border border-slate-100/50">{user.email}</div>
                                                            </div>
                                                            <div className="md:col-span-2 space-y-3">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Perimeter (Address)</label>
                                                                <textarea className="w-full p-8 bg-slate-50 border-none rounded-[2.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700 leading-relaxed" defaultValue={user.address || 'Assigning location...'} rows="3"></textarea>
                                                            </div>
                                                        </div>
                                                        <div className="mt-12 flex justify-end">
                                                            <button onClick={() => toast.info("Profile Sync Initialized")} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 flex items-center gap-3">
                                                                <Zap size={16} /> Sync Profile
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-12 bg-rose-50 rounded-[4rem] border-2 border-dashed border-rose-100">
                                                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                                                            <div>
                                                                <h4 className="text-xl font-black text-rose-900 mb-2">Danger Zone</h4>
                                                                <p className="text-sm text-rose-600 font-bold uppercase tracking-widest opacity-60">High-stakes account operations</p>
                                                            </div>
                                                            <button onClick={() => toast.error("Request sent for manual verification")} className="px-10 py-5 bg-white text-rose-600 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-sm border border-rose-100 hover:bg-rose-600 hover:text-white transition-all">Terminate Account</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {showScanner && (
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
                                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-12 rounded-[3.5rem] w-full max-w-md shadow-2xl relative">
                                    <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Rate the Service</h2>
                                    <p className="text-sm text-slate-400 mb-8 font-bold uppercase tracking-widest italic opacity-60">Help others by sharing your experience</p>

                                    <div className="flex justify-center gap-4 mb-10">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setRating(star)} className={`text-4xl transition-all ${rating >= star ? 'text-yellow-400 scale-110' : 'text-slate-200 hover:text-yellow-200'}`}>★</button>
                                        ))}
                                    </div>

                                    <textarea
                                        className="w-full bg-slate-50 border-none p-6 rounded-[1.5rem] text-slate-800 outline-none focus:ring-4 focus:ring-yellow-500/10 focus:bg-white transition-all font-semibold"
                                        rows="4"
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="What did you like or dislike?"
                                    ></textarea>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmitReview} className="w-full bg-yellow-400 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-yellow-100">Post Public Review</motion.button>
                                    <button onClick={() => setShowReviewModal(false)} className="text-gray-400 text-xs font-black uppercase tracking-widest hover:text-gray-600 transition-colors py-2">Skip for now</button>
                                </motion.div>
                            </motion.div>
                        )}

                        {showJobModal && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[2000] p-4">
                                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-12 rounded-[3.5rem] w-full max-w-2xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
                                    <button onClick={() => setShowJobModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X size={24} /></button>
                                    <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Post Custom Requirement</h2>
                                    <p className="text-sm text-slate-400 mb-10 font-bold uppercase tracking-widest italic opacity-60">Professionals will bid for your request</p>

                                    <form onSubmit={handlePostJob} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2 flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Requirement Title</label>
                                            <input name="title" required placeholder="e.g., Custom Book Shelf for Corner Wall" className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-yellow-500/10 focus:bg-white transition-all font-bold text-slate-800" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                                            <select name="category" required className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-yellow-500/10 focus:bg-white transition-all font-black text-sm uppercase tracking-widest appearance-none">
                                                {serviceCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Approximate Budget (₹)</label>
                                            <input name="budget" type="number" required placeholder="5000" className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-yellow-500/10 focus:bg-white transition-all font-black text-sm" />
                                        </div>
                                        <div className="md:col-span-2 flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Address</label>
                                            <textarea name="address" required rows="2" placeholder="Where is the job located?" className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-yellow-500/10 focus:bg-white transition-all font-bold text-slate-800"></textarea>
                                        </div>
                                        <div className="md:col-span-2 flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Detailed Description</label>
                                            <textarea name="description" required rows="4" placeholder="Explain the specific details of the work required..." className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-yellow-500/10 focus:bg-white transition-all font-bold text-slate-800"></textarea>
                                        </div>
                                        <button type="submit" className="md:col-span-2 py-5 bg-yellow-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-yellow-100 mt-4">Broadcast My Request</button>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}

                        {showBidModal && selectedJobForBid && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[2000] p-4">
                                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-12 rounded-[3.5rem] w-full max-w-md shadow-2xl relative">
                                    <button onClick={() => setShowBidModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X size={24} /></button>
                                    <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Place Your Bid</h2>
                                    <p className="text-xs text-slate-400 mb-10 font-bold uppercase tracking-widest italic opacity-60">Job: {selectedJobForBid.title}</p>

                                    <form onSubmit={handleSubmitBid} className="space-y-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">My Offer Amount (₹)</label>
                                            <input name="bid_amount" type="number" required placeholder="Offer Price" className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-black text-sm" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Estimated Duration (Days)</label>
                                            <input name="estimated_days" type="number" required placeholder="Days to complete" className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-black text-sm" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Professional Message</label>
                                            <textarea name="message" required rows="3" placeholder="Explain why you are the best fit for this job..." className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-bold text-slate-800"></textarea>
                                        </div>
                                        <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 mt-4 underline decoration-indigo-500 decoration-4">Submit Official Bid</button>
                                    </form>
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
