import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import ReviewsList from '../components/ReviewsList';
import { User, ShieldCheck, ShieldOff, Zap, Plus, Check, X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UpsellModal from '../components/UpsellModal';
import { motion } from 'framer-motion';

const ServiceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const { t } = useTranslation();
    const [address, setAddress] = useState(user?.address || '');
    const [availability, setAvailability] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [userSubscriptions, setUserSubscriptions] = useState([]);
    const [useCredit, setUseCredit] = useState(false);
    const [availableAddons, setAvailableAddons] = useState([]);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [showUpsellModal, setShowUpsellModal] = useState(false);
    const [hasSeenUpsell, setHasSeenUpsell] = useState(false);

    useEffect(() => {
        if (user?.address && !address) {
            setAddress(user.address);
        }
    }, [user, address]);

    const [offers, setOffers] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [serviceRes, offersRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services/${id}`),
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/offers`)
                ]);
                setService(serviceRes.data);
                setOffers(Array.isArray(offersRes.data) ? offersRes.data : []);

                // Fetch Provider Availability
                if (serviceRes.data?.provider_id || serviceRes.data?.providerId?._id) {
                    const pId = serviceRes.data.provider_id || serviceRes.data.providerId._id;
                    const availRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/availability/${pId}`);
                    setAvailability(availRes.data);
                }

                // Fetch User Subscriptions for this Category
                if (user && serviceRes.data?.category) {
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    const subRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/my-active`, config);
                    const matchingSubs = subRes.data.filter(s => s.plan?.category === serviceRes.data.category);
                    setUserSubscriptions(matchingSubs);
                    if (matchingSubs.length > 0) setUseCredit(true);
                }

                // Fetch Addons for Category
                if (serviceRes.data?.category) {
                    const addonRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services/category/${serviceRes.data.category}/addons`);
                    // Filter out the current service if it happens to be an addon
                    setAvailableAddons((addonRes.data || []).filter(a => a._id !== id));
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, user]);

    // Handle Time Slot Generation when Date changes
    useEffect(() => {
        if (!date || !availability) {
            setAvailableSlots([]);
            return;
        }

        const { settings, takenSlots } = availability;
        
        // 1. Check if date is blocked
        if (settings.blocked_dates?.includes(date)) {
            toast.error("Provider is not available on this date. Please choose another.");
            setDate('');
            setAvailableSlots([]);
            return;
        }

        // 2. Generate 1-hour slots
        const start = parseInt(settings.start_time.split(':')[0]);
        const end = parseInt(settings.end_time.split(':')[0]);
        const slots = [];
        
        for (let h = start; h < end; h++) {
            const timeStr = `${h.toString().padStart(2, '0')}:00`;
            // Check if slot is already taken for this date
            const isTaken = (takenSlots || []).some(b => {
                // Handle different date formats (Supabase DATE is YYYY-MM-DD)
                const bDate = b.date.includes('T') ? b.date.split('T')[0] : b.date;
                return bDate === date && b.time === timeStr;
            });
            if (!isTaken) {
                slots.push(timeStr);
            }
        }
        
        setAvailableSlots(slots);
        if (slots.length > 0 && !slots.includes(time)) {
            setTime(slots[0]);
        } else if (slots.length === 0) {
            setTime('');
        }
    }, [date, availability]);

    const handleBook = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error(t('home.login_to_book'));
            navigate('/login');
            return;
        }

        // Logic for Upsell Popup
        if (availableAddons.length > 0 && !hasSeenUpsell && selectedAddons.length === 0) {
            setShowUpsellModal(true);
            setHasSeenUpsell(true);
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                }
            };

            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings`, {
                serviceId: id,
                date,
                time,
                address,
                useSubscriptionCredit: useCredit,
                selectedAddons: selectedAddons.map(a => a._id)
            }, config);

            toast.success(t('home.booking_success'));
            navigate('/customer/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || t('home.booking_failed'));
        }
    };

    if (loading) return <div className="p-8 text-center text-indigo-600 font-bold animate-pulse">{t('home.loading_details')}</div>;
    if (!service) return <div className="p-8 text-center text-red-500 font-bold underline">{t('home.service_not_found')}</div>;

    const handleAddAddon = (addon) => {
        if (!selectedAddons.find(a => a._id === addon._id)) {
            setSelectedAddons([...selectedAddons, addon]);
            toast.success(`${addon.serviceName} added!`);
        }
        setShowUpsellModal(false);
    };

    // Calculate Discount - Prioritize specific service offers, then global ones, and pick highest %
    const applicableOffer = (offers || [])
        .filter(o => !o.service_id || o.service_id === service._id || o.service_id === service.id)
        .sort((a, b) => {
            // Specific service offers come first
            if (a.service_id && !b.service_id) return -1;
            if (!a.service_id && b.service_id) return 1;
            // Then sort by discount percentage descending
            return b.discount_percentage - a.discount_percentage;
        })[0];

    const discount = applicableOffer ? applicableOffer.discount_percentage : 0;
    const discountedPrice = discount ? Math.round(service.price * (1 - discount / 100)) : service.price;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">{service.serviceName}</h1>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{service.category}</span>
                        {discount > 0 && (
                            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest animate-bounce">{t('home.exclusive_offer', { discount })}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-50/50 border border-indigo-50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('home.service_description')}</h3>
                        <p className="text-gray-600 leading-relaxed font-medium mb-8 text-lg">{service.description}</p>
                        
                        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-50">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('home.pricing_model')}</p>
                                <div className="flex flex-col">
                                    {discount > 0 && (
                                        <span className="text-sm text-red-400 line-through font-bold">₹{service.price}</span>
                                    )}
                                    <span className="text-3xl font-black text-indigo-600">₹{discountedPrice}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('home.deployment_location')}</p>
                                <p className="text-lg font-bold text-gray-800">{service.location}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <User className="text-indigo-400" size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{t('home.assigned_provider')}</p>
                                <p className="text-xl font-bold">{service.providerId?.name}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">{t('home.verified_personnel')}</span>
                            <ShieldCheck size={18} className="text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 h-full">
                    <h2 className="text-xl font-bold mb-4">{t('home.book_this_service')}</h2>
                    <form onSubmit={handleBook} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 mb-1">{t('home.date')}</label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 border rounded"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 mb-2 text-xs font-black uppercase tracking-widest">{t('home.time')}</label>
                            {availableSlots.length > 0 ? (
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                >
                                    {availableSlots.map(slot => (
                                        <option key={slot} value={slot}>{slot}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="w-full px-4 py-3 bg-red-50 border-2 border-red-100 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                    <ShieldOff size={14} />
                                    {date ? "No slots available for this date" : "Please select a date first"}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1">{t('home.service_address')}</label>
                            <textarea
                                required
                                rows="2"
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                                placeholder={t('home.address_placeholder')}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">{t('home.default_address_msg')}</p>
                        </div>

                        {user && userSubscriptions.length > 0 && (
                            <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 shadow-sm mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Zap size={20} fill="currentColor" /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Subscription</p>
                                            <p className="text-sm font-bold text-slate-800">{userSubscriptions[0].plan?.name}</p>
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{userSubscriptions[0].remaining_visits} visits left</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={useCredit} 
                                            onChange={() => setUseCredit(!useCredit)} 
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                                {useCredit && (
                                    <div className="mt-3 pt-3 border-t border-indigo-50 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                        ✨ Zero payment required at checkout
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedAddons.length > 0 && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mb-4 overflow-hidden">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Service Add-ons</p>
                                <div className="space-y-2">
                                    {selectedAddons.map(addon => (
                                        <div key={addon._id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                                            <span className="text-xs font-bold text-slate-700">{addon.serviceName}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-indigo-600">₹{addon.price}</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => setSelectedAddons(selectedAddons.filter(a => a._id !== addon._id))}
                                                    className="text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${useCredit ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
                        >
                            {useCredit ? "Confirm with Credit" : t('home.confirm_booking')}
                        </button>
                    </form>
                </div>
            </div>

            {/* Upsell Modal */}
            <UpsellModal 
                isOpen={showUpsellModal} 
                onClose={() => setShowUpsellModal(false)}
                addons={availableAddons}
                onAdd={handleAddAddon}
                category={service.category}
            />

            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('home.feedback')}</h2>
                <ReviewsList serviceId={id} />
            </div>
        </div>
    );
};

export default ServiceDetails;
