import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';

const Profile = () => {
    const { user, login } = useContext(AuthContext); // login updates context
    const [formData, setFormData] = useState({
        name: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                address: user.address || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                }
            };

            const { data } = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/profile`, formData, config);

            // Update context
            login(data);

            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div className="p-8 text-center text-gray-500">Please log in to view your profile.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-black mb-2 text-gray-900">My Profile</h1>
            <p className="text-gray-500 mb-8 font-medium">Manage your account details and default service address.</p>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-gray-900 transition-colors"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Default Service Address</label>
                        <textarea
                            name="address"
                            required
                            rows="3"
                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-gray-900 transition-colors"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Enter your full home or office address..."
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-2 font-medium">This address will be pre-filled when you book a service.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Email</label>
                        <input
                            type="email"
                            disabled
                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-500 font-medium cursor-not-allowed"
                            value={user.email}
                        />
                        <p className="text-xs text-gray-400 mt-2 font-medium">Email cannot be changed.</p>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        >
                            {loading ? 'Saving Changes...' : 'Save Profile Details'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
