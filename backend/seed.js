const crypto = require('crypto');
const format = require('pg-format');
const { pool } = require('./db');
require('dotenv').config();

const adjectives = [
  'Sleek', 'Rustic', 'Modern', 'Vintage', 'Premium', 'Ergonomic', 'Minimalist', 'Deluxe', 'Eco', 'Classic',
  'Ultimate', 'Smart', 'Elite', 'Pro', 'Ultra', 'Nordic', 'Industrial', 'Compact', 'Luxury', 'Advanced',
  'Crafted', 'Artisanal', 'Tactile', 'Organic', 'Hybrid', 'Modular', 'Dynamic', 'Vibrant', 'Serene', 'Bold',
  'Radiant', 'Stellar', 'Prismatic', 'Nomad', 'Apex', 'Zenith', 'Summit', 'Primal', 'Infinity', 'Matrix',
  'Nexus', 'Vector', 'Quantum', 'Optima', 'Cosmic', 'Solar', 'Lunar', 'Aura', 'Element', 'Gravity',
  'Nova', 'Flux', 'Helix', 'Pulse', 'Catalyst', 'Fusion', 'Echo', 'Phantom', 'Ghost', 'Specter'
];

const materials = [
  'Wooden', 'Leather', 'Metal', 'Glass', 'Carbon Fiber', 'Bamboo', 'Steel', 'Aluminum', 'Ceramic', 'Marble',
  'Copper', 'Titanium', 'Bronze', 'Acrylic', 'Silicone', 'Wool', 'Cotton', 'Polymer', 'Brass', 'Concrete',
  'Stone', 'Slate', 'Porcelain', 'Cork', 'Granite', 'Pewter', 'Oak', 'Walnut', 'Teak', 'Flannel',
  'Pine', 'Maple', 'Cherry', 'Mahogany', 'Ash', 'Birch', 'Cedar', 'Redwood', 'Hickory', 'Elm',
  'Satin', 'Silk', 'Canvas', 'Denim', 'Linen', 'Tweed', 'Velvet', 'Felt', 'Nylon', 'Polyester',
  'Rubber', 'Clay', 'Quartz', 'Basalt', 'Obsidian', 'Amber', 'Jade', 'Onyx', 'Resin', 'Terracotta'
];

const nouns = [
  'Chair', 'Desk', 'Lamp', 'Keyboard', 'Monitor', 'Headphones', 'Speaker', 'Mouse', 'Stand', 'Shelf',
  'Cabinet', 'Organizer', 'Clock', 'Planter', 'Coaster', 'Charger', 'Adapter', 'Cable', 'Pen', 'Notebook',
  'Desk Pad', 'Lamp Shade', 'Bookend', 'Tray', 'Bowl', 'Pitcher', 'Carafe', 'Tumbler', 'Mug', 'Coaster Set',
  'Clock Face', 'Calendar', 'Paperweight', 'Letter Opener', 'Desk Lamp', 'Monitor Stand', 'Headphone Stand', 'Mouse Pad', 'Keyboard Tray', 'Footrest',
  'Stool', 'Table', 'Bench', 'Cart', 'Rack', 'Hook', 'Hanger', 'Mirror', 'Frame', 'Clockwork',
  'Projector', 'Router', 'Switch', 'Hub', 'Dock', 'Mic', 'Camera', 'Light', 'Panel', 'Screen'
];

function getCategory(noun) {
  if (['Chair', 'Desk', 'Stool', 'Table', 'Bench', 'Cabinet', 'Shelf', 'Organizer', 'Bookend', 'Tray', 'Rack', 'Hook', 'Hanger', 'Mirror', 'Frame'].includes(noun)) {
    return 'Furniture & Decor';
  }
  if (['Keyboard', 'Monitor', 'Headphones', 'Speaker', 'Mouse', 'Charger', 'Adapter', 'Cable', 'Projector', 'Router', 'Switch', 'Hub', 'Dock', 'Mic', 'Camera', 'Screen'].includes(noun)) {
    return 'Electronics & Office Tech';
  }
  if (['Lamp', 'Light', 'Panel', 'Lamp Shade', 'Desk Lamp', 'Monitor Stand', 'Headphone Stand', 'Mouse Pad', 'Keyboard Tray', 'Footrest', 'Clockwork'].includes(noun)) {
    return 'Desk Accessories';
  }
  if (['Pen', 'Notebook', 'Calendar', 'Paperweight', 'Letter Opener', 'Desk Pad'].includes(noun)) {
    return 'Stationery';
  }
  return 'Kitchenware'; // Bowl, Pitcher, Carafe, Tumbler, Mug, Coaster Set, Coaster
}

async function seed() {
  const TOTAL_PRODUCTS = 200000;
  const BATCH_SIZE = 10000;
  
  console.log(`Generating ${TOTAL_PRODUCTS} unique product names, UUIDs, and categories...`);
  const values = [];
  
  // Spread timestamps over the last 30 days
  const baseTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const intervalMs = (30 * 24 * 60 * 60 * 1000) / TOTAL_PRODUCTS;

  for (let i = 0; i < TOTAL_PRODUCTS; i++) {
    // Generate unique index combinations (60 * 60 * 60 = 216,000 combinations)
    const adj = adjectives[i % 60];
    const mat = materials[Math.floor(i / 60) % 60];
    const noun = nouns[Math.floor(i / 3600) % 60];
    
    const id = crypto.randomUUID();
    const name = `${adj} ${mat} ${noun}`;
    const category = getCategory(noun);
    const price = parseFloat((Math.random() * 950 + 50).toFixed(2));
    const createdAt = new Date(baseTime + i * intervalMs);
    const updatedAt = createdAt;
    
    values.push([id, name, category, price, createdAt, updatedAt]);
  }
  
  console.log('Connecting to database...');
  const client = await pool.connect();
  
  try {
    const startTime = Date.now();
    
    console.log('Truncating existing products table...');
    await client.query('TRUNCATE TABLE products CASCADE;');
    
    console.log('Seeding data in batches...');
    await client.query('BEGIN');
    
    for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
      const batch = values.slice(i, i + BATCH_SIZE);
      const query = format(
        'INSERT INTO products (id, name, category, price, created_at, updated_at) VALUES %L',
        batch
      );
      await client.query(query);
      console.log(`Inserted ${i + batch.length} / ${TOTAL_PRODUCTS} products...`);
    }
    
    await client.query('COMMIT');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Seeding completed successfully in ${duration} seconds!`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
