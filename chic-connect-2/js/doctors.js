import { supabase, warnIfNotConfigured } from './supabase-client.js';
import { styleForSpecialty } from './specialty-styles.js';

// Populated after fetchDoctors() resolves. Other modules (booking.js,
// profile.js) read from this instead of re-querying Supabase, and read the
// rendered DOM (same as the original static markup) for filter/search state.
export const DOCTORS_BY_ID = new Map();
let readyCallbacks = [];

export function onDoctorsReady(cb){
  readyCallbacks.push(cb);
}

function escapeHtml(str){
  if(str == null) return '';
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function docCardHtml(doc){
  const style = styleForSpecialty(doc.specialty);
  const typeClass = doc.doctor_type === 'Local Doctor' ? 'local' : 'visiting';
  const spectext = `${doc.specialty_line || doc.specialty} — ${doc.hospital}`;
  return `
    <div class="doc-card" data-id="${doc.id}" data-specialty="${escapeHtml(doc.specialty)}" data-name="${escapeHtml(doc.name)}" data-spectext="${escapeHtml(spectext)}">
      <div class="doc-top">
        <div class="doc-avatar-wrap">
          <div class="doc-avatar" style="background:${style.avatarBg};color:${style.avatarColor};">${style.svg}</div>
          <span class="avatar-badge" style="background:${style.badgeBg};">${escapeHtml(doc.specialty)}</span>
        </div>
        <div>
          <div class="doc-name">${escapeHtml(doc.name)}</div>
          ${doc.telugu_name ? `<div class="doc-telugu">${escapeHtml(doc.telugu_name)}</div>` : ''}
          <div class="doc-qual">${escapeHtml(doc.qualification)}</div>
          <span class="doc-type ${typeClass}">${escapeHtml(doc.doctor_type)}</span>
        </div>
      </div>
      <div class="doc-specialty">${escapeHtml(doc.specialty_line || doc.specialty)}</div>
      <div class="doc-hosp">${escapeHtml(doc.hospital)}</div>
      <div class="doc-actions"><a class="view view-trigger" href="javascript:void(0)" data-id="${doc.id}">View Profile</a><a class="book book-trigger" href="javascript:void(0)" data-id="${doc.id}">Book Appointment</a></div>
    </div>`;
}

function renderEmptyState(wrapEl){
  wrapEl.innerHTML = `<div class="empty-state">
    <p>No doctors are published yet. Please check back shortly, or contact CHIC directly for the latest doctor availability.</p>
    <a href="#contact" class="btn btn-outline">Contact CHIC</a>
  </div>`;
}

function renderSkeleton(wrapEl){
  wrapEl.innerHTML = `<div class="doctor-grid">${Array.from({length:3}).map(()=>`
    <div class="skeleton-card">
      <div class="skeleton-line w40" style="height:60px;width:60px;border-radius:12px;margin-bottom:16px;"></div>
      <div class="skeleton-line w80"></div>
      <div class="skeleton-line w60"></div>
      <div class="skeleton-line w40"></div>
    </div>`).join('')}</div>`;
}

export async function fetchAndRenderDoctors(){
  const doctorsSection = document.getElementById('doctorsListArea');
  if(warnIfNotConfigured(doctorsSection)) return;

  renderSkeleton(doctorsSection);

  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if(error){
    console.error('Failed to load doctors:', error);
    doctorsSection.innerHTML = `<div class="state-msg error">Could not load the doctor directory right now. Please refresh, or call CHIC directly.</div>`;
    return;
  }

  DOCTORS_BY_ID.clear();
  (data || []).forEach(d => DOCTORS_BY_ID.set(d.id, d));

  const visiting = (data || []).filter(d => d.doctor_type === 'Visiting Chennai Specialist');
  const local = (data || []).filter(d => d.doctor_type === 'Local Doctor');

  if(!data || data.length === 0){
    renderEmptyState(doctorsSection);
  } else {
    doctorsSection.innerHTML = `
      <p class="no-match" id="noMatch">No doctors match your search. Try a different name or specialty.</p>
      ${visiting.length ? `
      <div class="doctor-group" data-group="visiting">
        <div class="doctor-group-head">Visiting Chennai Specialists</div>
        <div class="doctor-grid">${visiting.map(docCardHtml).join('')}</div>
      </div>` : ''}
      ${local.length ? `
      <div class="doctor-group" data-group="local">
        <div class="doctor-group-head">Local Doctors &amp; Resident Specialists in Nellore</div>
        <div class="doctor-grid">${local.map(docCardHtml).join('')}</div>
      </div>` : ''}
    `;
    wireFilterAndSearch();
  }

  readyCallbacks.forEach(cb => { try{ cb(data || []); } catch(e){ console.error(e); } });
}

function wireFilterAndSearch(){
  const chips = document.querySelectorAll('#filterChips .filter-chip');
  const cards = document.querySelectorAll('.doc-card');
  const searchInput = document.getElementById('doctorSearchInput');
  const noMatch = document.getElementById('noMatch');
  let activeFilter = document.querySelector('#filterChips .filter-chip.active')?.dataset.filter || 'All';

  function applyFilters(){
    const q = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    cards.forEach(card => {
      const specialty = card.dataset.specialty;
      const name = card.dataset.name.toLowerCase();
      const spectext = card.dataset.spectext.toLowerCase();
      const matchesFilter = activeFilter === 'All' || specialty === activeFilter;
      const matchesSearch = !q || name.includes(q) || spectext.includes(q);
      const show = matchesFilter && matchesSearch;
      card.style.display = show ? '' : 'none';
      if(show) visibleCount++;
    });
    document.querySelectorAll('.doctor-group').forEach(group => {
      const anyVisible = [...group.querySelectorAll('.doc-card')].some(c => c.style.display !== 'none');
      group.style.display = anyVisible ? '' : 'none';
    });
    if(noMatch) noMatch.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });
  searchInput.addEventListener('input', applyFilters);
  document.getElementById('doctorSearchBtn').addEventListener('click', (e) => { e.preventDefault(); applyFilters(); });
  applyFilters();

  // View profile / Book appointment — delegated so re-renders keep working
  document.querySelectorAll('.doc-card .view-trigger').forEach(el => {
    el.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('chic:view-profile', { detail: { id: el.dataset.id } }));
    });
  });
  document.querySelectorAll('.doc-card .book-trigger').forEach(el => {
    el.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('chic:open-booking', { detail: { doctorId: el.dataset.id } }));
    });
  });
}
