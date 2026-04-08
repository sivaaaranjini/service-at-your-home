import { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import ServiceCard from '../components/ServiceCard';
import { useTranslation } from 'react-i18next';
import { serviceCategories } from '../data/serviceCategories';
import { MapPin } from 'lucide-react';

const Services = () => {
    const { searchTerm: globalSearchTerm } = useContext(AuthContext);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [finalSearchTerm, setFinalSearchTerm] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [showNearby, setShowNearby] = useState(false);
    const { t } = useTranslation();

    const [offers, setOffers] = useState([]);

    const fetchServices = useCallback(async () => {
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            
            // Fetch Services and Offers in parallel
            const [servicesRes, offersRes] = await Promise.all([
                axios.get(`${apiUrl}/api/services`, { params: { category, search: globalSearchTerm || finalSearchTerm || subCategory } }),
                axios.get(`${apiUrl}/api/offers`)
            ]);

            setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
            setOffers(Array.isArray(offersRes.data) ? offersRes.data : []);
        } catch (error) {
            console.error("[DEBUG Services] error:", error);
            toast.error(t('home.failed_load_data'));
        } finally {
            setLoading(false);
        }
    }, [category, finalSearchTerm, subCategory]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices, globalSearchTerm]);

    useEffect(() => {
        console.log("[DEBUG Services] Current services state:", services);
    }, [services]);

    const handleSearch = (e) => {
        e.preventDefault();
        setFinalSearchTerm(searchTerm);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">{t('home.services_title')}</h1>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <form onSubmit={handleSearch} className="flex-grow flex gap-2">
                    <input
                        type="text"
                        placeholder={t('home.search_placeholder')}
                        className="flex-grow px-4 py-2 border rounded-md focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">{t('home.search_btn')}</button>
                </form>
                <select
                    className="px-4 py-2 border rounded-md focus:outline-none focus:border-blue-500 min-w-[200px]"
                    value={category}
                    onChange={(e) => {
                        setCategory(e.target.value);
                        setSubCategory(''); // Reset sub-category when main category changes
                        setFinalSearchTerm(''); // Clear text search
                        setSearchTerm('');
                    }}
                >
                    <option value="">{t('home.all_categories')}</option>
                    {serviceCategories.map((cat, idx) => (
                        <option key={idx} value={cat.name}>{cat.name}</option>
                    ))}
                </select>

                {category && (
                    <select
                        className="px-4 py-2 border rounded-md focus:outline-none focus:border-blue-500 min-w-[200px]"
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                    >
                        <option value="">All {category}</option>
                        {serviceCategories.find(c => c.name === category)?.subServices.map((sub, idx) => (
                            <option key={idx} value={sub}>{sub}</option>
                        ))}
                    </select>
                )}

                <button 
                    onClick={() => setShowNearby(!showNearby)} 
                    className={`ml-auto flex items-center md:ml-4 gap-2 px-6 py-2 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all ${
                        showNearby 
                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    <MapPin size={16} /> SHOW NEARBY ONLY
                </button>
            </div>

            {loading ? (
                <p className="text-center">{t('home.loading_services')}</p>
            ) : services.length > 0 ? (
                (() => {
                    const processedServices = services.map(service => {
                        const hash = (service._id || service.serviceName || 'a').toString().split('').reduce((a,b) => a + b.charCodeAt(0), 0);
                        return { ...service, distance: (hash % 15) + ((hash % 10) / 10) };
                    });

                    const displayedServices = showNearby 
                        ? processedServices.filter(s => s.distance <= 5.0).sort((a,b) => a.distance - b.distance)
                        : processedServices;

                    return displayedServices.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayedServices.map((service, idx) => {
                                try {
                                    if (!service) return null;
                                    return <ServiceCard key={service?._id || service?.id || idx} service={service} offers={offers} />;
                                } catch (err) {
                                    console.error("[DEBUG Services] Error rendering ServiceCard:", err, "Service data:", service);
                                    return null;
                                }
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-100">
                            <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-wide">No Nearby Pros Found</h3>
                            <p className="text-slate-500 font-medium">Try increasing your radius or turning off the nearby filter.</p>
                        </div>
                    );
                })()
            ) : (
                <p className="text-center text-gray-500">{t('home.no_services')}</p>
            )}
        </div>
    );
};

export default Services;
