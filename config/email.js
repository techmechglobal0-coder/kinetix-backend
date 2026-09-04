const nodemailer = require('nodemailer');

// Create transporter – use environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // fallback to your domain
    port: parseInt(process.env.SMTP_PORT),      // 465 (SSL) or 587 (TLS)
    secure: process.env.SMTP_SECURE === 'true',          // true for 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
     tls: {
        rejectUnauthorized: false,
    },
    // Force Node.js to use IPv4 (prevents ENETUNREACH on IPv6)
    family: 4,
    connectionTimeout: 10000,
});

// Function to send order confirmation email
const sendOrderConfirmation = async (order, items) => {
    const { email, name, address, city, postal_code, phone } = order;

    // Build HTML table for items
    let itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rs ${Number(item.unit_price).toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rs ${(item.quantity * item.unit_price).toFixed(2)}</td>
        </tr>
    `).join('');

    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    // Delivery is set per product in the dashboard and stored on the order, so
    // report the figure the customer agreed to instead of recomputing one.
    const shipping = Number(order.shipping_amount) || 0;
    const total = subtotal + shipping;
    const advancePayment = total * 0.5;
    const remaining = total - advancePayment;

    const htmlContent = `
        <h2>Thank you for your order, ${name}!</h2>
        <p>Your order has been received and is <strong>Pending</strong> – we will notify you once it is confirmed by our admin.</p>
        <h3>Order Summary</h3>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <h4>Shipping Address</h4>
        <p>
            ${address}<br>
            ${city}, ${postal_code || ''}<br>
            Phone: ${phone}<br>
            Email: ${email}
        </p>
        <h4>Order Items</h4>
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 8px; text-align: left;">Product</th>
                    <th style="padding: 8px; text-align: center;">Qty</th>
                    <th style="padding: 8px; text-align: right;">Unit Price</th>
                    <th style="padding: 8px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Subtotal</td>
                    <td style="padding: 8px; text-align: right;">Rs ${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Shipping</td>
                    <td style="padding: 8px; text-align: right;">${shipping === 0 ? 'Free' : `Rs ${shipping.toFixed(2)}`}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Total</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold;">Rs ${total.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Advance Payment (50%)</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold;">Rs ${advancePayment.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Remaining upon Dispatch</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold;">Rs ${remaining.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
        <p style="margin-top: 20px; font-size: 0.9rem; color: #666;">
            If you have any questions, please contact us at <a href="mailto:contact@kinetixpk.com">contact@kinetixpk.com</a> or call +92 332-4825054.
        </p>
    `;

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Kinetix" <contact@kinetixpk.com>`,
        to: email,
        subject: `Order #${order.id} Confirmation – Pending`,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Order confirmation email sent to ${email}`);
    } catch (err) {
        console.error('❌ Email sending failed:', err.message);
        // Do not throw – we don't want to break the order flow
    }
};

// ✅ Test function to verify SMTP connection
const testEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ SMTP connection successful');
        return true;
    } catch (err) {
        console.error('❌ SMTP connection failed:', err.message);
        return false;
    }
};

module.exports = { sendOrderConfirmation, testEmailConnection };