$env:PGPASSWORD = '0'
$query = @"
-- Users table
CREATE TABLE IF NOT EXISTS users (
    login VARCHAR(100) PRIMARY KEY,
    pass VARCHAR(255),
    telegram_id VARCHAR(50),
    block VARCHAR(1) DEFAULT 'E',
    active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'free',
    obyekt VARCHAR(100) DEFAULT 'Barchasi',
    ombor VARCHAR(100) DEFAULT 'Barchasi',
    can_edit_jurnal BOOLEAN DEFAULT true,
    can_delete_jurnal BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Jurnal table
CREATE TABLE IF NOT EXISTS jurnal (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    tur VARCHAR(10),
    mahsulot VARCHAR(255),
    miqdor DECIMAL(15,2),
    narx DECIMAL(15,2),
    summa DECIMAL(15,2),
    tomon VARCHAR(255),
    obyekt VARCHAR(100),
    izoh TEXT,
    operator VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- History table
CREATE TABLE IF NOT EXISTS history (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    tur VARCHAR(10),
    mahsulot VARCHAR(255),
    miqdor DECIMAL(15,2),
    narx DECIMAL(15,2),
    summa DECIMAL(15,2),
    tomon VARCHAR(255),
    obyekt VARCHAR(100),
    izoh TEXT,
    operator VARCHAR(100),
    action VARCHAR(20),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Katalog (products) table
CREATE TABLE IF NOT EXISTS katalog (
    id VARCHAR(50) PRIMARY KEY,
    nom VARCHAR(255) UNIQUE,
    olv VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Obyektlar table
CREATE TABLE IF NOT EXISTS obyektlar (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE
);

-- Omborlar table
CREATE TABLE IF NOT EXISTS omborlar (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE
);

-- Firms table
CREATE TABLE IF NOT EXISTS firms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    inn VARCHAR(50),
    note TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    kimdan VARCHAR(100),
    kimga VARCHAR(100),
    mahsulot VARCHAR(255),
    miqdor DECIMAL(15,2),
    operator VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inventarizatsiya table
CREATE TABLE IF NOT EXISTS inventarizatsiya (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    obyekt VARCHAR(100),
    operator VARCHAR(100),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MinStock table
CREATE TABLE IF NOT EXISTS min_stock (
    product_name VARCHAR(255) PRIMARY KEY,
    min_qty DECIMAL(15,2),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Debtors table
CREATE TABLE IF NOT EXISTS debtors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    summa DECIMAL(15,2),
    izoh TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Creditors table
CREATE TABLE IF NOT EXISTS creditors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    summa DECIMAL(15,2),
    izoh TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    tur VARCHAR(20),
    name VARCHAR(255),
    summa DECIMAL(15,2),
    izoh TEXT,
    operator VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- InvLinks table
CREATE TABLE IF NOT EXISTS inv_links (
    id VARCHAR(50) PRIMARY KEY,
    token VARCHAR(100) UNIQUE,
    obyekt VARCHAR(100),
    operator VARCHAR(100),
    status VARCHAR(20) DEFAULT 'jarayonda',
    sana VARCHAR(20),
    vaqt VARCHAR(20),
    diffs JSONB,
    yakunlangan_vaqt VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default user if not exists
INSERT INTO users (login, pass, telegram_id, block, active, role, obyekt, ombor, can_edit_jurnal, can_delete_jurnal)
VALUES ('jamoliddin', '122', '', 'E', true, 'admin', 'Barchasi', 'Barchasi', true, true)
ON CONFLICT (login) DO NOTHING;

-- Insert default obyekt
INSERT INTO obyektlar (name) VALUES ('Barchasi') ON CONFLICT (name) DO NOTHING;

-- Insert default ombor
INSERT INTO omborlar (name) VALUES ('Barchasi') ON CONFLICT (name) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) VALUES ('lang', 'uz'), ('theme', 'dark')
ON CONFLICT (key) DO NOTHING;
"@

& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -h localhost -d omborpro -c $query