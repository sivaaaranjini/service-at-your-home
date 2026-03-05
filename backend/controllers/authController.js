const supabase = require('../config/supabaseClient');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    console.log('Registration Attempt:', { name, email, role });

    try {
        // 1. Check if user already exists
        const { data: userExists, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userExists) {
            console.log('Registration Blocked: User already exists');
            return res.status(400).json({ message: 'User already exists and is verified. Please Login.' });
        }

        if (userError && userError.code !== 'PGRST116') {
            console.error('Supabase Query Error:', userError);
            throw userError;
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        console.log(`Generated OTP for ${email}: ${otp}`);

        // 4. Store OTP temporarily
        console.log('Attempting Supabase Upsert...');
        const { error: otpError } = await supabase
            .from('otps')
            .upsert(
                { email, otp, expiry, password: hashedPassword, name, role, address: req.body.address },
                { onConflict: 'email' }
            );

        if (otpError) {
            console.error('OTP Storage Error:', JSON.stringify(otpError));
            return res.status(400).json({ message: otpError.message });
        }
        console.log('Supabase Upsert Successful');

        // 5. Send OTP Email
        const message = `Your verification code is ${otp}. Valid for 10 minutes.`;

        console.log('Attempting to send email via Brevo...');
        try {
            await sendEmail({
                email: email,
                subject: 'Account Verification OTP',
                message,
            });
            console.log('Email sent successfully');
        } catch (error) {
            console.error("Email Sending Error Trace:", error);
            return res.status(500).json({ message: 'User created but OTP email failed to send. Check your Brevo settings.' });
        }

        console.log('Registration flow complete for:', email);
        res.status(201).json({
            email: email,
            message: 'OTP sent to email. Please verify.',
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        // 1. Fetch the OTP record
        const { data: otpRecord, error: otpFetchError } = await supabase
            .from('otps')
            .select('*')
            .eq('email', email)
            .single();

        if (otpFetchError || !otpRecord) {
            return res.status(404).json({ message: 'Verification session not found or expired.' });
        }

        // 2. Validate OTP
        if (otpRecord.otp !== otp || new Date(otpRecord.expiry) < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // 3. Move User to main 'users' table
        const { data: newUser, error: createUserError } = await supabase
            .from('users')
            .insert([{
                name: otpRecord.name,
                email: otpRecord.email,
                password: otpRecord.password,
                role: otpRecord.role,
                phone: otpRecord.address // temporary mapping
            }])
            .select()
            .single();

        if (createUserError) {
            throw createUserError;
        }

        // 4. Delete the OTP record (Cleanup)
        await supabase.from('otps').delete().eq('email', email);

        // 5. Return success and JWT Token
        res.status(200).json({
            _id: newUser.id, // Keep _id mapping for frontend compatibility
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            isProviderApproved: newUser.is_provider_approved,
            token: generateToken(newUser.id),
            message: 'Account verified and created successfully',
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError || !user) {
            // Check if they are stuck in the OTP queue
            const { data: otpUser } = await supabase.from('otps').select('email').eq('email', email).single();
            if (otpUser) return res.status(401).json({ message: 'Account not verified. Please request a new OTP.' });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id, // Mapping Postgres UUID `id` to `_id` so frontend doesn't break
                name: user.name,
                email: user.email,
                role: user.role,
                isProviderApproved: user.is_provider_approved,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get top rated providers for home page
// @route   GET /api/auth/top-providers
// @access  Public
const getTopProviders = async (req, res) => {
    try {
        const { data: providers, error } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('role', 'provider')
            .eq('is_provider_approved', true)
            .limit(3);

        if (error) throw error;

        // Ensure frontend gets _id back
        const mappedProviders = providers.map(p => ({
            ...p,
            _id: p.id
        }));

        res.json(mappedProviders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch top providers' });
    }
};

module.exports = {
    registerUser,
    verifyOtp,
    loginUser,
    getTopProviders,
};
