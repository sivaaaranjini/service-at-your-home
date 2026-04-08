import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Sparkles, ChevronRight } from 'lucide-react';

const UpsellModal = ({ isOpen, onClose, addons, onAdd, category, mainServicePrice }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[2500] p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 30 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.9, y: 30 }} 
                    className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl relative overflow-hidden"
                >
                    {/* Header with Background Gradient */}
                    <div className="h-40 bg-gradient-to-br from-indigo-600 to-indigo-900 flex flex-col items-center justify-center p-8 text-center relative">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                        <motion.div 
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 5 }}
                            className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border border-white/20"
                        >
                            <Sparkles className="text-yellow-300" size={32} fill="currentColor" />
                        </motion.div>
                        <h2 className="text-2xl font-black text-white leading-tight">Wait! Level Up Your Service?</h2>
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-2">Exclusive {category} add-ons for you</p>
                    </div>

                    <div className="p-8">
                        <p className="text-sm text-slate-500 mb-6 text-center font-medium leading-relaxed">
                            Customers who add these typically report <span className="text-indigo-600 font-black">2x higher satisfaction</span>. Add now for current pricing!
                        </p>

                        <div className="space-y-4">
                            {addons.map((addon) => (
                                <motion.div 
                                    key={addon.id} 
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-indigo-100 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Plus size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-sm tracking-tight">{addon.serviceName}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Special Add-on Price</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-indigo-600 font-black text-lg">₹{addon.price}</div>
                                        <button 
                                            onClick={() => onAdd(addon)}
                                            className="mt-1 px-4 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        >
                                            Add +
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            <button 
                                onClick={onClose}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                Continue to Checkout <ChevronRight size={16} />
                            </button>
                            <button 
                                onClick={onClose}
                                className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors py-2"
                            >
                                No thanks, maybe next time
                            </button>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 right-6 w-8 h-8 bg-black/20 text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors backdrop-blur-md"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UpsellModal;
