-- OmborPro Database Setup SQL
-- Buni pgAdmin yoki psql orqali ishga tushiring.

-- Users jadvali
CREATE TABLE IF NOT EXISTS users (
    login VARCHAR(50) PRIMARY KEY,
    pass TEXT NOT NULL,
    telegram_id VARCHAR(50),
    block CHAR(1) DEFAULT 'E',
    active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'free',
    obyekt JSONB DEFAULT '["Barchasi"]'::jsonb,
    ombor VARCHAR(100) DEFAULT 'Barchasi',
    can_edit_jurnal BOOLEAN DEFAULT TRUE,
    can_delete_jurnal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Jurnal jadvali (Kirim/Chiqim)
CREATE TABLE IF NOT EXISTS jurnal (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    tur VARCHAR(10),
    mahsulot VARCHAR(255),
    miqdor NUMERIC(15, 4),
    narx NUMERIC(15, 2),
    summa NUMERIC(15, 2),
    tomon VARCHAR(255),
    obyekt VARCHAR(100),
    izoh TEXT,
    operator VARCHAR(50),
    editedby VARCHAR(50),
    editedat TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- History jadvali
CREATE TABLE IF NOT EXISTS history (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    tur VARCHAR(10),
    mahsulot VARCHAR(255),
    miqdor NUMERIC(15, 4),
    narx NUMERIC(15, 2),
    summa NUMERIC(15, 2),
    tomon VARCHAR(255),
    obyekt VARCHAR(100),
    izoh TEXT,
    operator VARCHAR(50),
    action VARCHAR(20),
    editedby VARCHAR(50),
    deletedby VARCHAR(50),
    newvalues JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Katalog
CREATE TABLE IF NOT EXISTS katalog (
    id VARCHAR(50) PRIMARY KEY,
    nom VARCHAR(255) UNIQUE,
    olv VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Obyektlar
CREATE TABLE IF NOT EXISTS obyektlar (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE
);

-- Omborlar
CREATE TABLE IF NOT EXISTS omborlar (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE
);

-- Firmalar
CREATE TABLE IF NOT EXISTS firms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    inn VARCHAR(50),
    telegram VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    note TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT
);

-- Transfers
CREATE TABLE IF NOT EXISTS transfers (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    kimdan VARCHAR(100),
    kimga VARCHAR(100),
    mahsulot VARCHAR(255),
    miqdor NUMERIC(15, 4),
    operator VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inventarizatsiya
CREATE TABLE IF NOT EXISTS inventarizatsiya (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    obyekt VARCHAR(100),
    operator VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Min Stock Limits
CREATE TABLE IF NOT EXISTS min_stock (
    product_name VARCHAR(255) PRIMARY KEY,
    min_qty NUMERIC(15, 4),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Debtors
CREATE TABLE IF NOT EXISTS debtors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    summa NUMERIC(15, 2),
    izoh TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Creditors
CREATE TABLE IF NOT EXISTS creditors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    summa NUMERIC(15, 2),
    izoh TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    sana VARCHAR(20),
    tur VARCHAR(50),
    name VARCHAR(255),
    summa NUMERIC(15, 2),
    izoh TEXT,
    operator VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inventar Links
CREATE TABLE IF NOT EXISTS inv_links (
    id VARCHAR(50) PRIMARY KEY,
    token VARCHAR(100) UNIQUE,
    obyekt VARCHAR(100),
    operator VARCHAR(50),
    status VARCHAR(20),
    sana VARCHAR(20),
    vaqt VARCHAR(20),
    diffs JSONB,
    yakunlangan_vaqt VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexlar
CREATE INDEX IF NOT EXISTS idx_jurnal_mahsulot ON jurnal(mahsulot);
CREATE INDEX IF NOT EXISTS idx_jurnal_obyekt ON jurnal(obyekt);
CREATE INDEX IF NOT EXISTS idx_katalog_nom ON katalog(nom);
