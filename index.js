const express = require('express');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. SWAGGER (ESTO DEBE IR PRIMERO PARA QUE NO SE CAIGA) ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'PokeAPI Astrid', version: '1.0.0' },
    servers: [{ url: 'https://pokeapi-backend-production-a5ec.up.railway.app' }],
  },
  apis: ['./index.js'],
};

try {
  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
  console.log("✅ Swagger cargado");
} catch (e) {
  console.log("❌ Error en Swagger, pero el server sigue vivo");
}

// --- 2. CONEXIONES PROTEGIDAS ---
// Supabase
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000 // Si no conecta en 5 seg, no detiene el server
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Mongo OK'))
  .catch(err => console.log('⚠️ Mongo falló, pero el server sigue'));

// --- 3. RUTAS (Para que Swagger las lea) ---

/**
 * @swagger
 * /pokemon/sql/{nombre}:
 * get:
 * summary: Consulta SQL
 * parameters:
 * - in: path
 * name: nombre
 * required: true
 * schema:
 * type: string
 */
app.get('/pokemon/sql/:nombre', async (req, res) => {
  try {
    const { nombre } = req.params;
    const result = await pool.query('SELECT * FROM pokemon WHERE LOWER(nombre) = $1', [nombre.toLowerCase()]);
    if (result.rows.length > 0) return res.json(result.rows[0]);
    res.status(404).json({ message: "No encontrado en SQL" });
  } catch (e) {
    res.status(500).json({ error: "Error en base de datos", detalle: e.message });
  }
});

app.get('/', (req, res) => res.send('Servidor Online 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto ${PORT}`));
