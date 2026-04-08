import { useState, useRef } from 'react';
import { supabase } from '../config/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';

const ImageUpload = ({ onUploadComplete, folder = 'services' }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = async (file) => {
        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (PNG, JPG, etc.)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setError('Image size must be less than 5MB');
            return;
        }

        setError(null);
        setSuccess(false);
        setUploading(true);

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
                .from('services') // Make sure this bucket exists and is public
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('services')
                .getPublicUrl(filePath);

            setSuccess(true);
            if (onUploadComplete) onUploadComplete(publicUrl);
            
        } catch (err) {
            console.error('Upload Error:', err);
            setError(err.message || 'Failed to upload image. Please check your Supabase bucket settings.');
        } finally {
            setUploading(false);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    const clearImage = () => {
        setPreview(null);
        setSuccess(false);
        setError(null);
        if (onUploadComplete) onUploadComplete('');
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {preview ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group rounded-2xl overflow-hidden border-2 border-indigo-100 bg-white aspect-video"
                    >
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            {!uploading && (
                                <button 
                                    type="button"
                                    onClick={clearImage}
                                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all shadow-xl"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        
                        {uploading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Uploading to Cloud...</span>
                            </div>
                        )}

                        {success && !uploading && (
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg animate-bounce">
                                <CheckCircle2 size={16} />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        whileHover={{ scale: 1.01, borderColor: '#6366f1' }}
                        whileTap={{ scale: 0.99 }}
                        className={`
                            relative cursor-pointer border-2 border-dashed rounded-[2rem] p-10
                            flex flex-col items-center justify-center gap-4 transition-all duration-300
                            ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:shadow-indigo-100/50'}
                        `}
                    >
                        <div className={`p-5 rounded-3xl ${isDragging ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-500 shadow-sm'} transition-colors duration-300`}>
                            <Upload size={32} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Drag & Drop Image</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">or click to browse local files</p>
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={(e) => handleFile(e.target.files[0])}
                            accept="image/*"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-2 text-rose-500 px-4 py-3 bg-rose-50 rounded-xl border border-rose-100"
                >
                    <AlertCircle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                </motion.div>
            )}
        </div>
    );
};

export default ImageUpload;
