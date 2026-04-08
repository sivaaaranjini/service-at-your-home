import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`, { email, password });
            login(res.data);
            toast.success(t('auth.login_success'));

            if (res.data.role === 'admin') navigate('/admin/dashboard');
            else if (res.data.role === 'provider') navigate('/provider/dashboard');
            else if (res.data.role === 'customer') navigate('/services');
            else navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || t('auth.login_failed'));
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center">{t('auth.login')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">{t('auth.email')}</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">{t('auth.password')}</label>
                        <input
                            type="password"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        {t('auth.login')}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm">
                    {t('auth.no_account')} <Link to="/register" className="text-blue-600">{t('auth.register')}</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
