// Run with `npm run migrate`. Safe to run more than once: every step checks
// the live schema first, so it only adds what is missing.
const pool = require('./index');

async function columnExists(table, column) {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    return rows.length > 0;
}

async function addColumn(table, column, definition) {
    if (await columnExists(table, column)) return;
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`  + ${table}.${column}`);
}

async function migrate() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS coupons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
            discount_value DECIMAL(10, 2) NOT NULL,
            min_order_amount DECIMAL(10, 2) NULL,
            max_discount_amount DECIMAL(10, 2) NULL,
            usage_limit INT NULL,
            used_count INT NOT NULL DEFAULT 0,
            expires_at DATETIME NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✓ coupons table');

    // What the customer actually saved, frozen on the order so later edits to
    // the coupon never rewrite an old order's total.
    await addColumn('orders', 'coupon_code', 'VARCHAR(50) NULL');
    await addColumn('orders', 'discount_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0');
}

migrate()
    .then(() => {
        console.log('✅ Migration complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    });
