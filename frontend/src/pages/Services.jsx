import { useState, useEffect } from 'react';
import axios from 'axios';
import ServiceCard from '../components/ServiceCard';

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchServices();
    }, [category]); // Fetch when category changes

    const fetchServices = async () => {
        setLoading(true);
        try {
            let url = `\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services`;
            const params = {};
            if (category) params.category = category;
            if (searchTerm) params.search = searchTerm;

            const res = await axios.get(url, { params });
            setServices(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchServices();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Files Services</h1>

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
                    {services.map((service) => (
                        <ServiceCard key={service._id} service={service} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500">No services found.</p>
            )}
        </div>
    );
};

export default Services;
