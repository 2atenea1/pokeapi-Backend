const express = require('express');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE CORS ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// --- CONFIGURACIÓN DE SWAGGER ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PokeAPI Cloud - Astrid Rondon',
      version: '1.0.0',
    },
    servers: [
      { 
        url: 'https://pokeapi-backend-production-a5ec.up.railway.app',
        description: 'Servidor Actualizado' 
      }
    ],
  },
  apis: ['./index.js'],
};

try {
    const swaggerDocs = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
} catch (e) {
    console.log("Error en Swagger:", e.message);
}

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
    p ? res.json(p) : res.status(404).json({ message: "No en Mongo" });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    r.rows.length > 0 ? res.json(r.rows[0]) : res.status(404).json({ message: "No en SQL" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/', (req, res) => res.send('API Online 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto ${PORT}`));
