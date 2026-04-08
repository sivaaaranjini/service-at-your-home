import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa';

const ServiceCard = ({ service, offers = [] }) => {
    // Calculate Discount - Prioritize specific service offers, then global ones, and pick highest %
    const applicableOffer = (offers || [])
        .filter(o => !o.service_id || o.service_id === service._id || o.service_id === service.id)
        .sort((a, b) => {
            // Specific service offers come first
            if (a.service_id && !b.service_id) return -1;
            if (!a.service_id && b.service_id) return 1;
            // Then sort by discount percentage descending
            return b.discount_percentage - a.discount_percentage;
        })[0];

    const { t } = useTranslation();
    const discount = applicableOffer ? applicableOffer.discount_percentage : 0;
    const discountedPrice = discount ? Math.round(service.price * (1 - discount / 100)) : service.price;

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full group">
            {/* Image Section */}
            <div className="relative h-48 overflow-hidden bg-gray-100">
                {service.imageUrl ? (
                    <img 
                        src={service.imageUrl} 
                        alt={service.serviceName} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-blue-100">
                             <FaGlobe className="text-blue-400" size={24} />
                        </div>
                    </div>
                )}
                
                {discount > 0 && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg z-10">
                        {discount}% {t('home.off')}
                    </div>
                )}
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-3">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase font-semibold tracking-wide">
                        {service.category}
                    </span>
                    {service.distance != null && (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm border border-emerald-100/50">
                            {service.distance.toFixed(1)} KM AWAY
                        </span>
                    )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{service.serviceName}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                <div className="flex justify-between items-end mt-auto">
                    <div className="flex flex-col">
                        {discount > 0 && (
                            <span className="text-xs text-red-500 line-through font-bold opacity-60">₹{service.price}</span>
                        )}
                        <span className="text-gray-900 font-bold text-lg">₹{discountedPrice}</span>
                    </div>
                    <Link
                        to={`/services/${service._id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-bold"
                    >
                        {t('home.view_details')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;
