document.addEventListener('DOMContentLoaded', function() {
  // Initialiser les icônes
  initIcons();
  
  // Vérifier l'authentification (simulé)
  checkAuth();
  
  // Mettre à jour l'interface utilisateur
  updateLeaderboardUI();
});

function updateLeaderboardUI() {
  // Mettre à jour les informations de classement de l'utilisateur
  if (isAuthenticated) {
    document.getElementById('user-name').textContent = mockData.currentUser.username;
    
    // Calculer le rang (position fictive pour la simulation)
    const userRank = 125;
    document.querySelector('.position-value:nth-child(1)').textContent = `#${userRank}`;
    
    // Mettre à jour les followers
    document.querySelector('.position-value:nth-child(2)').textContent = mockData.currentUser.followerCount;
    
    // Simuler une tendance (aléatoire entre -5 et +15)
    const trend = Math.floor(Math.random() * 21) - 5;
    const trendEl = document.querySelector('.position-value:nth-child(3)');
    
    if (trend > 0) {
      trendEl.textContent = `+${trend}`;
      trendEl.className = 'position-value text-green';
    } else if (trend < 0) {
      trendEl.textContent = trend.toString();
      trendEl.className = 'position-value text-red';
    } else {
      trendEl.textContent = '0';
      trendEl.className = 'position-value';
    }
    
    // Calculer les followers nécessaires pour atteindre le top 10
    // Simuler que le 10ème a 286 followers (comme dans le mock)
    const followersNeeded = Math.max(0, 286 - mockData.currentUser.followerCount);
    document.getElementById('followers-needed').textContent = `${followersNeeded} followers`;
    
    // Mettre à jour la barre de progression
    const progressPercentage = Math.min(100, (mockData.currentUser.followerCount / 286) * 100);
    document.querySelector('.progress-fill').style.width = `${progressPercentage}%`;
  }
  
  // Animer les statistiques
  animateStatistics();
}

function animateStatistics() {
  // Sélectionner tous les éléments de statistiques
  const statElements = document.querySelectorAll('.stats-value');
  
  // Pour chaque élément, ajouter une classe d'animation après un délai
  statElements.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add('animated');
    }, index * 150);
  });
  
  // Ajouter un effet de surbrillance aux éléments du classement
  const leaderboardRows = document.querySelectorAll('.leaderboard-row');
  leaderboardRows.forEach((row, index) => {
    setTimeout(() => {
      row.classList.add('highlight');
      setTimeout(() => {
        row.classList.remove('highlight');
      }, 300);
    }, index * 100);
  });
}