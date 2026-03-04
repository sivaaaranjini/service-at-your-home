-- Additional table for OTP verification
-- Run this in the Supabase SQL editor to create the otps table
CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expiry TIMESTAMPTZ NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
