const fs = require('fs');
const path = require('path');
const pool = require('../db');

const migrationFiles = [
	'schema.sql',
	'migration_refresh_tokens.sql',
	'migration_bids_enhancements.sql',
	'migration_worker_profiles_enhancements.sql',
];

async function runMigrations() {
	console.log('🚀 Starting Database Migrations...');

	const client = await pool.connect();

	try {
		for (const file of migrationFiles) {
			const filePath = path.join(__dirname, '..', 'database', file);
			console.log(`📄 Executing ${file}...`);
			const sql = fs.readFileSync(filePath, 'utf8');
			await client.query(sql);
			console.log(`✅ Successfully applied ${file}`);
		}

		console.log('🎉 All migrations executed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('❌ Migration failed:', error.message);
		console.error(error);
		process.exit(1);
	} finally {
		client.release();
	}
}

runMigrations();
