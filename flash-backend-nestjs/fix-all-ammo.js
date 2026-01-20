const { Pool } = require('pg');

const pool = new Pool({
  host: '46.202.194.55',
  port: 5432,
  database: 'flash_nest_db',
  user: 'postgres',
  password: 'c7Od03Arvx4Aix3rl9sxPcFyrJWOZVYW6sakZ00zK54i32bT3eSEgcNPekjom1oe',
  ssl: { rejectUnauthorized: false },
});

async function fixAll() {
  try {
    // Fix all ammunition items
    const fixResult = await pool.query(
      `UPDATE restricted_inventory_items 
       SET is_serial_tracked = false 
       WHERE category = 'ammunition' AND is_serial_tracked = true
       RETURNING item_code, name, category, is_serial_tracked;`
    );
    
    console.log('✅ Fixed ammunition items:');
    if (fixResult.rows.length > 0) {
      fixResult.rows.forEach(row => {
        console.log(`   ${row.item_code} (${row.name}): is_serial_tracked = ${row.is_serial_tracked}`);
      });
    } else {
      console.log('   No items needed fixing');
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixAll();
