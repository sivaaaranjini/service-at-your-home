import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle, Zap, Shield, Sparkles, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const Subscriptions = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/plans`);
                setPlans(res.data);
            } catch (error) {
                toast.error("Failed to load subscription plans");
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const handlePurchase = async (planId, price) => {
        if (!user) {
            toast.error("Please login to purchase a plan");
            navigate('/login');
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            
            if (import.meta.env.VITE_MOCK_PAYMENT === 'true') {
                toast.info("Simulating purchase (Mock Mode)...");
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/verify`, {
                    planId,
                    razorpay_order_id: 'test',
                    razorpay_payment_id: 'test',
                    razorpay_signature: 'test'
                }, config);
                toast.success("Subscription activated! Enjoy your credits.");
                navigate('/customer/dashboard');
                return;
            }

            // 1. Create Order
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/purchase`, { planId }, config);
            // ... (rest of real flow)
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
                amount: data.order.amount,
                currency: 'INR',
                name: 'Service at Your Home',
                description: `Purchase ${data.plan.name}`,
                order_id: data.order.id,
                handler: async (response) => {
                    try {
                        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscriptions/verify`, {
                            planId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        }, config);
                        toast.success("Subscription activated! Enjoy your credits.");
                        navigate('/customer/dashboard');
                    } catch (err) { toast.error("Payment verification failed"); }
                },
                prefill: { name: user.name, email: user.email },
                theme: { color: '#4f46e5' },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) { toast.error(error.response?.data?.message || "Failed to initiate purchase"); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold uppercase tracking-widest animate-pulse">Loading Premium Plans...</div>;

    return (
        <div className="min-h-screen bg-[#f8fafc] py-20 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Sparkles size={14} /> Global Subscription Plans
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-6">Unlock More Value with <br/><span className="text-indigo-600">Service Credits</span></motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">Buy up-front and save big. Our category-wide plans work with any provider, giving you total flexibility and peace of mind.</motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {plans.map((plan, idx) => (
                        <motion.div 
                            key={plan.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-indigo-100/50 border border-slate-50 relative overflow-hidden group hover:-translate-y-2 transition-all"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                            
                            <div className="mb-8">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                                    {plan.total_visits >= 6 ? <Crown size={32} /> : plan.total_visits >= 3 ? <Zap size={32} /> : <Shield size={32} />}
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 leading-tight mb-2">{plan.name}</h3>
                                <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{plan.category}</p>
                            </div>

                            <div className="space-y-4 mb-10 border-t border-slate-50 pt-8">
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-600">{plan.total_visits} Service Credits included</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-600">Valid for {plan.validity_days} days</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-600">Priority Scheduling Support</span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-10 italic">"{plan.description}"</p>

                            <div className="flex items-baseline gap-2 mb-8">
                                <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase">One-time payment</span>
                            </div>

                            <button 
                                onClick={() => handlePurchase(plan.id, plan.price)}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 group/btn"
                            >
                                <CreditCard size={18} /> Buy Package
                                <Sparkles size={16} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            </button>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-32 bg-white p-16 rounded-[4rem] shadow-2xl border border-slate-50 text-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -mr-48 -mt-48 opacity-50"></div>
                   <div className="relative z-10">
                        <h2 className="text-3xl font-black text-slate-900 mb-6 uppercase tracking-tight">How it works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                            <div className="space-y-4">
                                <div className="text-3xl font-black text-indigo-100 italic">01</div>
                                <h4 className="font-black text-slate-800 uppercase text-sm">Choose Your Plan</h4>
                                <p className="text-sm text-slate-500 font-medium">Select a package that fits your home maintenance needs.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="text-3xl font-black text-indigo-100 italic">02</div>
                                <h4 className="font-black text-slate-800 uppercase text-sm">One-Click Purchase</h4>
                                <p className="text-sm text-slate-500 font-medium">Pay securely via Razorpay and get instant credits added to your wallet.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="text-3xl font-black text-indigo-100 italic">03</div>
                                <h4 className="font-black text-slate-800 uppercase text-sm">Book Any Provider</h4>
                                <p className="text-sm text-slate-500 font-medium">When booking a service, simply select "Use Credit" and you're done!</p>
                            </div>
                        </div>
                   </div>
                </div>
            </div>
        </div>
    );
};

export default Subscriptions;
