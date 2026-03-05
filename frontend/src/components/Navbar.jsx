import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaUserCircle, FaBars, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        setIsOpen(false);
        navigate('/login');
    };

    const toggleMenu = () => setIsOpen(!isOpen);

    const navLinks = [
        { name: 'Services', path: '/services' },
        ...(user ? [
            {
                name: user.role === 'provider' ? 'Dashboard' : user.role === 'admin' ? 'Admin Panel' : 'My Bookings',
                path: `/${user.role}/dashboard`
            }
        ] : [
            { name: 'Login', path: '/login' },
            { name: 'Register', path: '/register', isButton: true }
        ])
    ];

    return (
        <nav className="bg-white shadow-md sticky top-0 z-[1000]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tighter">
                            Service<span className="text-gray-900">@Home</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={link.isButton
                                    ? "bg-blue-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-blue-700 transition shadow-md shadow-blue-100"
                                    : "text-gray-700 font-medium hover:text-blue-600 transition"}
                            >
                                {link.name}
                            </Link>
                        ))}
                        {user && (
                            <div className="flex items-center gap-4 pl-4 border-l">
                                <div className="flex items-center text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                    <FaUserCircle className="mr-2 text-blue-500" />
                                    <span className="text-sm font-semibold truncate max-w-[100px]">{user.name}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm font-bold text-red-500 hover:text-red-700 transition"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center">
                        <button
                            onClick={toggleMenu}
                            className="text-gray-700 hover:text-blue-600 focus:outline-none p-2"
                        >
                            {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-t border-gray-100 overflow-hidden shadow-lg"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            {user && (
                                <div className="flex items-center p-3 mb-4 bg-blue-50 rounded-xl">
                                    <FaUserCircle className="text-blue-600 mr-3" size={30} />
                                    <div>
                                        <p className="font-bold text-gray-900">{user.name}</p>
                                        <p className="text-xs text-blue-600 capitalize">{user.role}</p>
                                    </div>
                                </div>
                            )}
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={link.isButton
                                        ? "block w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-center shadow-lg"
                                        : "block px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 hover:text-blue-600 rounded-xl transition"}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            {user && (
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition"
                                >
                                    Log Out
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
