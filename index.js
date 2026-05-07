const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// 1. SOLUCIÓN PARA REDES BLOQUEADAS (PC ESCRITORIO)
// Obliga a Node.js a usar IPv4 primero, saltándose bloqueos de DNS comunes en Bogotá
dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(cors());
app.use(express.json());

// 2. CONEXIÓN A SUPABASE (SQL)
const pool = new Pool({
    connectionString: process.env.SUPABASE_URL,
});

// 3. CONEXIÓN A MONGODB ATLAS (NoSQL)
// Usamos family: 4 para asegurar la conexión en redes domésticas
mongoose.connect(process.env.MONGO_URI, {
    family: 4 
})
.then(() => console.log('✅ ¡CONEXIÓN EXITOSA! Backend conectado a MongoDB Atlas'))
.catch(err => console.error('❌ Error de conexión en Mongo:', err.message));

// 4. ESQUEMA Y MODELO DE MONGO
const pokemonSchema = new mongoose.Schema({
    id: Number,
    nombre: String,
    peso: String,
    altura: String,
    imagenFrontal: String,
    imagenPosterior: String,
    poderes: String
});

// El tercer parámetro 'pokemon' obliga a usar ese nombre exacto de colección
const PokemonMongo = mongoose.model('Pokemon', pokemonSchema, 'pokemon');

// --- RUTAS DE LA API ---

// Ruta para MongoDB (NoSQL)
app.get('/pokemon/nosql/:nombre', async (req, res) => {
    try {
        const nombreBuscado = req.params.nombre.toLowerCase();
        // Búsqueda insensible a mayúsculas
        const pokemon = await PokemonMongo.findOne({ nombre: new RegExp(`^${nombreBuscado}$`, 'i') });
        
        if (pokemon) {
            res.json(pokemon);
        } else {
            res.status(404).json({ message: 'Pokémon no encontrado en MongoDB' });
        }
    } catch (err) {
        console.error("Error en consulta NoSQL:", err);
        res.status(500).json({ error: "Error en el servidor", detalle: err.message });
    }
});

// Ruta para Supabase (SQL)
app.get('/pokemon/sql/:nombre', async (req, res) => {
    try {
        const nombre = req.params.nombre.toLowerCase();
        const result = await pool.query('SELECT * FROM pokemon WHERE LOWER(nombre) = $1', [nombre]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ message: 'Pokémon no encontrado en Supabase' });
        }
    } catch (err) {
        console.error("Error en consulta SQL:", err);
        res.status(500).json({ error: err.message });
    }
});

// 5. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));