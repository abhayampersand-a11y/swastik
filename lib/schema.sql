-- Swastik Mandap Service Management System
-- Run this SQL in pgAdmin against your Neon database

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES inventory_categories(id),
  name VARCHAR(200) NOT NULL,
  unit_type VARCHAR(50) DEFAULT 'Piece', -- Piece, Set, Meter, Kg
  total_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  damaged_quantity INTEGER DEFAULT 0,
  purchase_price NUMERIC(10,2) DEFAULT 0,
  rental_price NUMERIC(10,2) DEFAULT 0,
  description TEXT,
  features TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES inventory_items(id),
  transaction_type VARCHAR(50), -- purchase, reserve, return, damage, adjust
  quantity INTEGER NOT NULL,
  reference_id INTEGER, -- booking_id or other
  reference_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  alternate_mobile VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  notes TEXT,
  outstanding_balance NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  event_name VARCHAR(200),
  event_type VARCHAR(100),
  event_date DATE NOT NULL,
  setup_date DATE,
  return_date DATE,
  venue_address TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Inquiry', -- Inquiry, Estimated, Confirmed, Running, Completed, Closed, Cancelled
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  advance_paid NUMERIC(10,2) DEFAULT 0,
  remaining_balance NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL,
  rental_rate NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL,
  returned_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  booking_id INTEGER REFERENCES bookings(id),
  customer_id INTEGER REFERENCES customers(id),
  valid_until DATE,
  inventory_charges NUMERIC(10,2) DEFAULT 0,
  labor_charges NUMERIC(10,2) DEFAULT 0,
  transport_charges NUMERIC(10,2) DEFAULT 0,
  decoration_charges NUMERIC(10,2) DEFAULT 0,
  misc_charges NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  grand_total NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Draft', -- Draft, Sent, Accepted, Rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory_items(id),
  description VARCHAR(200),
  quantity INTEGER DEFAULT 1,
  rate NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  customer_id INTEGER REFERENCES customers(id),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50), -- Cash, UPI, Bank Transfer, Cheque
  amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  booking_id INTEGER REFERENCES bookings(id),
  customer_id INTEGER REFERENCES customers(id),
  invoice_date DATE NOT NULL,
  inventory_charges NUMERIC(10,2) DEFAULT 0,
  labor_charges NUMERIC(10,2) DEFAULT 0,
  transport_charges NUMERIC(10,2) DEFAULT 0,
  damage_charges NUMERIC(10,2) DEFAULT 0,
  additional_charges NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  advance_paid NUMERIC(10,2) DEFAULT 0,
  remaining_balance NUMERIC(10,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Partial, Paid
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory_items(id),
  description VARCHAR(200),
  quantity INTEGER DEFAULT 1,
  rate NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LABORERS
-- ============================================================
CREATE TABLE IF NOT EXISTS laborers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  mobile VARCHAR(20),
  address TEXT,
  joining_date DATE,
  salary_type VARCHAR(50) DEFAULT 'Monthly', -- Monthly, Daily
  basic_salary NUMERIC(10,2) DEFAULT 0,
  overtime_rate NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  laborer_id INTEGER REFERENCES laborers(id),
  attendance_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Present', -- Present, Absent, Half Day
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laborer_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS labor_advances (
  id SERIAL PRIMARY KEY,
  laborer_id INTEGER REFERENCES laborers(id),
  advance_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  notes TEXT,
  is_recovered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  laborer_id INTEGER REFERENCES laborers(id),
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  basic_salary NUMERIC(10,2) DEFAULT 0,
  overtime_amount NUMERIC(10,2) DEFAULT 0,
  advance_deduction NUMERIC(10,2) DEFAULT 0,
  other_deductions NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(10,2) DEFAULT 0,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  half_days INTEGER DEFAULT 0,
  overtime_hours NUMERIC(6,2) DEFAULT 0,
  payment_date DATE,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Pending', -- Pending, Paid
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laborer_id, month, year)
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  category VARCHAR(100), -- Diesel, Transport, Food, Maintenance, Decoration, Labor, Miscellaneous
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DAMAGE REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS damage_reports (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  item_id INTEGER REFERENCES inventory_items(id),
  report_date DATE NOT NULL,
  damage_type VARCHAR(50), -- Damaged, Lost
  quantity INTEGER NOT NULL,
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  charged_to_customer BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100), -- upcoming_event, pending_payment, low_stock, salary_due
  title VARCHAR(200),
  message TEXT,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100), -- booking_created, booking_updated, inventory_adjusted, payment_added, etc.
  description TEXT,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTE: Categories are managed from the app UI at /categories
-- ============================================================

-- Sequence for booking numbers
CREATE SEQUENCE IF NOT EXISTS booking_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 2001;
CREATE SEQUENCE IF NOT EXISTS quotation_seq START 3001;
