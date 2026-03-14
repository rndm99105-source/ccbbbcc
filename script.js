// Mobile Navigation Toggle
const mobileToggle = document.getElementById('mobile-toggle');
const nav = document.getElementById('nav');

if (mobileToggle && nav) {
    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        nav.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
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

// Animated number counter
function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'));
    if (!target) return;

    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
        const current = Math.floor(eased * target);
        el.textContent = current + '+';

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Contact form handling
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());
        console.log('Form submitted:', data);

        const wrapper = contactForm.closest('.contact-form-wrapper');
        wrapper.innerHTML = `
            <div class="form-success">
                <div class="form-success-icon"><i class="fas fa-check-circle"></i></div>
                <h3>Thank You!</h3>
                <p>We've received your request and will get back to you shortly.<br>For immediate assistance, call <a href="tel:+13526069104">(352) 606-9104</a>.</p>
            </div>
        `;
    });
}

// Smooth scroll for anchor links
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
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');

            // Trigger counter animation
            if (entry.target.hasAttribute('data-count')) {
                animateCounter(entry.target);
            }

            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Apply scroll reveal animations
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll(
        '.service-card, .review-card, .stat-card, .trust-item, .feature-item, .contact-card, .process-step'
    );

    revealElements.forEach((el, index) => {
        el.classList.add('reveal');
        el.style.transitionDelay = `${(index % 6) * 0.08}s`;
        observer.observe(el);
    });

    // Counter elements
    document.querySelectorAll('[data-count]').forEach(el => {
        observer.observe(el);
    });

    // Parallax effect on hero particles
    const particles = document.querySelectorAll('.hero-particle');
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        particles.forEach((particle, i) => {
            const speed = (i + 1) * 8;
            particle.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    });
});

// CSS classes for reveal animation
const style = document.createElement('style');
style.textContent = `
    .reveal {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), 
                    transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .reveal.revealed {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);
