import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const VerifyOtp = () => {
    const [otp, setOtp] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    const email = location.state?.email;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/verify-otp`, { email, otp });
            login(res.data);
            toast.success('Account verified!');

            if (res.data.role === 'admin') navigate('/admin/dashboard');
            else if (res.data.role === 'provider') navigate('/provider/dashboard');
            else navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Verification failed');
        }
    };

    if (!email) {
        return <div className="text-center p-10">Invalid access. Please register first.</div>;
    }

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center">Verify OTP</h2>
                <p className="mb-4 text-center text-gray-600">Enter the OTP sent to {email}</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-center tracking-widest text-xl"
                            maxLength="6"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        Verify
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VerifyOtp;
