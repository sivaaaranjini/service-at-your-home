import { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaUserCircle, FaBars, FaTimes, FaGlobe, FaSearch } from 'react-icons/fa';
import { Menu, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from './NotificationBell';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { isSidebarOpen, toggleSidebar, searchTerm, setSearchTerm } = useContext(AuthContext);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsLangOpen(false);
    };

    const handleLogout = () => {
        logout();
        setIsOpen(false);
        navigate('/login');
    };

    const toggleMenu = () => setIsOpen(!isOpen);

    const navLinks = user?.role === 'customer' 
        ? []
        : [
            { name: t('nav.services'), path: '/services' },
            { name: 'Plans', path: '/subscriptions' },
            ...(user ? [
                {
                    name: user.role === 'provider' ? t('nav.dashboard') : t('nav.admin_panel'),
                    path: `/${user.role}/dashboard`
                }
            ] : [
                { name: t('nav.login'), path: '/login' },
                { name: t('nav.register'), path: '/register', isButton: true }
            ])
        ];

    return (
        <nav className="bg-white shadow-md sticky top-0 z-[1000]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo & Hamburger */}
                    <div className="flex items-center gap-4">
                        {user?.role === 'customer' && (
                            <button 
                                onClick={toggleSidebar}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                            >
                                <Menu size={24} />
                            </button>
                        )}
                        <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tighter">
                            Service<span className="text-gray-900">@Home</span>
                        </Link>
                    </div>

                    {/* Central Search Bar */}
                    {user?.role === 'customer' && location.pathname !== '/' && (
                        <div className="hidden md:flex flex-1 max-w-md mx-8 items-center relative">
                            <div className="absolute left-4 text-gray-400">
                                <Search size={18} />
                            </div>
                            <input 
                                type="text"
                                placeholder={t('home.search_placeholder_long')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 border-none px-12 py-2.5 rounded-full text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 placeholder-gray-400 transition-all outline-none"
                            />
                        </div>
                    )}

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
                            <div className="flex items-center gap-4 pl-4 border-l relative">
                                <NotificationBell />
                                <div className="h-6 w-px bg-gray-200"></div>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="flex items-center text-gray-700 hover:text-blue-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 group"
                                    >
                                        <FaUserCircle className="mr-2 text-blue-500 group-hover:text-blue-600 transition-colors" />
                                        <span className="text-sm font-semibold truncate max-w-[100px]">{user.name}</span>
                                    </button>

                                    <AnimatePresence>
                                        {isProfileOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[1100]"
                                            >
                                                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                                    <p className="text-xs font-bold text-gray-400 uppercase">Signed in as</p>
                                                    <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                                                </div>
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                                                >
                                                    {t('nav.profile')}
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        handleLogout();
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold"
                                                >
                                                    {t('nav.logout')}
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {/* Language Selector */}
                        <div className="relative ml-4">
                            <button 
                                onClick={() => setIsLangOpen(!isLangOpen)}
                                className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
                            >
                                <FaGlobe className="text-blue-500" />
                                <span className="text-xs font-bold uppercase">{(i18n.language || 'en').split('-')[0]}</span>
                            </button>
                            <AnimatePresence>
                                {isLangOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[1100]"
                                    >
                                        <button onClick={() => changeLanguage('en')} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 font-medium">English</button>
                                        <button onClick={() => changeLanguage('hi')} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 font-medium">हिन्दी (Hindi)</button>
                                        <button onClick={() => changeLanguage('ta')} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 font-medium">தமிழ் (Tamil)</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
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
                                <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center p-3 mb-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                                    <FaUserCircle className="text-blue-600 mr-3" size={30} />
                                    <div>
                                        <p className="font-bold text-gray-900">{user.name}</p>
                                        <p className="text-xs text-blue-600 capitalize">{user.role}</p>
                                    </div>
                                </Link>
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
                                    {t('nav.logout')}
                                </button>
                            )}
                            
                            {/* Mobile Language Selector */}
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-3 px-4">Select Language</p>
                                <div className="flex flex-wrap gap-2 px-2">
                                    <button onClick={() => { changeLanguage('en'); setIsOpen(false); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>English</button>
                                    <button onClick={() => { changeLanguage('hi'); setIsOpen(false); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${i18n.language === 'hi' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>हिन्दी</button>
                                    <button onClick={() => { changeLanguage('ta'); setIsOpen(false); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${i18n.language === 'ta' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>தமிழ்</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
