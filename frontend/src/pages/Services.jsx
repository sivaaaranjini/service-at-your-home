import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ServiceCard from '../components/ServiceCard';

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [finalSearchTerm, setFinalSearchTerm] = useState('');

    const fetchServices = useCallback(async () => {
        console.log("[DEBUG Services] fetchServices starting...");
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            console.log("[DEBUG Services] URL:", `${apiUrl}/api/services`);
            let url = `${apiUrl}/api/services`;
            const params = {};
            if (category) params.category = category;
            if (finalSearchTerm) params.search = finalSearchTerm;

            const res = await axios.get(url, { params });
            console.log("[DEBUG Services] response received:", res.data);
            if (Array.isArray(res.data)) {
                setServices(res.data);
            } else {
                console.error("[DEBUG Services] data is not an array:", res.data);
                setServices([]);
            }
        } catch (error) {
            console.error("[DEBUG Services] error:", error);
            toast.error(error.response?.data?.message || "Failed to load services. Check your connection.");
        } finally {
            setLoading(false);
        }
    }, [category, finalSearchTerm]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    useEffect(() => {
        console.log("[DEBUG Services] Current services state:", services);
    }, [services]);

    const handleSearch = (e) => {
        e.preventDefault();
        setFinalSearchTerm(searchTerm);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Available Services</h1>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <form onSubmit={handleSearch} className="flex-grow flex gap-2">
                    <input
                        type="text"
                        placeholder="Search services..."
                        className="flex-grow px-4 py-2 border rounded-md focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">Search</button>
                </form>
                <select
                    className="px-4 py-2 border rounded-md focus:outline-none focus:border-blue-500"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">All Categories</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Painting">Painting</option>
                </select>
            </div>

            {loading ? (
                <p className="text-center">Loading services...</p>
            ) : services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, idx) => {
                        try {
                            if (!service) return null;
                            return <ServiceCard key={service?._id || service?.id || idx} service={service} />;
                        } catch (err) {
                            console.error("[DEBUG Services] Error rendering ServiceCard:", err, "Service data:", service);
                            return null;
                        }
                    })}
                </div>
            ) : (
                <p className="text-center text-gray-500">No services found.</p>
            )}
        </div>
    );
};

export default Services;
