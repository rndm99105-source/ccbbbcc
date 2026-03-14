// ===== Mobile Navigation =====
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

// ===== Header scroll =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
});

// ===== Animated counter =====
function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'));
    if (!target) return;
    const duration = 2000;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        el.textContent = Math.floor(eased * target) + '+';
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ===== Contact Form - Save & Notify =====
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());

        // Create submission object
        const submission = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            service: data.service || '',
            message: data.message || '',
            date: new Date().toISOString(),
            read: false
        };

        // Save to localStorage
        try {
            const submissions = JSON.parse(localStorage.getItem('bwpr_submissions') || '[]');
            submissions.push(submission);
            localStorage.setItem('bwpr_submissions', JSON.stringify(submissions));
        } catch (err) {
            console.error('Failed to save submission:', err);
        }

        // Send email notification if configured
        try {
            const emailSettings = JSON.parse(localStorage.getItem('bwpr_email_settings') || '{}');
            if (emailSettings.serviceId && emailSettings.templateId && emailSettings.publicKey && emailSettings.email) {
                // Load EmailJS dynamically
                if (!window.emailjs) {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                    document.head.appendChild(script);
                    await new Promise(resolve => {
                        script.onload = resolve;
                        script.onerror = resolve; // Don't block on failure
                    });
                }

                if (window.emailjs) {
                    emailjs.init(emailSettings.publicKey);
                    emailjs.send(emailSettings.serviceId, emailSettings.templateId, {
                        to_email: emailSettings.email,
                        from_name: 'Website Contact Form',
                        customer_name: submission.name,
                        customer_phone: submission.phone,
                        customer_email: submission.email || 'Not provided',
                        service_type: submission.service,
                        message: submission.message || 'No message',
                        date: new Date().toLocaleString()
                    }).catch(err => console.log('Email notification failed:', err));
                }
            }
        } catch (err) {
            console.log('Email notification skipped:', err);
        }

        // Show success message
        const wrapper = contactForm.closest('.form-wrapper');
        wrapper.innerHTML = `
            <div class="form-success">
                <div class="form-success-icon"><i class="fas fa-check-circle"></i></div>
                <h3>Thank You!</h3>
                <p>We have received your request and will get back to you shortly.<br>For immediate help, call <a href="tel:+13526069104">(352) 606-9104</a>.</p>
            </div>
        `;
    });
}

// ===== Smooth scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ===== Scroll reveal =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            if (entry.target.hasAttribute('data-count')) {
                animateCounter(entry.target);
            }
            revealObserver.unobserve(entry.target);
        }
    });
}, { rootMargin: '0px 0px -40px 0px', threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll(
        '.service-card, .review-card, .stat-card, .trust-item, .process-card, .contact-info-card'
    );
    items.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.transitionDelay = `${(i % 4) * 0.07}s`;
        revealObserver.observe(el);
    });

    document.querySelectorAll('[data-count]').forEach(el => revealObserver.observe(el));
});

// Reveal CSS injection
const s = document.createElement('style');
s.textContent = `
.reveal { opacity:0; transform:translateY(20px); transition: opacity .6s cubic-bezier(.4,0,.2,1), transform .6s cubic-bezier(.4,0,.2,1); }
.reveal.revealed { opacity:1; transform:translateY(0); }
`;
document.head.appendChild(s);
