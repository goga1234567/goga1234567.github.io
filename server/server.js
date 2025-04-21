const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { query, initDb } = require('./db');

// Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

// Session middleware
app.use(session({
  genid: () => uuidv4(),
  secret: process.env.SESSION_SECRET || 'theonechat-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Initialiser la base de données
initDb();

// Routes d'authentification
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const userExists = await query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insérer le nouvel utilisateur
    const result = await query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, aura, bio, follower_count, created_at',
      [username, hashedPassword]
    );
    
    // Créer la session
    req.session.userId = result.rows[0].id;
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in register:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Récupérer l'utilisateur
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const user = result.rows[0];
    
    // Vérifier le mot de passe
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    // Créer la session
    req.session.userId = user.id;
    
    // Retourner l'utilisateur sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error in logout:', err);
      return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
    
    return res.status(200).json({ message: 'Déconnecté avec succès' });
  });
});

app.get('/api/user', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  try {
    const result = await query(
      'SELECT id, username, aura, bio, follower_count, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error in get user:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

// Routes des salons
app.get('/api/rooms', async (req, res) => {
  try {
    const result = await query('SELECT * FROM chat_rooms WHERE active = TRUE ORDER BY id');
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in get rooms:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des salons' });
  }
});

// Routes des messages
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await query(`
      SELECT m.*, u.username, u.aura 
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = $1
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [roomId]);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in get messages:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  try {
    const { content, roomId, isOneShot } = req.body;
    
    if (!content || !roomId) {
      return res.status(400).json({ error: 'Contenu et salon requis' });
    }
    
    const result = await query(`
      INSERT INTO messages (content, user_id, room_id, is_one_shot)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [content, req.session.userId, roomId, isOneShot || false]);
    
    // Récupérer les informations de l'utilisateur pour compléter le message
    const userInfo = await query('SELECT username, aura FROM users WHERE id = $1', [req.session.userId]);
    
    const message = {
      ...result.rows[0],
      username: userInfo.rows[0].username,
      aura: userInfo.rows[0].aura
    };
    
    return res.status(201).json(message);
  } catch (error) {
    console.error('Error in create message:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du message' });
  }
});

app.post('/api/messages/:messageId/vote', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  try {
    const { messageId } = req.params;
    const { isUpvote } = req.body;
    
    // Vérifier que le message existe
    const messageResult = await query('SELECT * FROM messages WHERE id = $1', [messageId]);
    
    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }
    
    const message = messageResult.rows[0];
    
    // Vérifier que l'utilisateur ne vote pas pour son propre message
    if (message.user_id === req.session.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas voter pour votre propre message' });
    }
    
    // Mettre à jour les votes
    let updateField = isUpvote ? 'upvotes = upvotes + 1' : 'downvotes = downvotes + 1';
    
    const updateResult = await query(`
      UPDATE messages
      SET ${updateField}
      WHERE id = $1
      RETURNING *
    `, [messageId]);
    
    // Mettre à jour le nombre de followers de l'auteur du message
    // Si upvote +1, si downvote -1
    const followerDelta = isUpvote ? 1 : -1;
    
    await query(`
      UPDATE users
      SET follower_count = follower_count + $1
      WHERE id = $2
    `, [followerDelta, message.user_id]);
    
    return res.status(200).json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error in vote message:', error);
    return res.status(500).json({ error: 'Erreur lors du vote' });
  }
});

// Route du leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, username, aura, follower_count
      FROM users
      ORDER BY follower_count DESC
      LIMIT 10
    `);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error in get leaderboard:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du leaderboard' });
  }
});

// Route pour obtenir le "burn of the day"
app.get('/api/burn-of-the-day', async (req, res) => {
  try {
    const result = await query(`
      SELECT m.content, u.username, u.aura
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE (m.upvotes - m.downvotes) > 0
      ORDER BY (m.upvotes - m.downvotes) DESC, m.created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pas de burn du jour disponible' });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error in get burn of the day:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du burn du jour' });
  }
});

// Route pour mettre à jour le profil utilisateur
app.patch('/api/user', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  try {
    const { bio, aura } = req.body;
    let fieldsToUpdate = [];
    let params = [];
    let paramIndex = 1;
    
    if (bio !== undefined) {
      fieldsToUpdate.push(`bio = $${paramIndex++}`);
      params.push(bio);
    }
    
    if (aura !== undefined) {
      fieldsToUpdate.push(`aura = $${paramIndex++}`);
      params.push(aura);
    }
    
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    
    params.push(req.session.userId);
    
    const result = await query(`
      UPDATE users
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, aura, bio, follower_count, created_at
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error in update user:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

// Routes d'API (gérées par le fichier routes.ts également)
// Ne pas rediriger ici pour laisser routes.ts gérer ces routes

// Créer le serveur HTTP
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Map pour suivre les connexions par salon
const roomConnections = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  let userId = null;
  let currentRoomId = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'JOIN_ROOM':
          currentRoomId = data.payload.roomId;
          userId = data.payload.userId;
          
          // Ajouter à la liste des connexions du salon
          if (!roomConnections.has(currentRoomId)) {
            roomConnections.set(currentRoomId, new Set());
          }
          roomConnections.get(currentRoomId).add(ws);
          
          // Envoyer le nombre d'utilisateurs dans le salon
          const userCount = roomConnections.get(currentRoomId).size;
          ws.send(JSON.stringify({
            type: 'ROOM_USERS_COUNT',
            payload: { count: userCount }
          }));
          
          // Notifier tous les autres utilisateurs du salon du changement
          broadcastToRoom(currentRoomId, {
            type: 'ROOM_USERS_COUNT',
            payload: { count: userCount }
          }, ws);
          
          break;
          
        case 'LEAVE_ROOM':
          if (currentRoomId && roomConnections.has(currentRoomId)) {
            roomConnections.get(currentRoomId).delete(ws);
            
            // Si le salon est vide, supprimer l'entrée
            if (roomConnections.get(currentRoomId).size === 0) {
              roomConnections.delete(currentRoomId);
            } else {
              // Sinon, notifier les autres utilisateurs
              const userCount = roomConnections.get(currentRoomId).size;
              broadcastToRoom(currentRoomId, {
                type: 'ROOM_USERS_COUNT',
                payload: { count: userCount }
              });
            }
          }
          
          currentRoomId = null;
          break;
          
        case 'NEW_MESSAGE':
          if (currentRoomId) {
            broadcastToRoom(currentRoomId, {
              type: 'NEW_MESSAGE',
              payload: data.payload
            });
          }
          break;
          
        case 'VOTE_UPDATE':
          if (currentRoomId) {
            broadcastToRoom(currentRoomId, {
              type: 'VOTE_UPDATE',
              payload: data.payload
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    // Nettoyer lorsque la connexion est fermée
    if (currentRoomId && roomConnections.has(currentRoomId)) {
      roomConnections.get(currentRoomId).delete(ws);
      
      // Si le salon est vide, supprimer l'entrée
      if (roomConnections.get(currentRoomId).size === 0) {
        roomConnections.delete(currentRoomId);
      } else {
        // Sinon, notifier les autres utilisateurs
        const userCount = roomConnections.get(currentRoomId).size;
        broadcastToRoom(currentRoomId, {
          type: 'ROOM_USERS_COUNT',
          payload: { count: userCount }
        });
      }
    }
  });
});

// Fonction pour diffuser un message à tous les clients dans un salon
function broadcastToRoom(roomId, message, except = null) {
  if (roomConnections.has(roomId)) {
    roomConnections.get(roomId).forEach(client => {
      if (client !== except && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});