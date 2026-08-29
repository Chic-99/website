import { fetchAndRenderDoctors } from './doctors.js';
import { initBookingModal } from './booking.js';
import { initProfileModal } from './profile.js';
import { initServiceModal } from './services.js';
import { initTracker } from './tracker.js';

/* ---------- MOBILE DRAWER ---------- */
const drawer = document.getElementById('mobileDrawer');
document.getElementById('hamburgerBtn').addEventListener('click', () => drawer.classList.add('open'));
document.getElementById('closeDrawer').addEventListener('click', () => drawer.classList.remove('open'));
drawer.addEventListener('click', (e) => { if(e.target === drawer) drawer.classList.remove('open'); });
drawer.querySelectorAll('.drawer-link').forEach(a => a.addEventListener('click', () => drawer.classList.remove('open')));

/* ---------- SMOOTH SCROLL ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e){
    const id = this.getAttribute('href');
    if(id.length > 1 && document.querySelector(id)){
      e.preventDefault();
      document.querySelector(id).scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
});

/* ---------- FEATURE MODULES ---------- */
initBookingModal();
initProfileModal();
initServiceModal();
initTracker();
fetchAndRenderDoctors();
