require('dotenv').config();
const { Pool } = require('pg');

const config = process.env.DATABASE_URL
	? {
			connectionString: process.env.DATABASE_URL,
			ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
	  }
	: {
			user: process.env.DB_USER,
			host: process.env.DB_HOST,
			database: process.env.DB_NAME,
			password: process.env.DB_PASS,
			port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
			ssl:
				process.env.DB_SSL === 'true' ||
				(process.env.DB_HOST && process.env.DB_HOST.includes('supabase'))
					? { rejectUnauthorized: false }
					: false,
	  };

const pool = new Pool(config);

module.exports = pool;