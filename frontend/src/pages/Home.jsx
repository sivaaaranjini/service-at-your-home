import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search, CalendarCheck, Coffee, ShieldCheck, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Home = () => {
    const [services, setServices] = useState([]);
    const [topProviders, setTopProviders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [recentReviews, setRecentReviews] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch Popular Services
                const resServices = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services`);
                setServices(resServices.data.slice(0, 3)); // Show top 3

                // Fetch Top Providers
                const resProviders = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/top-providers`);
                setTopProviders(resProviders.data);

                // Fetch Recent Reviews
                const resReviews = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reviews/recent`);
                setRecentReviews(resReviews.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    return (
        <div className="flex flex-col min-h-screen font-sans text-gray-800">
            {/* 1. Enhanced Hero Section with Banner */}
            <section className="relative min-h-[500px] flex items-center bg-blue-900 text-white overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/images/hero-banner.png" 
                        alt={t('home.hero_title')} 
                        className="w-full h-full object-cover opacity-50"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-900/40 text-center to-transparent"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 relative z-10 w-full text-center flex flex-col items-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                        className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight"
                    >
                        {t('home.hero_title')}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-xl md:text-2xl mb-10 text-blue-100 max-w-2xl"
                    >
                        {t('home.hero_subtitle')}
                    </motion.p>

                    {/* Search Bar */}
                    <motion.form
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring' }}
                        onSubmit={handleSearch}
                        className="w-full max-w-3xl flex bg-white rounded-full shadow-2xl overflow-hidden p-2"
                    >
                        <div className="flex items-center pl-4 text-gray-400">
                            <Search size={24} />
                        </div>
                        <input
                            type="text"
                            placeholder={t('home.search_placeholder_long') || "What do you need help with? (e.g. Plumbing, Cleaning)"}
                            className="flex-grow px-4 py-4 text-gray-800 text-lg focus:outline-none bg-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-md">
                            {t('home.search_btn')}
                        </button>
                    </motion.form>
                </div>
            </section>

            {/* 2. Floating Live Stats Counter */}
            <section className="bg-white py-12 border-b border-gray-100 shadow-sm relative z-20 -mt-8 rounded-t-3xl mx-4 md:mx-auto max-w-6xl w-full xl:w-full">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-around items-center gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col items-center px-8 pt-4 md:pt-0">
                        <span className="text-4xl font-extrabold text-blue-600 mb-2">10,000+</span>
                        <span className="text-gray-500 font-medium uppercase tracking-wider text-sm">{t('home.stats_completed')}</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col items-center px-8 pt-4 md:pt-0">
                        <span className="text-4xl font-extrabold text-blue-600 mb-2">500+</span>
                        <span className="text-gray-500 font-medium uppercase tracking-wider text-sm">{t('home.stats_pros')}</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="flex flex-col items-center px-8 pt-4 md:pt-0">
                        <span className="text-4xl font-extrabold text-blue-600 mb-2 flex items-center">4.9 <span className="text-yellow-400 text-3xl ml-1">★</span></span>
                        <span className="text-gray-500 font-medium uppercase tracking-wider text-sm">{t('home.stats_rating')}</span>
                    </motion.div>
                </div>
            </section>

            {/* 3. Dynamic "How It Works" Guide */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('home.how_it_works')}</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('home.how_subtitle')}</p>
                    </div>

                    <motion.div
                        variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center"
                    >
                        <motion.div variants={itemVariants} className="flex flex-col items-center">
                            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                                <Search className="text-blue-600" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.step1_title')}</h3>
                            <p className="text-gray-600 leading-relaxed">{t('home.step1_desc')}</p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex flex-col items-center relative">
                            <div className="hidden md:block absolute top-12 -left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent -z-10"></div>
                            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                                <CalendarCheck className="text-blue-600" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.step2_title')}</h3>
                            <p className="text-gray-600 leading-relaxed">{t('home.step2_desc')}</p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex flex-col items-center relative">
                            <div className="hidden md:block absolute top-12 -left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent -z-10"></div>
                            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                                <Coffee className="text-blue-600" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-gray-800">{t('home.step3_title')}</h3>
                            <p className="text-gray-600 leading-relaxed">{t('home.step3_desc')}</p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* 4. Popular Services Carousel */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t('home.most_requested')}</h2>
                            <p className="text-gray-600">{t('home.trending')}</p>
                        </div>
                        <Link to="/services" className="hidden md:inline-flex text-blue-600 font-semibold hover:text-blue-800 items-center">
                            {t('home.view_all')} <span className="ml-1">&rarr;</span>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                            <p className="text-gray-500 italic">{t('home.loading_pop_services')}</p>
                        </div>
                    ) : services.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                            <p className="text-gray-500 italic">{t('home.no_pop_services')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {services.map((service) => (
                                <motion.div
                                    key={service._id}
                                    whileHover={{ y: -10, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                                    className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col transition-all duration-300 group"
                                >
                                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                                        {service.image ? (
                                            <img src={service.image} alt={service.serviceName} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full bg-blue-50 text-6xl">🛠️</div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                            {service.category}
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{service.serviceName}</h3>
                                            {(() => {
                                                const hash = (service._id || service.serviceName || 'a').toString().split('').reduce((a,b) => a + b.charCodeAt(0), 0);
                                                const distance = (hash % 15) + ((hash % 10) / 10);
                                                return (
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                                                        {distance.toFixed(1)} KM
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{service.description}</p>
                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                            <span className="text-xl font-extrabold text-blue-600">₹{service.price}</span>
                                            <Link to={`/services/${service._id}`} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-600 hover:text-white transition">
                                                {t('home.book_now')}
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                    <div className="mt-10 text-center md:hidden">
                        <Link to="/services" className="inline-block bg-white text-blue-600 border border-blue-200 px-6 py-3 rounded-full font-semibold shadow-sm">
                            {t('home.view_all')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* 5. Top Rated Providers Spotlight */}
            <section className="py-24 bg-indigo-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.elite_providers')}</h2>
                        <p className="text-indigo-200 text-lg max-w-2xl mx-auto">{t('home.elite_subtitle')}</p>
                    </div>

                    {loading ? (
                        <p className="text-center text-indigo-300 italic">{t('home.loading_elite')}</p>
                    ) : topProviders.length === 0 ? (
                        <p className="text-center text-indigo-300 italic">{t('home.no_elite')}</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {topProviders.map((provider) => (
                                <div key={provider._id} className="bg-indigo-800 rounded-2xl p-8 border border-indigo-700 shadow-xl flex flex-col items-center text-center transform transition hover:scale-105 duration-300">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-400 to-emerald-400 p-1 mb-4 shadow-lg">
                                        <div className="w-full h-full rounded-full bg-indigo-900 flex items-center justify-center overflow-hidden border-2 border-indigo-900">
                                            {/* generate a reliable avatar based on name length or generic unpslash */}
                                            <span className="text-3xl font-bold text-white">{provider.name.charAt(0)}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{provider.name}</h3>
                                    <p className="text-indigo-300 text-sm mb-4">{t('home.verified_pro')} {provider.isProviderApproved && <CheckCircle size={14} className="inline text-emerald-400 -mt-0.5 ml-1" />}</p>

                                    <div className="flex bg-indigo-900/50 rounded-full px-4 py-2 mb-6 w-full justify-center space-x-2 border border-indigo-700/50">
                                        <span className="text-yellow-400">★ 5.0</span>
                                        <span className="text-indigo-400">|</span>
                                        <span className="text-indigo-100">{t('home.tasks_count')}</span>
                                    </div>

                                    <Link to={`/services`} className="w-full bg-white text-indigo-900 py-3 rounded-lg font-bold shadow-md hover:bg-indigo-50 transition">
                                        {t('home.view_profile')}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
            {/* 6. Live Customer Testimonials */}
            <section className="py-24 bg-white hidden sm:block">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">{t('home.stories')}</h2>
                    
                    {recentReviews.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 italic text-gray-400">
                            {t('home.testimonial_loading')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {recentReviews.map((review) => (
                                <motion.div 
                                    key={review._id} 
                                    whileHover={{ y: -5 }}
                                    className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all flex flex-col h-full"
                                >
                                    <div className="flex text-yellow-400 text-lg mb-4">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                        ))}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-gray-700 italic mb-6 leading-relaxed relative">
                                            <span className="absolute -top-4 -left-2 text-4xl text-blue-100 font-serif">"</span>
                                            {review.comment}
                                            <span className="absolute -bottom-6 right-0 text-4xl text-blue-100 font-serif">"</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center mt-6 pt-6 border-t border-gray-50">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-bold text-white mr-4 shadow-md">
                                            {review.customerId?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{review.customerId?.name || t('home.anon_user')}</h4>
                                            {review.serviceId && (
                                                <p className="text-xs font-semibold text-blue-500 uppercase tracking-tighter">
                                                    {review.serviceId.service_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* 7. Trust & Safety Badges */}
            <section className="py-12 bg-gray-100 border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                    <div className="flex items-center text-gray-600">
                        <ShieldCheck className="text-emerald-500 mr-3" size={32} />
                        <span className="font-semibold text-lg">{t('home.secure_payments_badge')}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <CheckCircle className="text-blue-500 mr-3" size={32} />
                        <span className="font-semibold text-lg">{t('home.verified_pros_badge')}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <Clock className="text-indigo-500 mr-3" size={32} />
                        <span className="font-semibold text-lg">{t('home.support_badge')}</span>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
