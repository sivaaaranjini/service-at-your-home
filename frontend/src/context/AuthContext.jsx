import { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    return (
        <AuthContext.Provider value={{ 
            user, login, logout, loading, 
            isSidebarOpen, toggleSidebar, setSidebarOpen,
            searchTerm, setSearchTerm 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
