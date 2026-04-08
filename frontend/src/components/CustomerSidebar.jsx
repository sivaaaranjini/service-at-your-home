import { useContext } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { 
    LayoutDashboard, ClipboardList, Zap, Settings, 
    LogOut, ShieldCheck, Crown, History 
} from 'lucide-react';

const CustomerSidebar = () => {
    const { user, isSidebarOpen, setSidebarOpen } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const customerSection = searchParams.get('tab') || 'bookings';

    if (!user || user.role !== 'customer') return null;

    const navigateToSection = (sectionId) => {
        // Direct page navigations
        if (sectionId === 'explore') {
            navigate('/services');
            setSidebarOpen(false);
            return;
        }
        if (sectionId === 'plans') {
            navigate('/subscriptions');
            setSidebarOpen(false);
            return;
        }

        // Dashboard sections
        if (location.pathname !== '/customer/dashboard') {
            navigate(`/customer/dashboard?tab=${sectionId}`);
        } else {
            setSearchParams({ tab: sectionId });
        }
        setSidebarOpen(false);
    };

    const navItems = [
        { id: 'explore', label: 'Service Marketplace', icon: LayoutDashboard, color: 'text-emerald-500' },
        { id: 'plans', label: 'Membership Plans', icon: Crown, color: 'text-amber-500' },
        { id: 'custom_jobs', label: 'Custom Job Requests', icon: Zap, color: 'text-yellow-500' },
        { id: 'bookings', label: 'My Bookings', icon: ClipboardList, color: 'text-indigo-600' },
        { id: 'subscriptions', label: "Active Memberships", icon: History, color: 'text-indigo-500' },
        { id: 'settings', label: 'Account Settings', icon: Settings, color: 'text-slate-400' },
    ];

    return (
        <>
            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1001]"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Drawer */}
            <motion.div 
                initial={false}
                animate={{ x: isSidebarOpen ? 0 : -320 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 w-80 bg-white border-r border-slate-100 flex flex-col h-screen overflow-y-auto z-[1002] shadow-2xl shadow-indigo-100/50"
            >
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-10 pb-4 border-b border-slate-50">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">Service@Home</h1>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 opacity-70">Member Protocol</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-1.5">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => navigateToSection(item.id)}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                                    (location.pathname === '/customer/dashboard' && customerSection === item.id) || 
                                    (location.pathname === '/services' && item.id === 'explore')
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                }`}
                            >
                                <item.icon size={18} className={(location.pathname === '/customer/dashboard' && customerSection === item.id) || (location.pathname === '/services' && item.id === 'explore') ? item.color : 'text-slate-300 group-hover:text-slate-400'} />
                                <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                                {((location.pathname === '/customer/dashboard' && customerSection === item.id) || (location.pathname === '/services' && item.id === 'explore')) && (
                                    <motion.div layoutId="globalActiveDot" className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Footer / Logout */}
                <div className="mt-auto p-8 border-t border-slate-50">
                    <button 
                        onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} 
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-black text-xs uppercase tracking-widest"
                    >
                        <LogOut size={20} /> Sign Out
                    </button>
                </div>
            </motion.div>
        </>
    );
};

export default CustomerSidebar;
