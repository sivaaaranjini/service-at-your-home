import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { FaUserCircle } from 'react-icons/fa';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="text-2xl font-bold text-blue-600">
                            Service@Home
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link to="/services" className="text-gray-700 hover:text-blue-600">
                            Services
                        </Link>
                        {user ? (
                            <>
                                {user.role === 'provider' && (
                                    <Link to="/provider/dashboard" className="text-gray-700 hover:text-blue-600">
                                        My Dashboard
                                    </Link>
                                )}
                                {user.role === 'admin' && (
                                    <Link to="/admin/dashboard" className="text-gray-700 hover:text-blue-600">
                                        Admin Panel
                                    </Link>
                                )}
                                {user.role === 'customer' && (
                                    <Link to="/customer/dashboard" className="text-gray-700 hover:text-blue-600">
                                        My Bookings
                                    </Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
                                >
                                    Logout
                                </button>
                                <div className="flex items-center text-gray-700">
                                    <FaUserCircle className="mr-2" />
                                    <span>{user.name}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-gray-700 hover:text-blue-600 px-3 py-2"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
