const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Service = require('./models/Service');
const Booking = require('./models/Booking');
const Message = require('./models/Message');
const Complaint = require('./models/Complaint');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Service.deleteMany({});
        await Booking.deleteMany({});
        await Message.deleteMany({});
        await Complaint.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const adminPass = await bcrypt.hash('admin123', salt);
        const providerPass = await bcrypt.hash('provider123', salt);
        const customerPass = await bcrypt.hash('customer123', salt);

        // 1. Create Users
        console.log('Seeding Users...');
        const admin = await User.create({
            name: 'System Admin', email: 'admin@test.com', password: adminPass, role: 'admin', isVerified: true, address: 'HQ'
        });

        const provider1 = await User.create({
            name: 'Elite Plumbers', email: 'plumber@test.com', password: providerPass, role: 'provider', isVerified: true, isProviderApproved: true, address: '123 Pipe St'
        });

        const provider2 = await User.create({
            name: 'Sparky Electricals', email: 'electrician@test.com', password: providerPass, role: 'provider', isVerified: true, isProviderApproved: true, address: '456 Volt Ave'
        });

        const provider3 = await User.create({
            name: 'Crystal Cleaners', email: 'cleaner@test.com', password: providerPass, role: 'provider', isVerified: true, isProviderApproved: false, address: '789 Sparkle Dr'
        });

        const customer1 = await User.create({
            name: 'Alice Smith', email: 'alice@test.com', password: customerPass, role: 'customer', isVerified: true, address: '101 Maple St'
        });

        const customer2 = await User.create({
            name: 'Bob Johnson', email: 'bob@test.com', password: customerPass, role: 'customer', isVerified: true, address: '202 Oak St'
        });

        // 2. Create Services
        console.log('Seeding Services...');
        const s1 = await Service.create({ providerId: provider1._id, category: 'Plumbing', serviceName: 'Emergency Leak Fix', description: '24/7 emergency pipe repair.', price: 1500, location: 'Citywide', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' });
        const s2 = await Service.create({ providerId: provider1._id, category: 'Plumbing', serviceName: 'Water Heater Installation', description: 'Install or replace water heaters.', price: 4000, location: 'Downtown', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' });

        const s3 = await Service.create({ providerId: provider2._id, category: 'Electrical', serviceName: 'Full House Rewiring', description: 'Complete electrical system overhaul.', price: 12000, location: 'Suburbs', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' });
        const s4 = await Service.create({ providerId: provider2._id, category: 'Electrical', serviceName: 'Ceiling Fan Setup', description: 'Quick and safe fan installation.', price: 800, location: 'Citywide', image: 'https://images.unsplash.com/photo-1544820886-f1cda0bb1771?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' });

        const s5 = await Service.create({ providerId: provider3._id, category: 'Cleaning', serviceName: 'Deep Scrub Cleanup', description: 'Post-construction or move-in deep cleaning.', price: 3500, location: 'Uptown', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' });
        const s6 = await Service.create({ providerId: provider3._id, category: 'Cleaning', serviceName: 'Standard Maid Service', description: 'Weekly sweep, mop, and dust.', price: 1200, location: 'Downtown', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' });

        // 3. Create Bookings (To populate Analytics Dashboard)
        console.log('Seeding Bookings & Analytics Data...');
        const b1 = await Booking.create({ customerId: customer1._id, providerId: provider1._id, serviceId: s1._id, date: new Date(), time: '10:00 AM', status: 'Completed', paymentStatus: 'Completed' });
        const b2 = await Booking.create({ customerId: customer2._id, providerId: provider1._id, serviceId: s2._id, date: new Date(), time: '02:00 PM', status: 'Completed', paymentStatus: 'Completed' });
        const b3 = await Booking.create({ customerId: customer1._id, providerId: provider2._id, serviceId: s3._id, date: new Date(), time: '09:00 AM', status: 'In Progress', paymentStatus: 'Pending' });
        const b4 = await Booking.create({ customerId: customer2._id, providerId: provider2._id, serviceId: s4._id, date: new Date(), time: '11:00 AM', status: 'Paid', paymentStatus: 'Completed' });
        const b5 = await Booking.create({ customerId: customer1._id, providerId: provider3._id, serviceId: s5._id, date: new Date(), time: '04:00 PM', status: 'Cancelled', paymentStatus: 'Failed' });

        // 4. Create Messages (Chat Logs)
        console.log('Seeding Chat Logs...');
        await Message.create({ bookingId: b3._id, sender: customer1._id, text: "Hi, what time will you arrive tomorrow?" });
        await Message.create({ bookingId: b3._id, sender: provider2._id, text: "I should be there right at 9:00 AM sharp!" });
        await Message.create({ bookingId: b3._id, sender: customer1._id, text: "Perfect, see you then." });

        await Message.create({ bookingId: b5._id, sender: customer1._id, text: "I need to cancel this cleaning, sorry." });
        await Message.create({ bookingId: b5._id, sender: provider3._id, text: "No problem, I have updated the status." });

        // 5. Create Complaints
        console.log('Seeding Complaints...');
        await Complaint.create({ customerId: customer1._id, providerId: provider2._id, bookingId: b3._id, description: "The electrician arrived late and left a mess.", status: 'Open' });
        await Complaint.create({ customerId: customer2._id, providerId: provider1._id, bookingId: b2._id, description: "The heater water is still lukewarm.", status: 'Resolved' });

        console.log('✅ Huge Seed injected successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
