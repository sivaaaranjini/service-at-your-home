import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const generateInvoice = (booking) => {
    console.log('[DEBUG] Generating Invoice using autoTable function...');
    const doc = new jsPDF();

    // Add Company Logo Text / Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text('Service At Your Home', 14, 22);

    // Invoice Title
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text('PAYMENT INVOICE', 14, 34);

    // Meta Details
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`Invoice ID: #INV-${booking._id.substring(0, 8).toUpperCase()}`, 14, 44);
    doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`, 14, 50);

    // Customer / Provider details
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Billed To:', 14, 62);
    doc.setFont(undefined, 'normal');

    const customerName = booking.customerId?.name || 'Valued Customer';
    const providerName = booking.providerId?.name || 'Professional Service Provider';

    doc.text(customerName, 14, 68);

    doc.setFont(undefined, 'bold');
    doc.text('Service Provider:', 120, 62);
    doc.setFont(undefined, 'normal');
    doc.text(providerName, 120, 68);

    // Main Table - Using standalone function for ESM compatibility
    autoTable(doc, {
        startY: 80,
        headStyles: { fillColor: [37, 99, 235] },
        head: [['Description', 'Date Scheduled', 'Amount']],
        body: [
            [
                booking.serviceId?.serviceName || 'Home Service',
                `${new Date(booking.date).toLocaleDateString()} at ${booking.time}`,
                `Rs. ${(booking.serviceId?.price || 0).toLocaleString()}`
            ],
            ['Platform Safety & Convenience Fee', '-', 'Rs. 49'],
        ],
        foot: [['', 'Total Amount:', `Rs. ${((booking.serviceId?.price || 0) + 49).toLocaleString()}`]],
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Handle lastAutoTable safely (depends on plugin state)
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 120;

    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text('Thank you for choosing Service At Your Home!', 14, finalY + 20);
    doc.text('This is a computer-generated invoice and requires no physical signature.', 14, finalY + 26);

    // Trigger Browser Download
    doc.save(`Invoice_Sivaa_${booking._id.substring(0, 8)}.pdf`);
};

export default generateInvoice;
