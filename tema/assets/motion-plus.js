// ================================================================
// motion-plus.js — Scroll Reveal Engine (63 Animations)
// Dipakai oleh semua tema undangan
// Cara pakai: tambah class 'ani-container' ke section,
// lalu class animasi (misal 'fade-in-dreamy') ke elemen di dalamnya.
// ================================================================

/**
   * ======================================================
   * SCROLL REVEAL — HIGH PERFORMANCE (INTERSECTION OBSERVER)
   * ======================================================
   */

  document.addEventListener('DOMContentLoaded', () => {
    
    // Opsi konfigurasi Observer
    const observerOptions = {
      root: null,        // viewport
      rootMargin: '0px 0px -150px 0px',
      threshold: 0
    };

    // Fungsi Callback ketika elemen masuk/keluar layar
    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        const section = entry.target;
        // Ambil semua elemen animasi di dalam section ini
        const elements = section.querySelectorAll('[class*="-dreamy"]');

        if (entry.isIntersecting) {
          // === SAAT MASUK LAYAR ===
          section.classList.add('active');
          
          elements.forEach((el, index) => {
            // Base delay 0.2 detik per item
            const delay = `${index * 0.4}s`;
            
            // Set delay inline agar staggered (berurutan)
            el.style.transitionDelay = delay;
            el.style.animationDelay = delay;
            
            el.classList.add('active');
          });

        } else {
          // === SAAT KELUAR LAYAR (Opsional) ===
          const sectionTop = entry.boundingClientRect.top;
          // Hanya reset jika scroll ke atas
          if (sectionTop > 0) { 
             section.classList.remove('active');
             elements.forEach(el => {
               el.classList.remove('active');
               el.style.transitionDelay = '0s';
               el.style.animationDelay = '0s';
             });
          }
        }
      });
    };

    // Membuat Instance Observer
    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Targetkan semua container
    const sections = document.querySelectorAll('.ani-container');
    sections.forEach(sec => observer.observe(sec));
  });