document.addEventListener('DOMContentLoaded', function() {
  // Initialiser les icônes
  initIcons();
  
  // Vérifier l'authentification (simulé)
  checkAuth();
  
  // Initialiser les composants spécifiques au profil
  initProfileUI();
  
  // Chargement des données du profil
  loadProfileData();
});

function initProfileUI() {
  // Initialiser le sélecteur d'aura
  const auraOptions = document.querySelectorAll('.aura-option');
  auraOptions.forEach(option => {
    option.addEventListener('mouseenter', function() {
      const aura = this.getAttribute('data-aura');
      if (aura !== mockData.currentUser.aura) {
        this.querySelector('.aura-status').classList.add('text-gray-200');
      }
    });
    
    option.addEventListener('mouseleave', function() {
      const aura = this.getAttribute('data-aura');
      if (aura !== mockData.currentUser.aura) {
        this.querySelector('.aura-status').classList.remove('text-gray-200');
      }
    });
    
    option.addEventListener('click', function() {
      const aura = this.getAttribute('data-aura');
      changeAura(aura);
    });
  });
  
  // Initialiser le formulaire de bio
  const bioTextarea = document.getElementById('profile-bio');
  const bioCounter = document.getElementById('bio-character-count');
  
  bioTextarea.addEventListener('input', function() {
    const count = this.value.length;
    bioCounter.textContent = count;
    
    if (count > 180) {
      bioCounter.classList.add('limit');
    } else {
      bioCounter.classList.remove('limit');
    }
  });
  
  // Initialiser le formulaire de profil
  const profileForm = document.getElementById('profile-form');
  profileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const bio = bioTextarea.value;
    
    // Simuler la mise à jour du profil
    updateProfile(bio);
  });
}

function loadProfileData() {
  if (!isAuthenticated) return;
  
  // Charger les informations utilisateur
  document.getElementById('profile-username').textContent = mockData.currentUser.username;
  document.getElementById('profile-aura').textContent = capitalizeFirstLetter(mockData.currentUser.aura);
  document.getElementById('profile-aura').className = getAuraColor(mockData.currentUser.aura);
  document.getElementById('profile-followers').textContent = mockData.currentUser.followerCount.toLocaleString();
  document.getElementById('profile-impact').textContent = `${Math.min(100, Math.max(0, Math.floor(mockData.currentUser.followerCount / 10))).toFixed(1)}%`;
  
  // Mettre à jour le sélecteur d'aura
  document.querySelectorAll('.aura-option').forEach(option => {
    const aura = option.getAttribute('data-aura');
    const statusEl = option.querySelector('.aura-status');
    
    if (aura === mockData.currentUser.aura) {
      statusEl.textContent = 'ACTIF';
      statusEl.className = `aura-status ${getAuraColor(aura)}`;
    } else {
      statusEl.textContent = 'CHANGER';
      statusEl.className = 'aura-status';
    }
  });
  
  // Charger les statistiques
  document.getElementById('total-followers').textContent = mockData.currentUser.followerCount.toLocaleString();
  document.getElementById('member-since').textContent = formatDate(mockData.currentUser.createdAt);
  
  // Calculer le nombre de jours depuis l'inscription
  const daysSince = Math.floor((new Date() - new Date(mockData.currentUser.createdAt)) / (1000 * 60 * 60 * 24));
  document.getElementById('days-count').textContent = `${daysSince} jours`;
  
  // Mettre à jour la progress bar
  const progress = Math.min(100, Math.max(1, mockData.currentUser.followerCount / 10));
  document.getElementById('the-one-progress').style.width = `${progress}%`;
  
  // Mettre à jour le texte de statut des followers
  if (mockData.currentUser.followerCount > 100) {
    document.getElementById('followers-desc').textContent = "Vous devenez influent!";
  } else {
    document.getElementById('followers-desc').textContent = "Continuez à publier du contenu de qualité";
  }
}

function changeAura(aura) {
  if (!isAuthenticated || aura === mockData.currentUser.aura) return;
  
  // Simuler le changement d'aura
  mockData.currentUser.aura = aura;
  
  // Mettre à jour l'UI
  loadProfileData();
  
  // Notification 
  alert(`Votre aura a été changée pour: ${capitalizeFirstLetter(aura)}`);
}

function updateProfile(bio) {
  if (!isAuthenticated) return;
  
  // Simuler la mise à jour du profil
  setTimeout(() => {
    // Notification
    alert('Votre profil a été mis à jour avec succès!');
  }, 500);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}