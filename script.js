// Mobile Navigation Toggle
const mobileToggle = document.getElementById('mobile-toggle');
const nav = document.getElementById('nav');

if (mobileToggle && nav) {
    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        nav.classList.toggle('active');
    });

    // Close mobile nav when a link is clicked
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            nav.classList.remove('active');
        });
    });
}

// Header scroll effect
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Contact form handling
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());

        // Log form data (in production, this would send to a server)
        console.log('Form submitted:', data);

        // Show success message
        const wrapper = contactForm.closest('.contact-form-wrapper');
        wrapper.innerHTML = `
            <div class="form-success">
                <div class="form-success-icon">&#9989;</div>
                <h3>Thank You!</h3>
                <p>We've received your request and will get back to you shortly. For immediate assistance, call us at <a href="tel:+13526069104">(352) 606-9104</a>.</p>
            </div>
        `;
    });
}

// Smooth scroll for anchor links (fallback for browsers without CSS scroll-behavior)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Intersection Observer for scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Apply animation to cards
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.service-card, .review-card, .stat-card, .trust-item'
    );

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});
