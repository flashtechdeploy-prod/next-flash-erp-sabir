require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const regions = ['North Region', 'South Region', 'East Region', 'West Region', 'Central Region'];

    for (const region of regions) {
      const itemCode = 'FRI-REGION-' + Math.random().toString(36).substr(2, 6);
      
      await client.query(
        `INSERT INTO restricted_inventory_items 
         (item_code, name, category, weapon_region, unit_name, quantity_on_hand, status, is_serial_tracked) 
         VALUES ($1, $2, $3, $4, $5, 0, $6, true) 
         ON CONFLICT (item_code) DO NOTHING`,
        [itemCode, region, 'temp', region, 'unit', 'inactive']
      );
      
      console.log(`Added region: ${region}`);
    }

    const result = await client.query(
      'SELECT DISTINCT weapon_region FROM restricted_inventory_items WHERE weapon_region IS NOT NULL ORDER BY weapon_region'
    );
    
    console.log('\n✅ Available weapon regions:');
    result.rows.forEach(row => console.log(`  - ${row.weapon_region}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
})();
