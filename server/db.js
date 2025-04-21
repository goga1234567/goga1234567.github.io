// db.js - Interface de base de données pour PostgreSQL
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Connexion à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test de connexion
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connexion à la base de données établie à:', res.rows[0].now);
  }
});

// Initialiser la base de données avec les tables et les données de base
async function initDb() {
  try {
    // Créer les tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(30) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        bio TEXT DEFAULT '',
        aura VARCHAR(20) DEFAULT 'neutral',
        follower_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(30) UNIQUE NOT NULL,
        description TEXT NOT NULL,
        color VARCHAR(20) DEFAULT 'gray',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        user_id INT REFERENCES users(id),
        room_id INT REFERENCES chat_rooms(id),
        upvotes INT DEFAULT 0,
        downvotes INT DEFAULT 0,
        is_one_shot BOOLEAN DEFAULT FALSE,
        viewed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        message_id INT REFERENCES messages(id),
        user_id INT REFERENCES users(id),
        is_upvote BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id)
      )
    `);

    // Insérer des données de base si elles n'existent pas
    const roomsExist = await pool.query('SELECT COUNT(*) FROM chat_rooms');
    if (parseInt(roomsExist.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO chat_rooms (name, description, color)
        VALUES 
          ('Général', 'Le salon principal pour discuter de tout', 'blue'),
          ('Tech', 'Discussions sur la technologie et le développement', 'green'),
          ('Philosophie', 'Débats et réflexions philosophiques', 'purple'),
          ('Humour', 'Blagues et contenus humoristiques', 'yellow')
      `);
    }

    console.log('Base de données initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  }
}

// Fonctions utilisateurs
async function getUser(id) {
  try {
    const result = await pool.query(
      'SELECT id, username, bio, aura, follower_count, created_at, is_admin FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    const result = await pool.query(
      'SELECT id, username, password, bio, aura, follower_count, created_at, is_admin FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur par nom d\'utilisateur:', error);
    throw error;
  }
}

async function createUser({ username, password, isAdmin = false }) {
  try {
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING id, username, bio, aura, follower_count, created_at, is_admin',
      [username, hashedPassword, isAdmin]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    throw error;
  }
}

async function authenticateUser(username, password) {
  try {
    const user = await getUserByUsername(username);
    if (!user) return null;
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;
    
    // Ne pas renvoyer le mot de passe
    delete user.password;
    return user;
  } catch (error) {
    console.error('Erreur lors de l\'authentification de l\'utilisateur:', error);
    throw error;
  }
}

async function updateUser(id, { bio, aura }) {
  try {
    let query = 'UPDATE users SET';
    const values = [];
    const params = [];
    
    if (bio !== undefined) {
      values.push(bio);
      params.push(`bio = $${values.length}`);
    }
    
    if (aura !== undefined) {
      values.push(aura);
      params.push(`aura = $${values.length}`);
    }
    
    if (params.length === 0) return await getUser(id);
    
    values.push(id);
    query += ` ${params.join(', ')} WHERE id = $${values.length} RETURNING id, username, bio, aura, follower_count, created_at`;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    throw error;
  }
}

async function updateUserFollowers(id, delta) {
  try {
    const result = await pool.query(
      'UPDATE users SET follower_count = follower_count + $1 WHERE id = $2 RETURNING id, username, bio, aura, follower_count, created_at',
      [delta, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la mise à jour des followers:', error);
    throw error;
  }
}

async function getTopUsers(limit = 10) {
  try {
    const result = await pool.query(
      'SELECT id, username, bio, aura, follower_count, created_at FROM users ORDER BY follower_count DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Erreur lors de la récupération des top utilisateurs:', error);
    throw error;
  }
}

// Fonctions salons de chat
async function getChatRoom(id) {
  try {
    const result = await pool.query(
      'SELECT * FROM chat_rooms WHERE id = $1',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la récupération du salon:', error);
    throw error;
  }
}

async function getChatRoomByName(name) {
  try {
    const result = await pool.query(
      'SELECT * FROM chat_rooms WHERE name = $1',
      [name]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la récupération du salon par nom:', error);
    throw error;
  }
}

async function getAllChatRooms() {
  try {
    const result = await pool.query(
      'SELECT * FROM chat_rooms WHERE active = TRUE ORDER BY name'
    );
    return result.rows;
  } catch (error) {
    console.error('Erreur lors de la récupération des salons:', error);
    throw error;
  }
}

async function getRooms() {
  return await getAllChatRooms();
}

// Fonctions messages
async function getMessage(id) {
  try {
    const result = await pool.query(`
      SELECT m.*, u.username, u.aura 
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la récupération du message:', error);
    throw error;
  }
}

async function getMessages(roomId, limit = 50) {
  try {
    const result = await pool.query(`
      SELECT m.*, u.username, u.aura 
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `, [roomId, limit]);
    return result.rows.reverse(); // Retourner dans l'ordre chronologique
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    throw error;
  }
}

async function createMessage({ content, roomId, userId, isOneShot = false }) {
  try {
    const result = await pool.query(`
      INSERT INTO messages (content, room_id, user_id, is_one_shot)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, user_id, room_id, upvotes, downvotes, is_one_shot, viewed, created_at
    `, [content, roomId, userId, isOneShot]);
    
    // Récupérer les informations complètes du message, y compris le nom d'utilisateur et l'aura
    return await getMessage(result.rows[0].id);
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    throw error;
  }
}

async function voteMessage(messageId, userId, isUpvote) {
  try {
    // Vérifier si l'utilisateur a déjà voté pour ce message
    const existingVote = await pool.query(
      'SELECT * FROM votes WHERE message_id = $1 AND user_id = $2',
      [messageId, userId]
    );
    
    if (existingVote.rows.length > 0) {
      // L'utilisateur a déjà voté, vérifier si le vote a changé
      const currentVote = existingVote.rows[0];
      
      if (currentVote.is_upvote === isUpvote) {
        // Même vote, pas de changement
        return await getMessage(messageId);
      }
      
      // Vote différent, mettre à jour
      await pool.query(
        'UPDATE votes SET is_upvote = $1 WHERE id = $2',
        [isUpvote, currentVote.id]
      );
      
      // Mettre à jour les compteurs de votes
      if (isUpvote) {
        await pool.query(
          'UPDATE messages SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = $1',
          [messageId]
        );
      } else {
        await pool.query(
          'UPDATE messages SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = $1',
          [messageId]
        );
      }
    } else {
      // Nouveau vote
      await pool.query(
        'INSERT INTO votes (message_id, user_id, is_upvote) VALUES ($1, $2, $3)',
        [messageId, userId, isUpvote]
      );
      
      // Mettre à jour le compteur approprié
      if (isUpvote) {
        await pool.query(
          'UPDATE messages SET upvotes = upvotes + 1 WHERE id = $1',
          [messageId]
        );
      } else {
        await pool.query(
          'UPDATE messages SET downvotes = downvotes + 1 WHERE id = $1',
          [messageId]
        );
      }
    }
    
    // Mettre à jour les followers de l'auteur du message
    const message = await getMessage(messageId);
    const delta = isUpvote ? 1 : -1;
    await updateUserFollowers(message.user_id, delta);
    
    return message;
  } catch (error) {
    console.error('Erreur lors du vote sur le message:', error);
    throw error;
  }
}

async function markOneShortAsViewed(messageId) {
  try {
    const result = await pool.query(
      'UPDATE messages SET viewed = TRUE WHERE id = $1 AND is_one_shot = TRUE RETURNING *',
      [messageId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors du marquage du message one-shot comme vu:', error);
    throw error;
  }
}

async function getBurnOfTheDay() {
  try {
    // Récupérer le message avec le plus de upvotes des dernières 24 heures
    const result = await pool.query(`
      SELECT m.*, u.username, u.aura 
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.created_at > NOW() - INTERVAL '1 day'
      ORDER BY (m.upvotes - m.downvotes) DESC
      LIMIT 1
    `);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de la récupération du burn du jour:', error);
    throw error;
  }
}

async function createAdminUser(username, password) {
  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await getUserByUsername(username);
    if (existingAdmin) {
      // Mise à jour du statut admin si nécessaire
      if (!existingAdmin.is_admin) {
        await pool.query(
          'UPDATE users SET is_admin = TRUE WHERE username = $1 RETURNING id, username, bio, aura, follower_count, created_at, is_admin',
          [username]
        );
        console.log(`Statut administrateur mis à jour pour ${username}`);
      }
      return existingAdmin;
    }
    
    // Créer l'administrateur avec le statut admin
    return await createUser({ username, password, isAdmin: true });
  } catch (error) {
    console.error('Erreur lors de la création de l\'administrateur:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initDb,
  getUser,
  getUserByUsername,
  createUser,
  createAdminUser,
  authenticateUser,
  updateUser,
  updateUserFollowers,
  getTopUsers,
  getChatRoom,
  getChatRoomByName,
  getAllChatRooms,
  getRooms,
  getMessage,
  getMessages,
  createMessage,
  voteMessage,
  markOneShortAsViewed,
  getBurnOfTheDay
};