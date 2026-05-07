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
      title: 'PokeAPI Astrid', 
      version: '1.0.0' 
    },
    servers: [{ url: 'https://pokeapi-backend-production-a5ec.up.railway.app' }],
  },
  apis: ['./index.js'],
};

// Generar la documentación
const swaggerDocs = swaggerJsdoc(swaggerOptions);

// RUTA DE LA DOCUMENTACIÓN
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- CONEXIONES ---
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Mongo OK'))
  .catch(err => console.error('❌ Error Mongo:', err.message));

const PokemonMongo = mongoose.model('Pokemon', new mongoose.Schema({
  id: Number, nombre: String, peso: String, altura: String,
  imagenFrontal: String, imagenPosterior: String, poderes: String
}), 'pokemon');

// --- RUTAS ---

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
    const { nombre } = req.params;
    const result = await pool.query('SELECT * FROM pokemon WHERE LOWER(nombre) = $1', [nombre.toLowerCase()]);
    if (result.rows.length > 0) return res.json(result.rows[0]);
    res.status(404).json({ message: "No encontrado en SQL" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
    p ? res.json(p) : res.status(404).json({ message: "No encontrado en NoSQL" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => res.send('API de Astrid Funcionando 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto ${PORT}`));
