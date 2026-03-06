import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

const AnalyticsCharts = ({ bookings, role, token }) => {
    const [adminRevenueData, setAdminRevenueData] = useState(null);

    useEffect(() => {
        if (role === 'admin' && token) {
            const fetchAdminRevenue = async () => {
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/revenue`, config);
                    setAdminRevenueData(res.data);
                } catch (error) {
                    console.error('Failed to fetch admin revenue', error);
                }
            };
            fetchAdminRevenue();
        }
    }, [role, token]);

    const { revenueByStatus, categoryCounts, totalRevenue, lineChartData } = useMemo(() => {
        let revByStatus = { Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
        let catCounts = {};
        let totalRev = 0;

        // For Line Chart: Group completed bookings by Date
        let bookingsByDate = {};

        bookings.forEach(booking => {
            const price = booking.serviceId?.price || 0;
            const status = booking.status;
            const category = booking.serviceId?.category || 'Unknown';

            let chartStatus = 'Pending';
            if (['Completed', 'Paid'].includes(status)) chartStatus = 'Completed';
            else if (['Accepted', 'OnTheWay', 'In Progress'].includes(status)) chartStatus = 'In Progress';
            else if (status === 'Cancelled') chartStatus = 'Cancelled';

            revByStatus[chartStatus] += price;

            if (chartStatus === 'Completed') {
                totalRev += price;

                // Track dates for line chart
                const dateKey = new Date(booking.date).toLocaleDateString();
                bookingsByDate[dateKey] = (bookingsByDate[dateKey] || 0) + price;
            }

            catCounts[category] = (catCounts[category] || 0) + 1;
        });

        // Sort dates correctly
        const sortedDates = Object.keys(bookingsByDate).sort((a, b) => new Date(a) - new Date(b));
        const lineData = sortedDates.map(date => bookingsByDate[date]);

        return {
            revenueByStatus: revByStatus,
            categoryCounts: catCounts,
            totalRevenue: totalRev,
            lineChartData: { labels: sortedDates, data: lineData }
        };
    }, [bookings]);

    const barData = {
        labels: Object.keys(revenueByStatus),
        datasets: [{
            label: 'Potential Revenue Pipeline (₹)',
            data: Object.values(revenueByStatus),
            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
            borderRadius: 6
        }]
    };

    const doughnutData = {
        labels: Object.keys(categoryCounts),
        datasets: [{
            data: Object.values(categoryCounts),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
            borderWidth: 1,
        }]
    };

    const lineDataConfig = {
        labels: lineChartData.labels.length > 0 ? lineChartData.labels : ['No Data'],
        datasets: [{
            label: 'Gross Platform Booking Volume (₹)',
            data: lineChartData.data.length > 0 ? lineChartData.data : [0],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            fill: true,
            tension: 0.4
        }]
    };

    return (
        <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Analytics & Financials</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

                {/* Provider Earned / General Total Revenue */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl shadow-lg p-6 flex flex-col justify-center items-center"
                >
                    <p className="text-blue-100 font-medium tracking-wide">{role === 'admin' ? 'Total Gross Volume' : 'Total Earned Revenue'}</p>
                    <h3 className="text-4xl font-extrabold mt-2">₹{totalRevenue.toLocaleString()}</h3>
                    <p className="text-sm text-blue-200 mt-4">Calculated from Completed Bookings</p>
                </motion.div>

                {/* Exclusive Admin Platform Commission Card */}
                {role === 'admin' && (
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl shadow-lg p-6 flex flex-col justify-center items-center relative overflow-hidden"
                    >
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                        <p className="text-emerald-100 font-medium tracking-wide uppercase text-sm">Platform Commission (10%)</p>
                        <h3 className="text-5xl font-black mt-2 drop-shadow-md">
                            ₹{adminRevenueData ? adminRevenueData.platformCommission.toLocaleString() : '...'}
                        </h3>
                        <p className="text-xs text-emerald-200 mt-4 font-semibold uppercase tracking-widest">Net Revenue</p>
                    </motion.div>
                )}

                {/* Doughnut Chart */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-md p-4 flex justify-center items-center border border-gray-100"
                >
                    <div className="w-[70%]">
                        <Doughnut options={{ responsive: true, plugins: { legend: { position: 'right' } } }} data={doughnutData} />
                    </div>
                </motion.div>

            </div>

            {/* Split layout for Bar and Line charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
                >
                    <Bar options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Revenue by Booking Stage' } } }} data={barData} />
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
                >
                    <Line options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Gross Volume Growth Over Time' } } }} data={lineDataConfig} />
                </motion.div>
            </div>
        </div>
    );
};

export default AnalyticsCharts;
