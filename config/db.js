const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do Postgres:', err);
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      nome VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      telefone VARCHAR(50),
      tipo_servico VARCHAR(50),
      origem VARCHAR(255),
      destino VARCHAR(255),
      data_hora TIMESTAMP,
      passageiros INTEGER DEFAULT 1,
      notas TEXT,
      estado VARCHAR(30) DEFAULT 'pendente',
      pagamento_estado VARCHAR(30) DEFAULT 'nao_aplicavel',
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await ensureDefaultAdmin();
  console.log('Base de dados pronta.');
}

async function ensureDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn('ADMIN_EMAIL/ADMIN_PASSWORD não definidos — admin default não foi criado.');
    return;
  }
  const bcrypt = require('bcrypt');
  const existing = await pool.query('SELECT id, is_admin FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      'INSERT INTO users (nome, email, password_hash, is_admin) VALUES ($1,$2,$3,true)',
      ['Admin', adminEmail, hash]
    );
    console.log(`Admin default criado: ${adminEmail}`);
  } else if (!existing.rows[0].is_admin) {
    await pool.query('UPDATE users SET is_admin = true WHERE email = $1', [adminEmail]);
    console.log(`Utilizador existente promovido a admin: ${adminEmail}`);
  }
}

module.exports = { pool, initDb };
