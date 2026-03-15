/* ============================================
   INSTAPIX EVENTS — Shared Helpers
   ============================================ */

const IPX = {
  /* --- Navigation --- */
  initNav() {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.nav__toggle');
    const menu = document.querySelector('.nav__menu');

    // Scroll effect
    const onScroll = () => {
      nav?.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile toggle
    toggle?.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu?.classList.toggle('open');
      nav?.classList.toggle('menu-open');
      document.body.style.overflow = menu?.classList.contains('open') ? 'hidden' : '';
    });

    // Close menu on link click
    menu?.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        toggle?.classList.remove('open');
        menu?.classList.remove('open');
        nav?.classList.remove('menu-open');
        document.body.style.overflow = '';
      });
    });

    // Active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  },

  /* --- Scroll Animations --- */
  initAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .stagger').forEach(el => {
      observer.observe(el);
    });
  },

  /* --- Lightbox --- */
  initLightbox() {
    const lightbox = document.querySelector('.lightbox');
    if (!lightbox) return;

    const img = lightbox.querySelector('.lightbox__img');
    const items = document.querySelectorAll('.gallery-item');
    let currentIndex = 0;
    const images = [];

    items.forEach((item, i) => {
      const src = item.querySelector('img')?.getAttribute('data-full') ||
                  item.querySelector('img')?.src;
      images.push(src);

      item.addEventListener('click', () => {
        currentIndex = i;
        showImage(currentIndex);
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function showImage(index) {
      img.src = images[index];
    }

    function navigate(dir) {
      currentIndex = (currentIndex + dir + images.length) % images.length;
      showImage(currentIndex);
    }

    lightbox.querySelector('.lightbox__close')?.addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox__prev')?.addEventListener('click', () => navigate(-1));
    lightbox.querySelector('.lightbox__next')?.addEventListener('click', () => navigate(1));

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /* --- Gallery Filters --- */
  initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    const items = document.querySelectorAll('.gallery-item');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        items.forEach(item => {
          const show = filter === 'all' || item.dataset.category === filter;
          item.style.display = show ? '' : 'none';
        });
      });
    });
  },

  /* --- Testimonial Carousel --- */
  initCarousel(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    const track = container.querySelector('.carousel__track');
    const items = container.querySelectorAll('.carousel__item');
    const dots = container.querySelector('.carousel__dots');
    let current = 0;

    // Create dots
    if (dots) {
      items.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `carousel__dot ${i === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dots.appendChild(dot);
      });
    }

    function goTo(index) {
      current = index;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots?.querySelectorAll('.carousel__dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    }

    // Auto-advance every 5s
    let timer = setInterval(() => goTo((current + 1) % items.length), 5000);

    container.addEventListener('mouseenter', () => clearInterval(timer));
    container.addEventListener('mouseleave', () => {
      timer = setInterval(() => goTo((current + 1) % items.length), 5000);
    });

    // Swipe support
    let startX = 0;
    track?.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    track?.addEventListener('touchend', (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0));
      }
    });
  },

  /* --- Smooth Scroll --- */
  initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
          window.scrollTo({
            top: target.offsetTop - offset,
            behavior: 'smooth'
          });
        }
      });
    });
  },

  /* --- Form Validation --- */
  initForm(formSelector, onSubmit) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('[type="submit"]');

      // Basic validation
      let valid = true;
      form.querySelectorAll('[required]').forEach(input => {
        if (!input.value.trim()) {
          input.style.borderColor = '#e53e3e';
          valid = false;
        } else {
          input.style.borderColor = '';
        }
      });

      if (!valid) return;

      // Submit
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';
      }

      try {
        if (onSubmit) await onSubmit(data);
        form.reset();
        IPX.toast('Message sent! We\'ll be in touch soon.', 'success');
      } catch (err) {
        IPX.toast('Something went wrong. Please try again.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Send Inquiry';
        }
      }
    });
  },

  /* --- Toast Notifications --- */
  toast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 3000;
      padding: 16px 24px; border-radius: 100px;
      font-family: var(--font-body); font-size: 14px; font-weight: 500;
      color: #fff; background: ${type === 'success' ? '#22c55e' : '#ef4444'};
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      transform: translateY(20px); opacity: 0;
      transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /* --- Init All --- */
  init() {
    this.initNav();
    this.initAnimations();
    this.initSmoothScroll();
    this.initLightbox();
    this.initFilters();
  }
};

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => IPX.init());
