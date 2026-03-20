import { useState, useEffect } from 'react';
import axios from 'axios';

const ReviewsList = ({ providerId, serviceId }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reviews`;
                if (providerId) url += `/provider/${providerId}`;
                else if (serviceId) url += `/service/${serviceId}`;
                
                const res = await axios.get(url);
                setReviews(res.data);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, [providerId, serviceId]);

    if (loading) return <div className="text-gray-500 animate-pulse">Loading reviews...</div>;

    if (reviews.length === 0) {
        return (
            <div className="bg-gray-50 p-8 rounded-xl text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-500 italic">No feedback received yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
                <div key={review._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center font-bold text-blue-600 mr-4 shadow-inner border border-white">
                                {review.customerId?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{review.customerId?.name || 'Anonymous'}</h4>
                                <div className="flex text-yellow-400 text-sm mt-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                    ))}
                                </div>
                                {review.serviceId && (
                                    <p className="text-xs font-medium text-indigo-500 mt-1 truncate max-w-[150px]">{review.serviceId.service_name}</p>
                                )}
                            </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                            {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="flex-grow flex items-center bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                        <p className="text-gray-700 text-sm leading-relaxed italic">"{review.comment}"</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ReviewsList;
