document.addEventListener('DOMContentLoaded', () => {
    // Variables pour stocker les données
    let currentAdmin = null;
    let users = [];
    let rooms = [];
    let messages = [];
    let voixoffMessages = [];
    let siteSettings = {
        siteName: 'THE ONE CHAT',
        siteDescription: 'Un forum chat rétro-moderne uniquement texte où les utilisateurs s\'affrontent pour devenir "THE ONE"',
        burnThreshold: 5,
        maxMessages: 50,
        ancientDays: 30
    };
    
    // Éléments d'interface
    const adminLogin = document.getElementById('admin-login');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminUsername = document.getElementById('admin-username');
    const adminPassword = document.getElementById('admin-password');
    
    // Éléments du menu
    const menuButtons = document.querySelectorAll('.menu-btn');
    const sections = document.querySelectorAll('.admin-section');
    
    // Éléments des statistiques
    const totalUsersElement = document.getElementById('total-users');
    const todayMessagesElement = document.getElementById('today-messages');
    const activeUsersElement = document.getElementById('active-users');
    const oneshotsSentElement = document.getElementById('oneshots-sent');
    const burnOfDayElement = document.getElementById('burn-of-day');
    const recentActivityElement = document.getElementById('recent-activity');
    
    // Tableaux
    const usersTableElement = document.getElementById('users-table');
    const roomsTableElement = document.getElementById('rooms-table');
    const messagesTableElement = document.getElementById('messages-table');
    const messagesFilterElement = document.getElementById('messages-filter');
    const voixoffHistoryElement = document.getElementById('voixoff-history');
    
    // Formulaires
    const addRoomBtn = document.getElementById('add-room-btn');
    const roomForm = document.getElementById('room-form');
    const roomFormTitle = document.getElementById('room-form-title');
    const roomIdInput = document.getElementById('room-id');
    const roomNameInput = document.getElementById('room-name');
    const roomDescriptionInput = document.getElementById('room-description');
    const roomColorInput = document.getElementById('room-color');
    const roomActiveInput = document.getElementById('room-active');
    const saveRoomBtn = document.getElementById('save-room');
    const cancelRoomBtn = document.getElementById('cancel-room');
    
    // Voix Off
    const voixoffRoomSelect = document.getElementById('voixoff-room');
    const voixoffMessageInput = document.getElementById('voixoff-message');
    const voixoffTypeInput = document.getElementById('voixoff-type');
    const sendVoixoffBtn = document.getElementById('send-voixoff');
    
    // Paramètres
    const siteNameInput = document.getElementById('site-name');
    const siteDescriptionInput = document.getElementById('site-description');
    const burnThresholdInput = document.getElementById('burn-threshold');
    const maxMessagesInput = document.getElementById('max-messages');
    const ancientDaysInput = document.getElementById('ancient-days');
    const saveSettingsBtn = document.getElementById('save-settings');
    
    // Écouteurs d'événements
    adminLoginBtn.addEventListener('click', handleAdminLogin);
    adminLogoutBtn.addEventListener('click', handleAdminLogout);
    
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Retirer la classe active de tous les boutons
            menuButtons.forEach(btn => btn.classList.remove('active'));
            // Ajouter la classe active au bouton cliqué
            button.classList.add('active');
            
            // Masquer toutes les sections
            sections.forEach(section => section.classList.remove('active'));
            // Afficher la section correspondante
            const sectionId = button.getAttribute('data-section') + '-section';
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Formulaire des salons
    addRoomBtn.addEventListener('click', showAddRoomForm);
    saveRoomBtn.addEventListener('click', saveRoom);
    cancelRoomBtn.addEventListener('click', hideRoomForm);
    
    // Voix Off
    sendVoixoffBtn.addEventListener('click', sendVoixoffMessage);
    
    // Paramètres
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // Gestion de la connexion admin
    function handleAdminLogin() {
        const username = adminUsername.value.trim();
        const password = adminPassword.value.trim();
        
        if (!username || !password) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        // Appel à l'API pour vérifier les identifiants
        fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Identifiants incorrects');
            }
            return response.json();
        })
        .then(data => {
            currentAdmin = data;
            showAdminPanel();
            loadAllData();
        })
        .catch(error => {
            alert('Erreur de connexion: ' + error.message);
        });
    }
    
    function handleAdminLogout() {
        // Appel à l'API pour se déconnecter
        fetch('/api/admin/logout', {
            method: 'POST'
        })
        .then(() => {
            currentAdmin = null;
            showLoginScreen();
        })
        .catch(error => {
            console.error('Erreur lors de la déconnexion:', error);
        });
    }
    
    function showLoginScreen() {
        adminPanel.style.display = 'none';
        adminLogin.style.display = 'block';
        adminUsername.value = '';
        adminPassword.value = '';
    }
    
    function showAdminPanel() {
        adminLogin.style.display = 'none';
        adminPanel.style.display = 'block';
    }
    
    // Chargement des données
    function loadAllData() {
        Promise.all([
            fetch('/api/admin/statistics').then(res => res.json()),
            fetch('/api/admin/users').then(res => res.json()),
            fetch('/api/admin/rooms').then(res => res.json()),
            fetch('/api/admin/messages').then(res => res.json()),
            fetch('/api/admin/voixoff').then(res => res.json()),
            fetch('/api/admin/settings').then(res => res.json())
        ])
        .then(([statistics, usersData, roomsData, messagesData, voixoffData, settingsData]) => {
            updateStatistics(statistics);
            users = usersData;
            rooms = roomsData;
            messages = messagesData;
            voixoffMessages = voixoffData;
            siteSettings = settingsData;
            
            updateUsersTable();
            updateRoomsTable();
            updateMessagesTable();
            updateVoixoffHistory();
            updateRoomSelects();
            updateSettingsForm();
        })
        .catch(error => {
            console.error('Erreur lors du chargement des données:', error);
        });
    }
    
    function updateStatistics(stats) {
        totalUsersElement.textContent = stats.totalUsers;
        todayMessagesElement.textContent = stats.todayMessages;
        activeUsersElement.textContent = stats.activeUsers;
        oneshotsSentElement.textContent = stats.oneshotsSent;
        
        // Mise à jour du burn du jour
        if (stats.burnOfDay) {
            burnOfDayElement.innerHTML = `
                <div class="message-header">
                    <span class="message-user">${stats.burnOfDay.username}</span>
                    <span class="message-date">${formatDate(stats.burnOfDay.created_at)}</span>
                </div>
                <div class="message-content">${stats.burnOfDay.content}</div>
                <div class="message-stats">
                    <span>👍 ${stats.burnOfDay.upvotes}</span>
                    <span>👎 ${stats.burnOfDay.downvotes}</span>
                </div>
            `;
        } else {
            burnOfDayElement.innerHTML = '<p>Aucun message populaire pour le moment</p>';
        }
        
        // Mise à jour de l'activité récente
        recentActivityElement.innerHTML = '';
        stats.recentActivity.forEach(activity => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${activity.action}</td>
                <td>${activity.username}</td>
                <td>${formatDate(activity.date)}</td>
                <td>${activity.details}</td>
            `;
            recentActivityElement.appendChild(row);
        });
    }
    
    function updateUsersTable() {
        usersTableElement.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${formatDate(user.created_at)}</td>
                <td>${user.follower_count}</td>
                <td>${user.aura}</td>
                <td>
                    <button class="action-btn view-btn" data-id="${user.id}">Voir</button>
                    <button class="action-btn edit-btn" data-id="${user.id}">Éditer</button>
                    <button class="action-btn delete delete-btn" data-id="${user.id}">Supprimer</button>
                </td>
            `;
            usersTableElement.appendChild(row);
        });
        
        // Ajouter les écouteurs d'événements
        document.querySelectorAll('#users-table .view-btn').forEach(btn => {
            btn.addEventListener('click', () => viewUser(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('#users-table .edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editUser(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('#users-table .delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.getAttribute('data-id')));
        });
    }
    
    function updateRoomsTable() {
        roomsTableElement.innerHTML = '';
        rooms.forEach(room => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${room.id}</td>
                <td>${room.name}</td>
                <td>${room.description}</td>
                <td><span class="color-preview ${room.color}">${room.color}</span></td>
                <td>${room.active ? 'Oui' : 'Non'}</td>
                <td>
                    <button class="action-btn edit-room-btn" data-id="${room.id}">Éditer</button>
                    <button class="action-btn delete delete-room-btn" data-id="${room.id}">Supprimer</button>
                </td>
            `;
            roomsTableElement.appendChild(row);
        });
        
        // Ajouter les écouteurs d'événements
        document.querySelectorAll('#rooms-table .edit-room-btn').forEach(btn => {
            btn.addEventListener('click', () => editRoom(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('#rooms-table .delete-room-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteRoom(btn.getAttribute('data-id')));
        });
    }
    
    function updateMessagesTable(roomFilter = 'all') {
        messagesTableElement.innerHTML = '';
        const filteredMessages = roomFilter === 'all' 
            ? messages 
            : messages.filter(message => message.room_id.toString() === roomFilter);
        
        filteredMessages.forEach(message => {
            const row = document.createElement('tr');
            const room = rooms.find(r => r.id === message.room_id);
            row.innerHTML = `
                <td>${message.id}</td>
                <td>${message.content}</td>
                <td>${message.username}</td>
                <td>${room ? room.name : 'Salon inconnu'}</td>
                <td>${formatDate(message.created_at)}</td>
                <td>${message.upvotes}</td>
                <td>${message.downvotes}</td>
                <td>
                    <button class="action-btn delete delete-message-btn" data-id="${message.id}">Supprimer</button>
                </td>
            `;
            messagesTableElement.appendChild(row);
        });
        
        // Ajouter les écouteurs d'événements
        document.querySelectorAll('#messages-table .delete-message-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteMessage(btn.getAttribute('data-id')));
        });
        
        // Mise à jour du filtre de salon
        messagesFilterElement.innerHTML = '<option value="all">Tous les salons</option>';
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name;
            if (roomFilter.toString() === room.id.toString()) {
                option.selected = true;
            }
            messagesFilterElement.appendChild(option);
        });
        
        messagesFilterElement.addEventListener('change', () => {
            updateMessagesTable(messagesFilterElement.value);
        });
    }
    
    function updateVoixoffHistory() {
        voixoffHistoryElement.innerHTML = '';
        voixoffMessages.forEach(message => {
            const row = document.createElement('tr');
            const room = rooms.find(r => r.id === message.room_id);
            row.innerHTML = `
                <td>${message.id}</td>
                <td>${message.content}</td>
                <td>${room ? room.name : 'Salon inconnu'}</td>
                <td>${formatDate(message.created_at)}</td>
                <td>${message.is_one_shot ? 'One-Shot' : 'Normal'}</td>
                <td>${message.is_one_shot ? (message.viewed ? 'Oui' : 'Non') : 'N/A'}</td>
            `;
            voixoffHistoryElement.appendChild(row);
        });
    }
    
    function updateRoomSelects() {
        // Mise à jour du select pour la Voix Off
        voixoffRoomSelect.innerHTML = '';
        rooms.forEach(room => {
            if (room.active) {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = room.name;
                voixoffRoomSelect.appendChild(option);
            }
        });
    }
    
    function updateSettingsForm() {
        siteNameInput.value = siteSettings.siteName;
        siteDescriptionInput.value = siteSettings.siteDescription;
        burnThresholdInput.value = siteSettings.burnThreshold;
        maxMessagesInput.value = siteSettings.maxMessages;
        ancientDaysInput.value = siteSettings.ancientDays;
    }
    
    // Fonctions de gestion des salons
    function showAddRoomForm() {
        roomFormTitle.textContent = 'Ajouter un salon';
        roomIdInput.value = '';
        roomNameInput.value = '';
        roomDescriptionInput.value = '';
        roomColorInput.value = 'blue';
        roomActiveInput.value = 'true';
        roomForm.style.display = 'block';
        addRoomBtn.style.display = 'none';
    }
    
    function hideRoomForm() {
        roomForm.style.display = 'none';
        addRoomBtn.style.display = 'block';
    }
    
    function editRoom(roomId) {
        const room = rooms.find(r => r.id.toString() === roomId);
        if (!room) return;
        
        roomFormTitle.textContent = 'Modifier le salon';
        roomIdInput.value = room.id;
        roomNameInput.value = room.name;
        roomDescriptionInput.value = room.description;
        roomColorInput.value = room.color;
        roomActiveInput.value = room.active.toString();
        roomForm.style.display = 'block';
        addRoomBtn.style.display = 'none';
    }
    
    function saveRoom() {
        const roomId = roomIdInput.value;
        const roomData = {
            name: roomNameInput.value.trim(),
            description: roomDescriptionInput.value.trim(),
            color: roomColorInput.value,
            active: roomActiveInput.value === 'true'
        };
        
        if (!roomData.name || !roomData.description) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }
        
        const url = roomId ? `/api/admin/rooms/${roomId}` : '/api/admin/rooms';
        const method = roomId ? 'PUT' : 'POST';
        
        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de l\'enregistrement du salon');
            }
            return response.json();
        })
        .then(() => {
            hideRoomForm();
            loadAllData();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
        });
    }
    
    function deleteRoom(roomId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce salon ? Cette action supprimera également tous les messages associés.')) {
            return;
        }
        
        fetch(`/api/admin/rooms/${roomId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de la suppression du salon');
            }
            return response.json();
        })
        .then(() => {
            loadAllData();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
        });
    }
    
    // Fonctions de gestion des utilisateurs
    function viewUser(userId) {
        // Rediriger vers la page de profil de l'utilisateur
        window.open(`/profile.html?user=${userId}`, '_blank');
    }
    
    function editUser(userId) {
        // Afficher le formulaire d'édition utilisateur
        alert('Fonctionnalité en développement');
    }
    
    function deleteUser(userId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
            return;
        }
        
        fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de la suppression de l\'utilisateur');
            }
            return response.json();
        })
        .then(() => {
            loadAllData();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
        });
    }
    
    // Fonction de gestion des messages
    function deleteMessage(messageId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
            return;
        }
        
        fetch(`/api/admin/messages/${messageId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de la suppression du message');
            }
            return response.json();
        })
        .then(() => {
            loadAllData();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
        });
    }
    
    // Fonction d'envoi de message Voix Off
    function sendVoixoffMessage() {
        const roomId = voixoffRoomSelect.value;
        const message = voixoffMessageInput.value.trim();
        const isOneShot = voixoffTypeInput.value === 'oneshot';
        
        if (!roomId || !message) {
            alert('Veuillez sélectionner un salon et écrire un message');
            return;
        }
        
        fetch('/api/admin/voixoff', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId,
                content: message,
                isOneShot
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de l\'envoi du message Voix Off');
            }
            return response.json();
        })
        .then(() => {
            voixoffMessageInput.value = '';
            loadAllData();
            alert('Message Voix Off envoyé avec succès !');
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
        });
    }
    
    // Fonction d'enregistrement des paramètres
    function saveSettings() {
        const settings = {
            siteName: siteNameInput.value.trim(),
            siteDescription: siteDescriptionInput.value.trim(),
            burnThreshold: parseInt(burnThresholdInput.value),
            maxMessages: parseInt(maxMessagesInput.value),
            ancientDays: parseInt(ancientDaysInput.value)
        };
        
        fetch('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de l\'enregistrement des paramètres');
            }
            return response.json();
        })
        .then(() => {
            alert('Paramètres enregistrés avec succès !');
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
        });
    }
    
    // Utilitaires
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Vérification de la connexion admin au chargement
    fetch('/api/admin/check')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Non connecté');
        })
        .then(data => {
            if (data.loggedIn) {
                currentAdmin = data.user;
                showAdminPanel();
                loadAllData();
            } else {
                showLoginScreen();
            }
        })
        .catch(() => {
            showLoginScreen();
        });

    // Hack temporaire pour le développement : auto-login avec les identifiants par défaut
    // À SUPPRIMER EN PRODUCTION
    adminUsername.value = 'TheOneCEO';
    adminPassword.value = 'qlqnpourun';
    // Si on n'a pas d'API d'authentification prête, simulons une connexion réussie
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('replit')) {
        setTimeout(() => {
            currentAdmin = { username: 'TheOneCEO', id: 1 };
            showAdminPanel();
            
            // Simuler des données statiques pour le développement
            updateStatistics({
                totalUsers: 12,
                todayMessages: 37,
                activeUsers: 5,
                oneshotsSent: 3,
                burnOfDay: {
                    username: 'MaxBurn',
                    content: 'La vraie intelligence, c\'est de comprendre que tout ce qu\'on savait hier peut être remis en question aujourd\'hui.',
                    upvotes: 15,
                    downvotes: 2,
                    created_at: new Date().toISOString()
                },
                recentActivity: [
                    { action: 'Connexion', username: 'TheOneCEO', date: new Date().toISOString(), details: 'Panneau admin' },
                    { action: 'Message', username: 'MaxBurn', date: new Date().toISOString(), details: 'Salon Philosophie' },
                    { action: 'Inscription', username: 'NouvelUtilisateur', date: new Date().toISOString(), details: 'Compte créé' }
                ]
            });
            
            users = [
                { id: 1, username: 'TheOneCEO', created_at: new Date().toISOString(), follower_count: 1000, aura: 'mystique', is_admin: true },
                { id: 2, username: 'MaxBurn', created_at: new Date().toISOString(), follower_count: 250, aura: 'brillant' },
                { id: 3, username: 'NouvelUtilisateur', created_at: new Date().toISOString(), follower_count: 0, aura: 'neutre' }
            ];
            
            rooms = [
                { id: 1, name: 'Général', description: 'Le salon principal pour discuter de tout', color: 'blue', active: true, created_at: new Date().toISOString() },
                { id: 2, name: 'Tech', description: 'Discussions sur la technologie et le développement', color: 'green', active: true, created_at: new Date().toISOString() },
                { id: 3, name: 'Philosophie', description: 'Débats et réflexions philosophiques', color: 'purple', active: true, created_at: new Date().toISOString() },
                { id: 4, name: 'Humour', description: 'Blagues et contenus humoristiques', color: 'yellow', active: true, created_at: new Date().toISOString() }
            ];
            
            messages = [
                { id: 1, content: 'La vraie intelligence, c\'est de comprendre que tout ce qu\'on savait hier peut être remis en question aujourd\'hui.', username: 'MaxBurn', room_id: 3, created_at: new Date().toISOString(), upvotes: 15, downvotes: 2 },
                { id: 2, content: 'Bienvenue à tous les nouveaux membres !', username: 'TheOneCEO', room_id: 1, created_at: new Date().toISOString(), upvotes: 8, downvotes: 0 },
                { id: 3, content: 'Salut, je suis nouveau ici !', username: 'NouvelUtilisateur', room_id: 1, created_at: new Date().toISOString(), upvotes: 3, downvotes: 0 }
            ];
            
            voixoffMessages = [
                { id: 1, content: 'Rappel : le concours de la semaine commence demain.', room_id: 1, created_at: new Date().toISOString(), is_one_shot: false, viewed: true },
                { id: 2, content: 'Une maintenance est prévue ce soir de 22h à 23h.', room_id: 1, created_at: new Date().toISOString(), is_one_shot: true, viewed: false }
            ];
            
            updateUsersTable();
            updateRoomsTable();
            updateMessagesTable();
            updateVoixoffHistory();
            updateRoomSelects();
        }, 500);
    }
});