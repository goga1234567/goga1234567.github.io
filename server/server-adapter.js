// Ce fichier sert d'adaptateur pour intégrer notre serveur.js avec la structure existante
const express = require('express');
const path = require('path');
const { initDb } = require('./db');

// Créer l'application Express
const app = express();

// Initialiser la base de données
initDb();

// Importer le module pour configurer les routes
const { registerRoutes } = require('./routes');

// Exporter pour intégration avec le système de démarrage Replit
module.exports = {
  createServer: async () => {
    return await registerRoutes(app);
  }
};