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
    CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      telefone VARCHAR(50),
      tipo_servico VARCHAR(50),
      origem VARCHAR(255),
      destino VARCHAR(255),
      data_hora TIMESTAMP,
      passageiros INTEGER DEFAULT 1,
      notas TEXT,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Base de dados pronta.');
}

module.exports = { pool, initDb };
