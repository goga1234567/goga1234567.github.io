// Initialisation de Lucide Icons
function initIcons() {
  lucide.createIcons();
}

// Variables globales pour stocker les données récupérées
const appData = {
  currentUser: null,
  rooms: [],
  topUsers: [],
  burnOfTheDay: null,
  messages: []
};

// API URL
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : '/api';

// Variables globales
let activeRoomId = 1;
let isAuthenticated = false;
let isOneShotMode = false;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser les icônes
  initIcons();
  
  // Vérifier l'authentification (simulé)
  checkAuth();
  
  // Initialiser les composants de l'interface
  initUI();
  
  // Charger les données initiales
  loadInitialData();
  
  // Ajouter les écouteurs d'événements
  setupEventListeners();
});

// Vérification de l'authentification
async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      appData.currentUser = userData;
      isAuthenticated = true;
      updateUserInterface();
    } else {
      isAuthenticated = false;
      showAuthModal();
    }
  } catch (error) {
    console.error('Erreur de vérification d\'authentification:', error);
    isAuthenticated = false;
    showAuthModal();
  }
}

// Afficher la modal d'authentification
function showAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.add('show');
}

// Cacher la modal d'authentification
function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.remove('show');
}

// Initialisation de l'interface utilisateur
function initUI() {
  // Initialiser les onglets d'authentification
  const authTabs = document.querySelectorAll('.auth-tab');
  authTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Mettre à jour les onglets actifs
      authTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Afficher le formulaire approprié
      document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
      document.getElementById(`${tabId}-form`).classList.add('active');
    });
  });
  
  // Initialiser les boutons de type de message
  const normalToggle = document.getElementById('normal-toggle');
  const oneShotToggleText = document.getElementById('oneshot-toggle-text');
  const oneShotToggle = document.getElementById('oneshot-toggle');
  
  normalToggle.addEventListener('click', function() {
    isOneShotMode = false;
    updateMessageTypeUI();
  });
  
  oneShotToggleText.addEventListener('click', function() {
    isOneShotMode = true;
    updateMessageTypeUI();
  });
  
  oneShotToggle.addEventListener('click', function() {
    isOneShotMode = !isOneShotMode;
    updateMessageTypeUI();
  });
  
  // Initialiser le compteur de caractères
  const messageInput = document.getElementById('message-input');
  const characterCount = document.getElementById('character-count');
  
  messageInput.addEventListener('input', function() {
    const count = this.value.length;
    characterCount.textContent = count;
    
    if (count > 250) {
      characterCount.classList.add('limit');
    } else {
      characterCount.classList.remove('limit');
    }
  });
}

// Mettre à jour l'UI de type de message
function updateMessageTypeUI() {
  const normalToggle = document.getElementById('normal-toggle');
  const oneShotToggleText = document.getElementById('oneshot-toggle-text');
  const oneShotToggle = document.getElementById('oneshot-toggle');
  
  if (isOneShotMode) {
    normalToggle.classList.remove('active');
    oneShotToggleText.classList.add('active');
    oneShotToggle.classList.add('active');
  } else {
    normalToggle.classList.add('active');
    oneShotToggleText.classList.remove('active');
    oneShotToggle.classList.remove('active');
  }
}

// Chargement des données initiales
function loadInitialData() {
  // Charger les salons
  loadRooms();
  
  // Charger le leaderboard
  loadLeaderboard();
  
  // Charger le burn of the day
  loadBurnOfTheDay();
  
  // Charger les messages du salon actif
  loadMessages(activeRoomId);
}

// Charger les salons de discussion
async function loadRooms() {
  const channelsList = document.getElementById('channels-list');
  channelsList.innerHTML = '<div class="loading-indicator">Chargement...</div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des salons');
    }
    
    const rooms = await response.json();
    appData.rooms = rooms;
    
    // Afficher les salons
    channelsList.innerHTML = '';
    
    rooms.forEach(room => {
      const isActive = room.id === activeRoomId;
      const roomColor = getColorClass(room.color);
      
      const channelItem = document.createElement('div');
      channelItem.className = `channel-item ${isActive ? 'active' : ''}`;
      channelItem.dataset.id = room.id;
      channelItem.innerHTML = `
        <div class="channel-name">
          <i data-lucide="hash" class="${roomColor}"></i>
          <span>${room.name.toUpperCase()}</span>
        </div>
        <span class="channel-members">0</span>
      `;
      
      channelItem.addEventListener('click', function() {
        changeRoom(room.id);
      });
      
      channelsList.appendChild(channelItem);
    });
    
    // Mettre à jour les icônes Lucide
    lucide.createIcons();
    
    // Connecter le websocket pour le salon actif
    if (isAuthenticated && appData.currentUser) {
      connectToWebSocket(activeRoomId);
    }
  } catch (error) {
    console.error('Erreur de chargement des salons:', error);
    channelsList.innerHTML = '<div class="error-message">Erreur de chargement</div>';
  }
}

// Charger le leaderboard
async function loadLeaderboard() {
  const leaderboardUsers = document.getElementById('leaderboard-users');
  leaderboardUsers.innerHTML = '<div class="loading-indicator">Chargement...</div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement du leaderboard');
    }
    
    const users = await response.json();
    appData.topUsers = users;
    
    // Afficher le leaderboard
    leaderboardUsers.innerHTML = '';
    
    if (users.length === 0) {
      leaderboardUsers.innerHTML = '<div class="empty-leaderboard">Pas encore de données</div>';
      return;
    }
    
    users.forEach((user, index) => {
      const rankColor = index === 0 ? 'text-yellow' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-red' : 'text-gray-500';
      
      const leaderItem = document.createElement('div');
      leaderItem.className = 'leaderboard-item';
      leaderItem.innerHTML = `
        <div class="leader-info">
          <span class="leader-rank ${rankColor}">#${index + 1}</span>
          <span class="leader-name">${user.username}</span>
        </div>
        <div class="leader-followers text-green">${user.follower_count.toLocaleString()}</div>
      `;
      
      leaderboardUsers.appendChild(leaderItem);
    });
  } catch (error) {
    console.error('Erreur de chargement du leaderboard:', error);
    leaderboardUsers.innerHTML = '<div class="error-message">Erreur de chargement</div>';
  }
}

// Charger le "burn of the day"
async function loadBurnOfTheDay() {
  const burnContent = document.getElementById('burn-content');
  const burnAuthor = document.getElementById('burn-author');
  
  burnContent.textContent = 'Chargement...';
  burnAuthor.textContent = '';
  
  try {
    const response = await fetch(`${API_BASE_URL}/burn-of-the-day`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        burnContent.textContent = 'Pas encore de "burn" du jour.';
        return;
      }
      throw new Error('Erreur lors du chargement du burn of the day');
    }
    
    const burn = await response.json();
    appData.burnOfTheDay = burn;
    
    burnContent.textContent = `"${burn.content}"`;
    burnAuthor.textContent = `— ${burn.username}`;
  } catch (error) {
    console.error('Erreur de chargement du burn of the day:', error);
    burnContent.textContent = 'Erreur de chargement';
  }
}

// Charger les messages d'un salon
async function loadMessages(roomId) {
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '<div class="loading-indicator">Chargement des messages...</div>';
  
  try {
    // Trouver les informations du salon
    let room = appData.rooms.find(r => r.id === roomId);
    
    if (!room) {
      await loadRooms();
      room = appData.rooms.find(r => r.id === roomId);
      
      if (!room) {
        throw new Error('Salon non trouvé');
      }
    }
    
    // Mettre à jour l'info du salon
    document.getElementById('room-name').innerHTML = `
      <i data-lucide="message-square-text"></i>
      <span>Salon: ${room.name.toUpperCase()}</span>
    `;
    document.getElementById('room-description').textContent = room.description;
    document.getElementById('room-users').textContent = '...';
    
    // Connecter au WebSocket pour ce salon
    if (isAuthenticated && appData.currentUser) {
      connectToWebSocket(roomId);
    }
    
    // Charger les messages
    const response = await fetch(`${API_BASE_URL}/messages/${roomId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des messages');
    }
    
    const messages = await response.json();
    appData.messages = messages;
    
    // Afficher les messages
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="empty-chat">
          <p>Pas encore de messages. Soyez le premier à écrire quelque chose !</p>
        </div>
      `;
      return;
    }
    
    // Formater la date et afficher les messages
    messages.forEach(message => {
      const formattedMessage = {
        ...message,
        timestamp: formatTimestamp(message.created_at),
        isOneShot: message.is_one_shot,
        upvotes: message.upvotes,
        downvotes: message.downvotes
      };
      
      const messageEl = createMessageElement(formattedMessage);
      chatMessages.appendChild(messageEl);
    });
    
    // Mettre à jour les icônes
    lucide.createIcons();
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    console.error('Erreur de chargement des messages:', error);
    chatMessages.innerHTML = '<div class="error-message">Erreur lors du chargement des messages</div>';
  }
}

// Formater un timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Variables WebSocket
let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Se connecter au WebSocket
function connectToWebSocket(roomId) {
  // Si un socket existe déjà, envoyer un message de départ
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'LEAVE_ROOM',
      payload: { roomId: activeRoomId }
    }));
    
    socket.close();
  }
  
  // Créer une nouvelle connexion WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = function() {
    console.log('WebSocket connecté');
    reconnectAttempts = 0;
    
    // Rejoindre le salon
    if (isAuthenticated && appData.currentUser) {
      socket.send(JSON.stringify({
        type: 'JOIN_ROOM',
        payload: {
          roomId: roomId,
          userId: appData.currentUser.id
        }
      }));
    }
  };
  
  socket.onmessage = function(event) {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'ROOM_USERS_COUNT':
        // Mettre à jour le compteur d'utilisateurs
        const count = message.payload.count;
        document.getElementById('room-users').textContent = count;
        
        // Mettre à jour le compteur dans la liste des salons
        const channelItem = document.querySelector(`.channel-item[data-id="${roomId}"]`);
        if (channelItem) {
          channelItem.querySelector('.channel-members').textContent = count;
        }
        break;
        
      case 'NEW_MESSAGE':
        // Ajouter le nouveau message au début de la liste
        const newMessage = message.payload;
        
        // Vérifier si le message est pour le salon courant
        if (newMessage.room_id === activeRoomId) {
          const formattedMessage = {
            ...newMessage,
            timestamp: formatTimestamp(newMessage.created_at),
            isOneShot: newMessage.is_one_shot,
            upvotes: newMessage.upvotes,
            downvotes: newMessage.downvotes
          };
          
          const messageEl = createMessageElement(formattedMessage);
          const chatMessages = document.getElementById('chat-messages');
          
          // Si c'est le premier message, remplacer le message vide
          if (chatMessages.querySelector('.empty-chat')) {
            chatMessages.innerHTML = '';
          }
          
          // Ajouter au début
          chatMessages.prepend(messageEl);
          
          // Mettre à jour les icônes
          lucide.createIcons();
        }
        break;
        
      case 'VOTE_UPDATE':
        // Mettre à jour les votes d'un message
        const updatedMessage = message.payload;
        const messageEl = document.querySelector(`.message-box[data-id="${updatedMessage.id}"]`);
        
        if (messageEl) {
          const upvoteEl = messageEl.querySelector('.upvote span');
          const downvoteEl = messageEl.querySelector('.downvote span');
          
          if (upvoteEl) upvoteEl.textContent = updatedMessage.upvotes;
          if (downvoteEl) downvoteEl.textContent = updatedMessage.downvotes;
        }
        break;
    }
  };
  
  socket.onclose = function() {
    console.log('WebSocket déconnecté');
    
    // Tenter de se reconnecter
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(() => {
        console.log(`Tentative de reconnexion WebSocket (${reconnectAttempts}/${maxReconnectAttempts})...`);
        connectToWebSocket(roomId);
      }, 2000 * reconnectAttempts);
    }
  };
  
  socket.onerror = function(error) {
    console.error('Erreur WebSocket:', error);
  };
}

// Créer un élément de message
function createMessageElement(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message-box';
  messageEl.dataset.id = message.id;
  
  const auraColor = getAuraColor(message.aura);
  
  if (message.isOneShot) {
    messageEl.innerHTML = `
      <div class="message-header">
        <div class="message-timestamp">[${message.timestamp}]</div>
        <div class="message-author ${auraColor}">${message.username}</div>
        <div class="message-aura ${auraColor} border-${auraColor}">${message.aura}</div>
      </div>
      <div class="message-content message-oneshot">
        <p class="message-oneshot-label">ONE-SHOT MESSAGE:</p>
        <p>${message.content}</p>
        <p class="text-small text-right mt-1">Ce message s'autodétruira après lecture</p>
      </div>
      <div class="message-footer">
        <div class="message-action upvote" data-action="upvote" data-id="${message.id}">
          <i data-lucide="arrow-up" class="text-green"></i>
          <span class="text-green">${message.upvotes}</span>
        </div>
        <div class="message-action downvote" data-action="downvote" data-id="${message.id}">
          <i data-lucide="arrow-down" class="text-red"></i>
          <span class="text-red">${message.downvotes}</span>
        </div>
        <div class="message-action reply" data-action="reply" data-id="${message.id}" data-username="${message.username}">
          <i data-lucide="reply"></i>
          <span>Reply</span>
        </div>
      </div>
    `;
  } else {
    messageEl.innerHTML = `
      <div class="message-header">
        <div class="message-timestamp">[${message.timestamp}]</div>
        <div class="message-author ${auraColor}">${message.username}</div>
        <div class="message-aura ${auraColor} border-${auraColor}">${message.aura}</div>
      </div>
      <div class="message-content">
        <p>${message.content}</p>
      </div>
      <div class="message-footer">
        <div class="message-action upvote" data-action="upvote" data-id="${message.id}">
          <i data-lucide="arrow-up" class="text-green"></i>
          <span class="text-green">${message.upvotes}</span>
        </div>
        <div class="message-action downvote" data-action="downvote" data-id="${message.id}">
          <i data-lucide="arrow-down" class="text-red"></i>
          <span class="text-red">${message.downvotes}</span>
        </div>
        <div class="message-action reply" data-action="reply" data-id="${message.id}" data-username="${message.username}">
          <i data-lucide="reply"></i>
          <span>Reply</span>
        </div>
      </div>
    `;
  }
  
  return messageEl;
}

// Obtenir la classe de couleur pour une aura
function getAuraColor(aura) {
  switch (aura.toLowerCase()) {
    case 'mystique': return 'text-green';
    case 'provocateur': return 'text-red';
    case 'sage': return 'text-blue';
    case 'poète': return 'text-yellow';
    case 'troll': return 'text-purple';
    default: return 'text-gray-400';
  }
}

// Obtenir la classe de couleur pour un salon
function getColorClass(color) {
  switch (color.toLowerCase()) {
    case 'green': return 'text-green';
    case 'blue': return 'text-blue';
    case 'red': return 'text-red';
    case 'yellow': return 'text-yellow';
    case 'purple': return 'text-purple';
    default: return 'text-gray-400';
  }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
  // Formulaire de connexion
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    // Simuler une authentification
    if (username && password) {
      simulateLogin(username);
    }
  });
  
  // Formulaire d'inscription
  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    // Simuler une inscription
    if (username && password) {
      simulateRegister(username);
    }
  });
  
  // Formulaire de message
  const messageForm = document.getElementById('message-form');
  messageForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (content && isAuthenticated) {
      sendMessage(content);
      messageInput.value = '';
      document.getElementById('character-count').textContent = '0';
    }
  });
  
  // Le bouton de déconnexion est ajouté dynamiquement par updateUserInterface()
  
  // Événements de vote et de réponse
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    const messageId = parseInt(target.dataset.id, 10);
    
    if (action === 'upvote' || action === 'downvote') {
      handleVote(messageId, action === 'upvote');
    } else if (action === 'reply') {
      const username = target.dataset.username;
      handleReply(username);
    }
  });
}

// Connexion à l'API
async function simulateLogin(username) {
  try {
    const loginButton = document.querySelector('#login-form button[type="submit"]');
    const errorMessage = document.getElementById('login-error');
    
    if (errorMessage) {
      errorMessage.textContent = '';
    }
    
    loginButton.disabled = true;
    loginButton.textContent = 'Connexion...';
    
    const password = document.getElementById('login-password').value;
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur de connexion');
    }
    
    const userData = await response.json();
    appData.currentUser = userData;
    
    isAuthenticated = true;
    hideAuthModal();
    updateUserInterface();
    loadInitialData(); // Recharger les données
  } catch (error) {
    console.error('Erreur de connexion:', error);
    const errorMessage = document.getElementById('login-error') || document.createElement('div');
    errorMessage.id = 'login-error';
    errorMessage.className = 'error-message';
    errorMessage.textContent = error.message;
    
    const loginForm = document.getElementById('login-form');
    if (!document.getElementById('login-error')) {
      loginForm.appendChild(errorMessage);
    }
  } finally {
    const loginButton = document.querySelector('#login-form button[type="submit"]');
    loginButton.disabled = false;
    loginButton.textContent = 'Se connecter';
  }
}

// Inscription à l'API
async function simulateRegister(username) {
  try {
    const registerButton = document.querySelector('#register-form button[type="submit"]');
    const errorMessage = document.getElementById('register-error');
    
    if (errorMessage) {
      errorMessage.textContent = '';
    }
    
    registerButton.disabled = true;
    registerButton.textContent = 'Inscription...';
    
    const password = document.getElementById('register-password').value;
    
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur d\'inscription');
    }
    
    const userData = await response.json();
    appData.currentUser = userData;
    
    isAuthenticated = true;
    hideAuthModal();
    updateUserInterface();
    loadInitialData(); // Recharger les données
  } catch (error) {
    console.error('Erreur d\'inscription:', error);
    const errorMessage = document.getElementById('register-error') || document.createElement('div');
    errorMessage.id = 'register-error';
    errorMessage.className = 'error-message';
    errorMessage.textContent = error.message;
    
    const registerForm = document.getElementById('register-form');
    if (!document.getElementById('register-error')) {
      registerForm.appendChild(errorMessage);
    }
  } finally {
    const registerButton = document.querySelector('#register-form button[type="submit"]');
    registerButton.disabled = false;
    registerButton.textContent = 'S\'inscrire';
  }
}

// Mise à jour de l'interface utilisateur
function updateUserInterface() {
  if (isAuthenticated && appData.currentUser) {
    // Mettre à jour l'état d'authentification dans l'UI
    const userStatus = document.getElementById('user-status');
    userStatus.textContent = `CONNECTÉ: ${appData.currentUser.username}`;
    userStatus.style.display = 'inline-block';
    
    // Mettre à jour le profil
    document.getElementById('profile-username').textContent = appData.currentUser.username;
    document.getElementById('profile-aura').textContent = capitalizeFirstLetter(appData.currentUser.aura || 'mystique');
    
    const followerCount = appData.currentUser.follower_count || 0;
    document.getElementById('profile-followers').textContent = followerCount.toLocaleString();
    document.getElementById('profile-impact').textContent = `${Math.min(100, Math.max(0, Math.floor(followerCount / 10))).toFixed(1)}%`;
    
    // Mettre à jour les followers live
    document.getElementById('live-followers').textContent = followerCount.toLocaleString();
    
    // Mettre à jour la progress bar
    const progressFill = document.querySelector('.progress-fill');
    const progress = Math.min(100, Math.max(1, followerCount / 10));
    progressFill.style.width = `${progress}%`;
    
    // Activer les actions qui nécessitent une authentification
    document.getElementById('message-form').classList.remove('disabled');
    
    // Ajouter le bouton de déconnexion s'il n'existe pas
    if (!document.getElementById('logout-button')) {
      const userInfo = document.querySelector('.user-info');
      const logoutButton = document.createElement('button');
      logoutButton.id = 'logout-button';
      logoutButton.className = 'logout-button';
      logoutButton.innerHTML = '<i data-lucide="log-out"></i> Déconnexion';
      logoutButton.addEventListener('click', logout);
      userInfo.appendChild(logoutButton);
      lucide.createIcons();
    }
  } else {
    // Réinitialiser l'UI
    const userStatus = document.getElementById('user-status');
    if (userStatus) {
      userStatus.textContent = '';
      userStatus.style.display = 'none';
    }
    
    // Désactiver les actions qui nécessitent une authentification
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
      messageForm.classList.add('disabled');
    }
    
    // Supprimer le bouton de déconnexion s'il existe
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.remove();
    }
  }
}

// Déconnexion
async function logout() {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur de déconnexion');
    }
    
    appData.currentUser = null;
    isAuthenticated = false;
    updateUserInterface();
    showAuthModal();
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
  }
}

// Changement de salon
function changeRoom(roomId) {
  activeRoomId = roomId;
  
  // Mettre à jour les salons actifs
  document.querySelectorAll('.channel-item').forEach(item => {
    if (parseInt(item.dataset.id, 10) === roomId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Charger les messages du nouveau salon
  loadMessages(roomId);
}

// Envoyer un message
async function sendMessage(content) {
  if (!isAuthenticated || !appData.currentUser) {
    showAuthModal();
    return;
  }
  
  try {
    const messageData = {
      content: content,
      roomId: activeRoomId,
      isOneShot: isOneShotMode
    };
    
    // Désactiver le formulaire pendant l'envoi
    const sendButton = document.querySelector('#message-form button[type="submit"]');
    sendButton.disabled = true;
    sendButton.textContent = 'Envoi...';
    
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de l\'envoi du message');
    }
    
    const newMessage = await response.json();
    
    // Si le WebSocket est connecté, il se chargera d'afficher le message
    // Sinon, recharger les messages
    loadMessages(activeRoomId);
    
  } catch (error) {
    console.error('Erreur d\'envoi de message:', error);
    alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
  } finally {
    // Réactiver le formulaire
    const sendButton = document.querySelector('#message-form button[type="submit"]');
    sendButton.disabled = false;
    sendButton.textContent = 'Envoyer';
  }
}

// Gérer un vote
async function handleVote(messageId, isUpvote) {
  if (!isAuthenticated || !appData.currentUser) {
    showAuthModal();
    return;
  }
  
  // Désactiver le bouton de vote pendant le traitement
  const messageEl = document.querySelector(`.message-box[data-id="${messageId}"]`);
  if (!messageEl) return;
  
  const voteButton = messageEl.querySelector(`.${isUpvote ? 'upvote' : 'downvote'}`);
  if (!voteButton) return;
  
  voteButton.classList.add('disabled');
  
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isUpvote }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors du vote');
    }
    
    const updatedMessage = await response.json();
    
    // Mettre à jour l'UI pour ce message
    const voteCountEl = messageEl.querySelector(`.${isUpvote ? 'upvote' : 'downvote'} span`);
    if (voteCountEl) {
      voteCountEl.textContent = isUpvote ? updatedMessage.upvotes : updatedMessage.downvotes;
    }
    
    // Si le vote a impacté les followers du posteur, mettre à jour le leaderboard
    if (isAuthenticated) {
      loadLeaderboard();
    }
    
  } catch (error) {
    console.error('Erreur de vote:', error);
    alert(error.message || 'Erreur lors du vote. Veuillez réessayer.');
  } finally {
    voteButton.classList.remove('disabled');
  }
}

// Gérer une réponse
function handleReply(username) {
  if (!isAuthenticated) {
    showAuthModal();
    return;
  }
  
  const messageInput = document.getElementById('message-input');
  messageInput.value = `@${username} ${messageInput.value}`;
  messageInput.focus();
  
  // Mettre à jour le compteur de caractères
  const count = messageInput.value.length;
  document.getElementById('character-count').textContent = count;
}

// Utilitaires
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}