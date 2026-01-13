// Add site navigation icons to mdbook pages
function addNavigation() {
  // Check if navigation already exists
  if (document.querySelector('.site-nav-icons')) return;
  
  // Look for the mdbook right-buttons toolbar
  const toolbar = document.querySelector('.right-buttons');
  if (!toolbar) return; // Exit gracefully if toolbar not found

  // Create container for site navigation icons
  const navContainer = document.createElement('div');
  navContainer.className = 'site-nav-icons';
  
  // Helper function to create navigation button
  function createNavButton(title, ariaLabel, href, svgPath) {
    const button = document.createElement('button');
    button.className = 'icon-button site-nav-button';
    button.type = 'button';
    button.title = title;
    button.setAttribute('aria-label', ariaLabel);
    button.innerHTML = `<span class="fa-svg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="${svgPath}"/></svg></span>`;
    button.addEventListener('click', () => {
      window.location.href = href;
    });
    return button;
  }
  
  // Create Home button
  const homeButton = createNavButton(
    'Return to main site',
    'Return to main site',
    '/',
    'M277.8 8.6c-12.3-11.4-31.3-11.4-43.5 0l-224 208c-9.6 9-12.8 22.9-8 35.1S18.8 272 32 272l16 0 0 176c0 35.3 28.7 64 64 64l288 0c35.3 0 64-28.7 64-64l0-176 16 0c13.2 0 25-8.1 29.8-20.3s1.6-26.2-8-35.1l-224-208zM240 320l32 0c26.5 0 48 21.5 48 48l0 96-128 0 0-96c0-26.5 21.5-48 48-48z'
  );
  
  // Create Back to Blog button
  const backButton = createNavButton(
    'Back to Blog',
    'Back to Blog',
    '/blog/',
    'M9.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l128-128c9.2-9.2 22.9-11.9 34.9-6.9S192 115.1 192 128l0 64 336 0c26.5 0 48 21.5 48 48l0 32c0 26.5-21.5 48-48 48l-336 0 0 64c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-128-128z'
  );
  
  navContainer.appendChild(homeButton);
  navContainer.appendChild(backButton);
  toolbar.insertBefore(navContainer, toolbar.firstChild);
}

// Initialize when DOM is ready
if (document.readyState !== 'loading') {
  addNavigation();
} else {
  document.addEventListener('DOMContentLoaded', addNavigation);
}

// Fallback for async content (single, reasonable delay)
setTimeout(addNavigation, 1000);

