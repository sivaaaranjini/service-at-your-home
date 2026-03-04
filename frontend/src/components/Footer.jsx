const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p>&copy; {new Date().getFullYear()} Service at Your Home. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
