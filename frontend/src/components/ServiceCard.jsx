import { Link } from 'react-router-dom';

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

    const discount = applicableOffer ? applicableOffer.discount_percentage : 0;
    const discountedPrice = discount ? Math.round(service.price * (1 - discount / 100)) : service.price;

    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition relative overflow-hidden">
            {discount > 0 && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-8 py-1 rotate-45 translate-x-8 translate-y-2 text-[10px] font-black uppercase tracking-widest shadow-lg z-10">
                    {discount}% OFF
                </div>
            )}
            
            <div className="mb-4 flex justify-between items-start">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase font-semibold tracking-wide">
                    {service.category}
                </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{service.serviceName}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
            <div className="flex justify-between items-end">
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
                    View Details
                </Link>
            </div>
        </div>
    );
};

export default ServiceCard;
