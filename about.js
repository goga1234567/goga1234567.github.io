document.addEventListener('DOMContentLoaded', function() {
  // Initialiser les icônes
  initIcons();
  
  // Vérifier l'authentification (simulé)
  checkAuth();
  
  // Animer les éléments de la page
  animateAboutPage();
});

function animateAboutPage() {
  // Animer l'apparition des sections
  const sections = document.querySelectorAll('.about-section');
  sections.forEach((section, index) => {
    setTimeout(() => {
      section.classList.add('fade-in');
    }, 200 * index);
  });
  
  // Animer les caractéristiques
  const features = document.querySelectorAll('.feature-item');
  features.forEach((feature, index) => {
    setTimeout(() => {
      feature.classList.add('slide-in');
    }, 150 * index + 500);
  });
  
  // Animer les contacts
  const contacts = document.querySelectorAll('.contact-item');
  contacts.forEach((contact, index) => {
    setTimeout(() => {
      contact.classList.add('pop-in');
    }, 100 * index + 1200);
  });
}