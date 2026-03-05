import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ServiceDetails from './pages/ServiceDetails';
import VerifyOtp from './pages/VerifyOtp';
import Services from './pages/Services';
import Dashboard from './pages/Dashboard';
import { useEffect } from 'react';
import socket from './utils/socket';

function App() {
  useEffect(() => {
    socket.on('receive_broadcast', (message) => {
      toast.info(`📢 SYSTEM MESSAGE: ${message}`, {
        position: "top-center",
        autoClose: false,
        theme: "colored",
        style: { fontSize: '1.1rem', fontWeight: 'bold' }
      });
    });

    return () => {
      socket.off('receive_broadcast');
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/:id" element={<ServiceDetails />} />
              <Route path="/customer/dashboard" element={<Dashboard />} />
              <Route path="/provider/dashboard" element={<Dashboard />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
            </Routes>
          </div>
          <Footer />
          <ToastContainer position="top-right" />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
