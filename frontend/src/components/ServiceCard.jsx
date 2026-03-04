import { Link } from 'react-router-dom';

const ServiceCard = ({ service }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase font-semibold tracking-wide">
                    {service.category}
                </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">{service.serviceName}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
            <div className="flex justify-between items-center">
                <span className="text-gray-900 font-bold">₹{service.price}</span>
                <Link
                    to={`/services/${service._id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
                >
                    View Details
                </Link>
            </div>
        </div>
    );
};

export default ServiceCard;
