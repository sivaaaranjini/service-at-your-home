import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const Register = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        address: '', // Added address
        role: 'customer', // Default
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`, formData);
            toast.success(t('auth.reg_success'));
            navigate('/verify-otp', { state: { email: formData.email } });
        } catch (error) {
            toast.error(error.response?.data?.message || t('auth.reg_failed'));
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center">{t('auth.register')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">{t('auth.name')}</label>
                        <input
                            type="text"
                            name="name"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">{t('auth.email')}</label>
                        <input
                            type="email"
                            name="email"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">{t('auth.password')}</label>
                        <input
                            type="password"
                            name="password"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">{t('auth.address')}</label>
                        <input
                            type="text"
                            name="address"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={formData.address}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">{t('auth.i_am_a')}</label>
                        <select
                            name="role"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="customer">{t('auth.customer')}</option>
                            <option value="provider">{t('auth.service_provider')}</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        {t('auth.register')}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm">
                    {t('auth.have_account')} <Link to="/login" className="text-blue-600">{t('auth.login')}</Link>
                </p>
            </div>
        </div >
    );
};

export default Register;
