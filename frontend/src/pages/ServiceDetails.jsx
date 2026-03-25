import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import ReviewsList from '../components/ReviewsList';
import { User, ShieldCheck } from 'lucide-react';

const ServiceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [address, setAddress] = useState(user?.address || '');

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
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleBook = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error('Please login to book a service');
            navigate('/login');
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
                address
            }, config);

            toast.success('Booking created successfully! Please pay to confirm.');
            navigate('/customer/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Booking failed');
        }
    };

    if (loading) return <div className="p-8 text-center text-indigo-600 font-bold animate-pulse">Loading Service Details...</div>;
    if (!service) return <div className="p-8 text-center text-red-500 font-bold underline">Service Protocol Not Found</div>;

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
                            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest animate-bounce">Exclusive {discount}% Offer</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-50/50 border border-indigo-50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Service Description</h3>
                        <p className="text-gray-600 leading-relaxed font-medium mb-8 text-lg">{service.description}</p>
                        
                        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-50">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pricing Model</p>
                                <div className="flex flex-col">
                                    {discount > 0 && (
                                        <span className="text-sm text-red-400 line-through font-bold">₹{service.price}</span>
                                    )}
                                    <span className="text-3xl font-black text-indigo-600">₹{discountedPrice}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deployment Location</p>
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
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Assigned Provider</p>
                                <p className="text-xl font-bold">{service.providerId?.name}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Verified Personnel</span>
                            <ShieldCheck size={18} className="text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 h-full">
                    <h2 className="text-xl font-bold mb-4">Book This Service</h2>
                    <form onSubmit={handleBook} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 border rounded"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1">Time</label>
                            <input
                                type="time"
                                required
                                className="w-full px-3 py-2 border rounded"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1">Service Address</label>
                            <textarea
                                required
                                rows="2"
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                                placeholder="Enter the full address for the service..."
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Default address loaded from your profile.</p>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            Confirm Booking
                        </button>
                    </form>
                </div>
            </div>

            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Customer Feedback</h2>
                <ReviewsList serviceId={id} />
            </div>
        </div>
    );
};

export default ServiceDetails;
