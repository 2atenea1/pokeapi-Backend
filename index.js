const express = require('express');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARES ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- 2. CONFIGURACIÓN DE SWAGGER (LA PARTE QUE BUSCABAS) ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PokeAPI Cloud - Astrid Rondon',
      version: '1.0.0',
      description: 'Documentación para la Tarea 9'
    },
    servers: [
      { 
        url: 'https://pokeapi-backend-production-a5ec.up.railway.app',
        description: 'Servidor Railway' 
      }
    ],
  },
  apis: ['./index.js'], // Esto le dice a Swagger que lea los comentarios en este archivo
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Esta es la línea que hace que funcione la URL /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- 3. CONEXIONES (Asegúrate de poner las variables en Railway) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error Mongo:', err));

const PokemonMongo = mongoose.model('Pokemon', new mongoose.Schema({
  id: Number, nombre: String, peso: String, altura: String,
  imagenFrontal: String, imagenPosterior: String, poderes: String
}), 'pokemon');

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- 4. RUTAS ---

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
    res.status(404).json({ message: "Pokémon no encontrado en NoSQL" });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

// Ruta base para verificar que el servidor está vivo
app.get('/', (req, res) => {
  res.send('<h1>Servidor de Astrid Funcionando 🚀</h1><p>Ve a <a href="/api-docs">/api-docs</a> para la documentación.</p>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});
