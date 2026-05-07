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

// --- CONFIGURACIÓN DE SWAGGER ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PokeAPI Cloud - Astrid Rondon',
      version: '1.0.0',
    },
    servers: [{ url: 'https://pokeapi-backend-production-4cc9.up.railway.app' }],
  },
  apis: ['./index.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- CONEXIONES ---
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ Mongo OK'));

const PokemonMongo = mongoose.model('Pokemon', new mongoose.Schema({
  id: Number, nombre: String, peso: String, altura: String,
  imagenFrontal: String, imagenPosterior: String, poderes: String
}), 'pokemon');

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTAS ---

/**
 * @swagger
 * /pokemon/nosql/{nombre}:
 * get:
 * summary: Consulta NoSQL
 * parameters:
 * - in: path
 * name: nombre
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: OK
 */
app.get('/pokemon/nosql/:nombre', async (req, res) => {
  try {
    const p = await PokemonMongo.findOne({ nombre: new RegExp(`^${req.params.nombre}$`, 'i') });
    p ? res.json(p) : res.status(404).json({ m: "No en Mongo" });
  } catch (e) { res.status(500).json({ e: e.message }); }
});

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
 * responses:
 * 200:
 * description: OK
 */
app.get('/pokemon/sql/:nombre', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM pokemon WHERE LOWER(nombre) = $1', [req.params.nombre.toLowerCase()]);
    r.rows.length > 0 ? res.json(r.rows[0]) : res.status(404).json({ m: "No en SQL" });
  } catch (e) { res.status(500).json({ e: e.message }); }
});

app.get('/', (req, res) => res.send('API Online 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Puerto ${PORT}`));
