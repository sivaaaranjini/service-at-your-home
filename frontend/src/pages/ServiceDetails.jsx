import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';

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

    useEffect(() => {
        const fetchService = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/services/${id}`);
                setService(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchService();
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

    if (loading) return <div>Loading...</div>; // Placeholder
    if (!service) return <div>Service not found</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-4">{service.serviceName}</h1>
            <p className="text-gray-600 mb-4">{service.category}</p>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <p className="mb-4">{service.description}</p>
                <p className="text-2xl font-bold text-blue-600 mb-4">₹{service.price}</p>
                <p className="mb-4">Location: {service.location}</p>
                <p className="mb-4">Provider: {service.providerId?.name}</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border">
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
    );
};

export default ServiceDetails;
