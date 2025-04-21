// index.js - Point d'entrée principal
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { createServer } = require('http');
const WebSocket = require('ws');
const db = require('./server/db');

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-key-the-one-chat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Servir les fichiers statiques
app.use(express.static('./'));

// Routes API
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await db.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Erreur lors de la récupération des salons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const messages = await db.getMessages(req.params.roomId);
    res.json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const { content, roomId, isOneShot } = req.body;
    const userId = req.session.user.id;
    
    const message = await db.createMessage({ 
      content, 
      roomId, 
      userId,
      isOneShot: isOneShot || false
    });
    
    // Broadcast aux clients connectés via WebSocket
    broadcastToRoom(roomId, {
      type: 'NEW_MESSAGE',
      payload: message
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/messages/:messageId/vote', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const { messageId } = req.params;
    const { isUpvote } = req.body;
    const userId = req.session.user.id;
    
    const updatedMessage = await db.voteMessage(messageId, userId, isUpvote);
    
    // Broadcast le vote aux clients connectés
    broadcastToRoom(updatedMessage.roomId, {
      type: 'MESSAGE_VOTED',
      payload: updatedMessage
    });
    
    res.json(updatedMessage);
  } catch (error) {
    console.error('Erreur lors du vote:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await db.getTopUsers(10);
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération du classement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/burn-of-the-day', async (req, res) => {
  try {
    const burnMessage = await db.getBurnOfTheDay();
    res.json(burnMessage);
  } catch (error) {
    console.error('Erreur lors de la récupération du burn du jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }
    
    // Créer un nouvel utilisateur
    const user = await db.createUser({ username, password });
    
    // Stocker l'utilisateur dans la session
    req.session.user = user;
    
    res.status(201).json({ user });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Vérifier les identifiants
    const user = await db.authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    // Stocker l'utilisateur dans la session
    req.session.user = user;
    
    res.json({ user });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json({ success: true });
  });
});

app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Non connecté' });
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const user = await db.getUser(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.patch('/api/profile', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const userId = req.session.user.id;
    const { bio, aura } = req.body;
    
    const updatedUser = await db.updateUser(userId, { bio, aura });
    
    // Mettre à jour la session
    req.session.user = updatedUser;
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Middleware d'authentification admin
function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }
  next();
}

// Routes d'administration
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Vérifier les identifiants
    const user = await db.authenticateUser(username, password);
    if (!user || !user.is_admin) {
      return res.status(401).json({ error: 'Identifiants invalides ou utilisateur non administrateur' });
    }
    
    // Stocker l'utilisateur dans la session
    req.session.user = user;
    
    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la connexion admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/check', (req, res) => {
  if (req.session.user && req.session.user.is_admin) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});

app.get('/api/admin/statistics', requireAdmin, async (req, res) => {
  try {
    // Récupérer le nombre total d'utilisateurs
    const users = await db.pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(users.rows[0].count);
    
    // Récupérer le nombre de messages du jour
    const todayMessages = await db.pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE created_at > NOW() - INTERVAL \'1 day\''
    );
    const todayMessagesCount = parseInt(todayMessages.rows[0].count);
    
    // Récupérer le nombre d'utilisateurs actifs (connectés dans les dernières 24h)
    const activeUsers = await db.pool.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM messages WHERE created_at > NOW() - INTERVAL \'1 day\''
    );
    const activeUsersCount = parseInt(activeUsers.rows[0].count);
    
    // Récupérer le nombre de one-shots envoyés
    const oneshots = await db.pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE is_one_shot = TRUE'
    );
    const oneshotsCount = parseInt(oneshots.rows[0].count);
    
    // Récupérer le burn du jour
    const burnOfDay = await db.getBurnOfTheDay();
    
    // Créer une activité récente simulée (à remplacer par une vraie table d'activité plus tard)
    const recentActivity = [];
    const recentMessages = await db.pool.query(
      'SELECT m.id, m.content, m.created_at, u.username, r.name as room_name ' +
      'FROM messages m ' +
      'JOIN users u ON m.user_id = u.id ' +
      'JOIN chat_rooms r ON m.room_id = r.id ' +
      'ORDER BY m.created_at DESC LIMIT 5'
    );
    
    recentMessages.rows.forEach(msg => {
      recentActivity.push({
        action: 'Message',
        username: msg.username,
        date: msg.created_at,
        details: `Salon ${msg.room_name}`
      });
    });
    
    res.json({
      totalUsers,
      todayMessages: todayMessagesCount,
      activeUsers: activeUsersCount,
      oneshotsSent: oneshotsCount,
      burnOfDay,
      recentActivity
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT id, username, bio, aura, follower_count, created_at, is_admin FROM users ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Vérifier que l'utilisateur n'est pas l'admin actuel
    if (parseInt(userId) === req.session.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte administrateur' });
    }
    
    // Supprimer les votes de l'utilisateur
    await db.pool.query('DELETE FROM votes WHERE user_id = $1', [userId]);
    
    // Supprimer les messages de l'utilisateur
    await db.pool.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    
    // Supprimer l'utilisateur
    await db.pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/rooms', requireAdmin, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT * FROM chat_rooms ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des salons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/rooms', requireAdmin, async (req, res) => {
  try {
    const { name, description, color, active } = req.body;
    
    const result = await db.pool.query(
      'INSERT INTO chat_rooms (name, description, color, active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, color, active]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la création du salon:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/rooms/:id', requireAdmin, async (req, res) => {
  try {
    const roomId = req.params.id;
    const { name, description, color, active } = req.body;
    
    const result = await db.pool.query(
      'UPDATE chat_rooms SET name = $1, description = $2, color = $3, active = $4 WHERE id = $5 RETURNING *',
      [name, description, color, active, roomId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salon non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du salon:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/rooms/:id', requireAdmin, async (req, res) => {
  try {
    const roomId = req.params.id;
    
    // Supprimer les messages du salon
    await db.pool.query('DELETE FROM messages WHERE room_id = $1', [roomId]);
    
    // Supprimer le salon
    await db.pool.query('DELETE FROM chat_rooms WHERE id = $1', [roomId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du salon:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT m.*, u.username FROM messages m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    
    // Supprimer les votes associés au message
    await db.pool.query('DELETE FROM votes WHERE message_id = $1', [messageId]);
    
    // Supprimer le message
    await db.pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API pour la fonctionnalité Voix Off (messages de modération anonymes)
app.get('/api/admin/voixoff', requireAdmin, async (req, res) => {
  try {
    // Récupérer les messages de la Voix Off (messages sans utilisateur réel)
    const result = await db.pool.query(
      'SELECT m.* FROM messages m WHERE m.user_id = 0 OR m.user_id IS NULL ORDER BY m.created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages Voix Off:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/voixoff', requireAdmin, async (req, res) => {
  try {
    const { roomId, content, isOneShot } = req.body;
    
    // Créer un message sans utilisateur réel (Voix Off)
    const result = await db.pool.query(
      'INSERT INTO messages (content, room_id, user_id, is_one_shot) VALUES ($1, $2, NULL, $3) RETURNING *',
      [content, roomId, isOneShot]
    );
    
    const newMessage = result.rows[0];
    
    // Ajouter des informations supplémentaires pour l'affichage
    newMessage.username = 'Voix Off';
    newMessage.aura = 'mystique';
    
    // Broadcast aux clients connectés via WebSocket
    broadcastToRoom(roomId, {
      type: 'NEW_MESSAGE',
      payload: newMessage
    });
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Erreur lors de la création du message Voix Off:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Paramètres du site (à stocker dans une table settings plus tard)
const siteSettings = {
  siteName: 'THE ONE CHAT',
  siteDescription: 'Un forum chat rétro-moderne uniquement texte où les utilisateurs s\'affrontent pour devenir "THE ONE"',
  burnThreshold: 5,
  maxMessages: 50,
  ancientDays: 30
};

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json(siteSettings);
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const { siteName, siteDescription, burnThreshold, maxMessages, ancientDays } = req.body;
    
    // Mettre à jour les paramètres
    Object.assign(siteSettings, {
      siteName, 
      siteDescription, 
      burnThreshold: parseInt(burnThreshold), 
      maxMessages: parseInt(maxMessages), 
      ancientDays: parseInt(ancientDays)
    });
    
    res.json(siteSettings);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rediriger toutes les autres requêtes vers index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Configuration WebSocket
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Stocker les connexions WebSocket par salon et par utilisateur
const roomConnections = new Map(); // roomId -> Set of WebSocket connections
const userConnections = new Map(); // userId -> Set of WebSocket connections

wss.on('connection', (ws, req) => {
  console.log('Nouvelle connexion WebSocket établie');
  
  // Mémoriser la connexion par défaut (sans roomId ni userId pour l'instant)
  let currentRoomId = null;
  let currentUserId = null;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Gestion des différents types de messages
      switch (message.type) {
        case 'JOIN_ROOM':
          // Quitter l'ancien salon si nécessaire
          if (currentRoomId) {
            const roomSockets = roomConnections.get(currentRoomId);
            if (roomSockets) {
              roomSockets.delete(ws);
              if (roomSockets.size === 0) {
                roomConnections.delete(currentRoomId);
              }
            }
          }
          
          // Rejoindre le nouveau salon
          currentRoomId = message.payload.roomId;
          if (!roomConnections.has(currentRoomId)) {
            roomConnections.set(currentRoomId, new Set());
          }
          roomConnections.get(currentRoomId).add(ws);
          
          console.log(`Client a rejoint le salon ${currentRoomId}`);
          break;
          
        case 'AUTHENTICATE':
          currentUserId = message.payload.userId;
          if (!userConnections.has(currentUserId)) {
            userConnections.set(currentUserId, new Set());
          }
          userConnections.get(currentUserId).add(ws);
          
          console.log(`Client authentifié: utilisateur ${currentUserId}`);
          break;
          
        default:
          console.log(`Type de message WebSocket non géré: ${message.type}`);
      }
    } catch (error) {
      console.error('Erreur lors du traitement du message WebSocket:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Connexion WebSocket fermée');
    
    // Nettoyer les connexions
    if (currentRoomId) {
      const roomSockets = roomConnections.get(currentRoomId);
      if (roomSockets) {
        roomSockets.delete(ws);
        if (roomSockets.size === 0) {
          roomConnections.delete(currentRoomId);
        }
      }
    }
    
    if (currentUserId) {
      const userSockets = userConnections.get(currentUserId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          userConnections.delete(currentUserId);
        }
      }
    }
  });
});

// Fonction pour diffuser un message à tous les clients d'un salon
function broadcastToRoom(roomId, message) {
  const roomSockets = roomConnections.get(roomId);
  if (roomSockets) {
    const messageStr = JSON.stringify(message);
    roomSockets.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

// Fonction pour envoyer un message à un utilisateur spécifique
function broadcastToUser(userId, message) {
  const userSockets = userConnections.get(userId);
  if (userSockets) {
    const messageStr = JSON.stringify(message);
    userSockets.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});