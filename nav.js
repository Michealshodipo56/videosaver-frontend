document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const nav = document.querySelector('.nav');
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);
    
    if (mobileMenuBtn && nav) {
        const toggleMenu = (show) => {
            const isOpen = show !== undefined ? show : !nav.classList.contains('open');
            nav.classList.toggle('open', isOpen);
            overlay.classList.toggle('show', isOpen);
            
            const icon = mobileMenuBtn.querySelector('i');
            if (isOpen) {
                icon.setAttribute('data-lucide', 'x');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            } else {
                icon.setAttribute('data-lucide', 'menu');
                document.body.style.overflow = ''; // Restore scrolling
            }
            lucide.createIcons();
        };

        mobileMenuBtn.addEventListener('click', () => toggleMenu());

        // Close menu when clicking a link
        nav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });

        // Close menu when clicking overlay
        overlay.addEventListener('click', () => toggleMenu(false));
    }
});
