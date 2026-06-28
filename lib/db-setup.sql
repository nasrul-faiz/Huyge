-- Machines table
CREATE TABLE IF NOT EXISTS machines (
  id SERIAL PRIMARY KEY,
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Product master table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_code VARCHAR(100) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Refill data table (stores inventory per machine)
CREATE TABLE IF NOT EXISTS refill_items (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(50) NOT NULL,
  slot VARCHAR(50) NOT NULL,
  product_code VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  image VARCHAR(500),
  rte_batches JSONB DEFAULT '[]'::jsonb,
  stock_in INTEGER DEFAULT 0,
  overflow INTEGER DEFAULT 0,
  stock_out INTEGER DEFAULT 0,
  current_inventory INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(machine_id, slot)
);

-- Delivery Orders table
CREATE TABLE IF NOT EXISTS delivery_orders (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  machine_id VARCHAR(50) NOT NULL,
  machine_label VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery Order Items table
CREATE TABLE IF NOT EXISTS delivery_order_items (
  id SERIAL PRIMARY KEY,
  delivery_order_id INTEGER NOT NULL,
  slot VARCHAR(50) NOT NULL,
  product_code VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE
);

-- Refill history table
CREATE TABLE IF NOT EXISTS refill_history (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(50) NOT NULL,
  machine_label VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  do_code VARCHAR(50),
  items JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_refill_items_machine_id ON refill_items(machine_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_code ON delivery_orders(code);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_machine_id ON delivery_orders(machine_id);
CREATE INDEX IF NOT EXISTS idx_delivery_order_items_delivery_order_id ON delivery_order_items(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_refill_history_machine_date ON refill_history(machine_id, date DESC);
