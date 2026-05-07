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
      description: 'Documentación de microservicios para la Tarea 9 (SQL y NoSQL)',
    },
    servers: [
      {
        url: 'https://pokeapi-production-4527.up.railway.app',
        description: 'Servidor de Producción en Railway'
      },
    ],
  },
  // IMPORTANTE: Asegúrate de que el archivo se llame index.js
  apis: ['./index.js'], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- CONEXIÓN MONGODB (NoSQL) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error Mongo:', err));

const pokemonSchema = new mongoose.Schema({
  id: Number,
  nombre: String,
  peso: String,
  altura: String,
  imagenFrontal: String,
  imagenPosterior: String,
  poderes: String
});
const PokemonMongo = mongoose.model('Pokemon', pokemonSchema, 'pokemon');

// --- CONEXIÓN SUPABASE (SQL) ---
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTAS CON DOCUMENTACIÓN SWAGGER (Formato Estricto) ---

/**
 * @swagger
 * /pokemon/nosql/{nombre}:
 * get:
 * summary: Consulta en MongoDB (NoSQL)
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
    const nombreBusqueda = req.params.nombre.toLowerCase();
    const pokemon = await PokemonMongo.findOne({ 
      nombre: { $regex: new RegExp(`^${nombreBusqueda}$`, 'i') } 
    });
    if (pokemon) return res.json(pokemon);
    res.status(404).json({ message: "Pokémon no encontrado en MongoDB" });
  } catch (e) {
    res.status(500).json({ error: "Error en el servidor NoSQL", detalle: e.message });
  }
});

/**
 * @swagger
 * /pokemon/sql/{nombre}:
 * get:
 * summary: Consulta en Supabase (SQL)
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
    const nombreBusqueda = req.params.nombre.toLowerCase();
    const result = await pool.query('SELECT * FROM pokemon WHERE LOWER(nombre) = $1', [nombreBusqueda]);
    if (result.rows.length > 0) return res.json(result.rows[0]);
    res.status(404).json({ message: "Pokémon no encontrado en SQL" });
  } catch (e) {
    res.status(500).json({ error: "Error en el servidor SQL", detalle: e.message });
  }
});

// Ruta raíz para verificar que el server vive
app.get('/', (req, res) => {
  res.send('API de Pokémon en la Nube funcionando 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`📖 Swagger: https://pokeapi-production-4527.up.railway.app/api-docs`);
});