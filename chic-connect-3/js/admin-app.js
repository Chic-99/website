import { supabase, warnIfNotConfigured } from './supabase-client.js';
import { KNOWN_SPECIALTIES } from './specialty-styles.js';
import { printAppointmentSlip } from './print-slip.js';

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginError = document.getElementById('loginError');
const loggedInAs = document.getElementById('loggedInAs');

const STATUS_FLOW = ['Request Received', 'Called', 'Scheduled', 'Confirmed', 'Closed'];
const STATUS_STYLE = {
  'Request Received': { bg: '#fdeee0', fg: '#b5590c' },
  'Called':            { bg: '#e9f1fb', fg: '#1565c0' },
  'Scheduled':         { bg: '#eaf4eb', fg: '#2e7d32' },
  'Confirmed':         { bg: '#e6f4f2', fg: '#0b827b' },
  'Closed':            { bg: '#e9eef2', fg: '#647680' }
};

let appointments = [];
let doctors = [];
let adminActiveTab = 'All';
let currentSection = 'appointments';

/* ============================= BOOTSTRAP / AUTH ============================= */

function toast(msg, type = ''){
  const stack = document.getElementById('toastStack');
  if(!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`.trim();
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function isCurrentUserAdmin(){
  const { data, error } = await supabase.from('admin_users').select('user_id').maybeSingle();
  if(error){
    // RLS denies the row for non-admins, which surfaces as either an empty
    // result or (depending on policy) a permission error — either way,
    // treat it as "not an admin" rather than crashing.
    return false;
  }
  return !!data;
}

async function boot(){
  if(warnIfNotConfigured()){
    loginView.innerHTML = `<div class="admin-login-card">
      <h2>Not configured</h2>
      <p class="sub">This site isn't connected to Supabase yet. Copy <code>js/config.example.js</code> to <code>js/config.js</code> and fill in your project URL and anon key.</p>
    </div>`;
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if(session){
    const admin = await isCurrentUserAdmin();
    if(admin){
      showDashboard(session);
      return;
    }
    // Signed in but not an admin — sign them out so they don't sit in a
    // half-authenticated state, and explain why.
    await supabase.auth.signOut();
    loginError.innerHTML = `<div class="form-banner error">That account isn't set up as a CHIC admin. Contact the project owner.</div>`;
  }
  showLogin();
}

function showLogin(){
  loginView.style.display = 'flex';
  dashboardView.style.display = 'none';
}

async function showDashboard(session){
  loginView.style.display = 'none';
  dashboardView.style.display = 'block';
  loggedInAs.textContent = session.user.email;
  await Promise.all([loadAppointments(), loadDoctors()]);
  renderAppointments();
  renderDoctors();
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  loginError.innerHTML = '';
  if(!email || !password){
    loginError.innerHTML = `<div class="form-banner error">Please enter both email and password.</div>`;
    return;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){
    loginError.innerHTML = `<div class="form-banner error">${escapeHtml(error.message)}</div>`;
    return;
  }
  const admin = await isCurrentUserAdmin();
  if(!admin){
    await supabase.auth.signOut();
    loginError.innerHTML = `<div class="form-banner error">That account isn't set up as a CHIC admin. Contact the project owner.</div>`;
    return;
  }
  showDashboard(data.session);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
});

document.querySelectorAll('.admin-section-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-section-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSection = tab.dataset.section;
    document.getElementById('appointmentsSection').style.display = currentSection === 'appointments' ? '' : 'none';
    document.getElementById('doctorsSection').style.display = currentSection === 'doctors' ? '' : 'none';
  });
});

function escapeHtml(str){
  if(str == null) return '';
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/* ============================= APPOINTMENTS ============================= */

async function loadAppointments(){
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false });
  if(error){
    console.error(error);
    toast('Could not load appointments', 'error');
    return;
  }
  appointments = data || [];
}

function callIconSvg(){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>'; }
function waIconSvg(){ return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.7.44 3.36 1.28 4.83L2 22l5.4-1.42a9.87 9.87 0 004.64 1.18h.01c5.46 0 9.9-4.45 9.9-9.9C21.96 6.45 17.5 2 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.13.11-1.82-.12-.42-.13-.96-.32-1.65-.62-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.17-1.56-1.17-2.97s.73-2.1.99-2.39c.26-.28.57-.35.76-.35h.55c.18 0 .42-.03.65.5.24.56.82 1.94.9 2.08.07.15.12.32.02.51-.09.19-.14.31-.27.47-.14.17-.29.37-.41.5-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.86-1.06.18-.28.36-.23.6-.14.24.09 1.53.72 1.79.85.26.13.44.19.5.3.06.11.06.61-.18 1.29z"/></svg>'; }

function renderAdminSummary(){
  const summary = document.getElementById('adminSummary');
  summary.innerHTML = STATUS_FLOW.map(s => {
    const count = appointments.filter(r => r.status === s).length;
    return `<div class="admin-stat"><div class="admin-stat-num">${count}</div><div class="admin-stat-label">${s}</div></div>`;
  }).join('');
}

function renderAdminTabs(){
  const tabs = document.getElementById('adminTabs');
  const allTabs = ['All', ...STATUS_FLOW];
  tabs.innerHTML = allTabs.map(t => {
    const count = t === 'All' ? appointments.length : appointments.filter(r => r.status === t).length;
    return `<span class="admin-tab ${t===adminActiveTab?'active':''}" data-tab="${t}">${t} (${count})</span>`;
  }).join('');
  tabs.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => { adminActiveTab = tab.dataset.tab; renderAppointments(); });
  });
}

function renderAdminQueue(){
  const queueEl = document.getElementById('adminQueue');
  const rows = adminActiveTab === 'All' ? appointments : appointments.filter(r => r.status === adminActiveTab);
  if(!rows.length){
    queueEl.innerHTML = '<div class="queue-empty">No appointment requests in this status.</div>';
    return;
  }
  queueEl.innerHTML = rows.map(r => {
    const sc = STATUS_STYLE[r.status] || STATUS_STYLE['Request Received'];
    const waMsg = encodeURIComponent(`Hello ${r.patient_name}, this is CHIC Connect (Chennai Hospitals Information Centre) following up on your appointment request (${r.reference_number}) with ${r.doctor_name}. Please let us know a convenient time to call you.`);
    const waNumber = (r.patient_phone || '').replace(/[^0-9]/g, '');
    const statusOptions = STATUS_FLOW.map(s => `<option value="${s}" ${s===r.status?'selected':''}>${s}</option>`).join('');
    return `
      <div class="queue-row" data-id="${r.id}">
        <div class="queue-patient"><strong>${escapeHtml(r.patient_name)}</strong><span>${r.reference_number}</span></div>
        <div class="queue-note">${escapeHtml(r.doctor_name)} · ${escapeHtml(r.specialty)}${r.preferred_date ? ` · ${r.preferred_date} ${r.preferred_time||''}` : ''}</div>
        <span class="status-pill" style="background:${sc.bg};color:${sc.fg};">${r.status}</span>
        <div class="queue-actions">
          <a class="qa-btn call" href="tel:${(r.patient_phone||'').replace(/\s/g,'')}">${callIconSvg()} Call</a>
          <a class="qa-btn whatsapp" href="https://wa.me/${waNumber}?text=${waMsg}" target="_blank" rel="noopener">${waIconSvg()} WhatsApp</a>
          <button class="qa-btn" data-detail-id="${r.id}">Details</button>
          <button class="qa-btn" data-print-id="${r.id}">Print</button>
          <select class="appt-status-select" data-status-id="${r.id}">${statusOptions}</select>
        </div>
      </div>
    `;
  }).join('');

  queueEl.querySelectorAll('[data-status-id]').forEach(sel => {
    sel.addEventListener('change', () => updateAppointmentStatus(sel.dataset.statusId, sel.value));
  });
  queueEl.querySelectorAll('[data-print-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rec = appointments.find(r => r.id === btn.dataset.printId);
      if(rec) printAppointmentSlip(rec);
    });
  });
  queueEl.querySelectorAll('[data-detail-id]').forEach(btn => {
    btn.addEventListener('click', () => openApptDetail(btn.dataset.detailId));
  });
}

function renderAppointments(){
  renderAdminSummary();
  renderAdminTabs();
  renderAdminQueue();
}

async function updateAppointmentStatus(id, status){
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if(error){
    console.error(error);
    toast('Could not update status: ' + error.message, 'error');
    await loadAppointments();
    renderAppointments();
    return;
  }
  const rec = appointments.find(r => r.id === id);
  if(rec) rec.status = status;
  toast('Status updated to "' + status + '"', 'success');
  renderAppointments();
}

function openApptDetail(id){
  const rec = appointments.find(r => r.id === id);
  if(!rec) return;
  const modal = document.getElementById('apptDetailModal');
  document.getElementById('apptDetailBody').innerHTML = `
    <div class="modal-eyebrow">Appointment ${rec.reference_number}</div>
    <h3>${escapeHtml(rec.patient_name)}</h3>
    <div class="review-row"><span>Status</span><span>${rec.status}</span></div>
    <div class="review-row"><span>Doctor</span><span>${escapeHtml(rec.doctor_name)}</span></div>
    <div class="review-row"><span>Specialty</span><span>${escapeHtml(rec.specialty)}</span></div>
    <div class="review-row"><span>Preferred Date</span><span>${rec.preferred_date || '—'}</span></div>
    <div class="review-row"><span>Preferred Time</span><span>${rec.preferred_time || '—'}</span></div>
    <div class="review-row"><span>Phone</span><span>${escapeHtml(rec.patient_phone)}</span></div>
    ${rec.patient_email ? `<div class="review-row"><span>Email</span><span>${escapeHtml(rec.patient_email)}</span></div>` : ''}
    <div class="review-row"><span>Age / Gender</span><span>${rec.patient_age || '—'} / ${rec.patient_gender || '—'}</span></div>
    <div class="review-row"><span>Patient Type</span><span>${rec.patient_type || '—'}</span></div>
    <div class="review-row"><span>Contact Preference</span><span>${rec.contact_preference || '—'}</span></div>
    <div class="review-row"><span>Email Notification</span><span>${rec.email_sent ? 'Sent' : (rec.email_error ? 'Failed — ' + escapeHtml(rec.email_error) : 'Pending')}</span></div>
    <div class="review-row"><span>Submitted</span><span>${new Date(rec.created_at).toLocaleString('en-IN')}</span></div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="apptDetailCloseBtn">Close</button>
      <button class="btn btn-primary" id="apptDetailPrintBtn">Print</button>
    </div>
  `;
  document.getElementById('apptDetailCloseBtn').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('apptDetailPrintBtn').addEventListener('click', () => printAppointmentSlip(rec));
  modal.classList.add('open');
}

document.getElementById('apptDetailClose').addEventListener('click', () => document.getElementById('apptDetailModal').classList.remove('open'));
document.getElementById('apptDetailModal').addEventListener('click', (e) => { if(e.target.id === 'apptDetailModal') e.currentTarget.classList.remove('open'); });

/* ============================= DOCTORS ============================= */

async function loadDoctors(){
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if(error){
    console.error(error);
    toast('Could not load doctors', 'error');
    return;
  }
  doctors = data || [];
}

function renderDoctors(){
  const list = document.getElementById('adminDocList');
  if(!doctors.length){
    list.innerHTML = '<div class="queue-empty">No doctors yet. Click "+ Add Doctor" to create the first one.</div>';
    return;
  }
  list.innerHTML = doctors.map(d => `
    <div class="admin-doc-row ${d.active ? '' : 'inactive'}">
      <div class="doc-avatar" style="width:44px;height:44px;background:var(--bg);color:var(--navy);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="9" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg></div>
      <div class="admin-doc-info">
        <strong>${escapeHtml(d.name)}</strong>
        <span>${escapeHtml(d.specialty)} · ${escapeHtml(d.doctor_type)} · ${escapeHtml(d.hospital)}</span>
        <span>${escapeHtml(d.email)}${d.active ? '' : ' · Inactive'}</span>
      </div>
      <div class="admin-doc-actions">
        <button class="qa-btn" data-edit-id="${d.id}">Edit</button>
        <button class="qa-btn" data-toggle-id="${d.id}">${d.active ? 'Deactivate' : 'Activate'}</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => openDoctorForm(doctors.find(d => d.id === btn.dataset.editId)));
  });
  list.querySelectorAll('[data-toggle-id]').forEach(btn => {
    btn.addEventListener('click', () => toggleDoctorActive(btn.dataset.toggleId));
  });
}

async function toggleDoctorActive(id){
  const doc = doctors.find(d => d.id === id);
  if(!doc) return;
  const { error } = await supabase.from('doctors').update({ active: !doc.active }).eq('id', id);
  if(error){ toast('Could not update doctor: ' + error.message, 'error'); return; }
  doc.active = !doc.active;
  renderDoctors();
  toast(doc.active ? 'Doctor activated — now visible on the public site.' : 'Doctor deactivated — hidden from the public site.', 'success');
}

const doctorFormModal = document.getElementById('doctorFormModal');
document.getElementById('doctorFormClose').addEventListener('click', () => doctorFormModal.classList.remove('open'));
doctorFormModal.addEventListener('click', (e) => { if(e.target === doctorFormModal) doctorFormModal.classList.remove('open'); });

document.getElementById('addDoctorBtn').addEventListener('click', () => openDoctorForm(null));

function openDoctorForm(doc){
  const isEdit = !!doc;
  const d = doc || { name:'', telugu_name:'', specialty:'', qualification:'', doctor_type:'Visiting Chennai Specialist', hospital:'', email:'', phone:'', bio:'', active:true, display_order:0 };
  const specialtyOptions = KNOWN_SPECIALTIES.map(s => `<option value="${s}">${s}</option>`).join('');

  document.getElementById('doctorFormBody').innerHTML = `
    <div class="modal-eyebrow">${isEdit ? 'Edit Doctor' : 'Add Doctor'}</div>
    <h3>${isEdit ? escapeHtml(d.name) : 'New doctor'}</h3>
    <div id="doctorFormError"></div>
    <div class="doc-form-grid">
      <div class="modal-field full"><label>Full Name *</label><input type="text" id="dfName" value="${escapeHtml(d.name)}"></div>
      <div class="modal-field"><label>Telugu name (optional)</label><input type="text" id="dfTelugu" value="${escapeHtml(d.telugu_name || '')}"></div>
      <div class="modal-field">
        <label>Specialty *</label>
        <input type="text" id="dfSpecialty" list="specialtyList" value="${escapeHtml(d.specialty)}">
        <datalist id="specialtyList">${specialtyOptions}</datalist>
      </div>
      <div class="modal-field full"><label>Qualification *</label><input type="text" id="dfQual" value="${escapeHtml(d.qualification)}"></div>
      <div class="modal-field">
        <label>Doctor Type *</label>
        <select id="dfType">
          <option value="Visiting Chennai Specialist" ${d.doctor_type==='Visiting Chennai Specialist'?'selected':''}>Visiting Chennai Specialist</option>
          <option value="Local Doctor" ${d.doctor_type==='Local Doctor'?'selected':''}>Local Doctor</option>
        </select>
      </div>
      <div class="modal-field"><label>Hospital / Clinic *</label><input type="text" id="dfHospital" value="${escapeHtml(d.hospital)}"></div>
      <div class="modal-field"><label>Email *</label><input type="email" id="dfEmail" value="${escapeHtml(d.email)}"></div>
      <div class="modal-field"><label>Phone (optional)</label><input type="text" id="dfPhone" value="${escapeHtml(d.phone || '')}"></div>
      <div class="modal-field full"><label>Bio / details (optional)</label><textarea class="modal-field-textarea" id="dfBio">${escapeHtml(d.bio || '')}</textarea></div>
      <div class="modal-field"><label>Display order</label><input type="number" id="dfOrder" value="${d.display_order || 0}"></div>
      <div class="modal-field"><label>Active on public site</label>
        <select id="dfActive"><option value="true" ${d.active?'selected':''}>Active</option><option value="false" ${!d.active?'selected':''}>Inactive</option></select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="dfCancelBtn">Cancel</button>
      <button class="btn btn-primary" id="dfSaveBtn">${isEdit ? 'Save Changes' : 'Add Doctor'}</button>
    </div>
  `;
  document.getElementById('dfCancelBtn').addEventListener('click', () => doctorFormModal.classList.remove('open'));
  document.getElementById('dfSaveBtn').addEventListener('click', () => saveDoctorForm(isEdit ? d.id : null));
  doctorFormModal.classList.add('open');
}

async function saveDoctorForm(existingId){
  const errorBox = document.getElementById('doctorFormError');
  errorBox.innerHTML = '';
  const payload = {
    name: document.getElementById('dfName').value.trim(),
    telugu_name: document.getElementById('dfTelugu').value.trim() || null,
    specialty: document.getElementById('dfSpecialty').value.trim(),
    qualification: document.getElementById('dfQual').value.trim(),
    doctor_type: document.getElementById('dfType').value,
    hospital: document.getElementById('dfHospital').value.trim(),
    email: document.getElementById('dfEmail').value.trim(),
    phone: document.getElementById('dfPhone').value.trim() || null,
    bio: document.getElementById('dfBio').value.trim() || null,
    display_order: parseInt(document.getElementById('dfOrder').value, 10) || 0,
    active: document.getElementById('dfActive').value === 'true'
  };

  if(!payload.name || !payload.specialty || !payload.qualification || !payload.hospital || !payload.email){
    errorBox.innerHTML = `<div class="form-banner error">Please fill in all required fields (marked *).</div>`;
    return;
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)){
    errorBox.innerHTML = `<div class="form-banner error">Please enter a valid email address.</div>`;
    return;
  }

  const saveBtn = document.getElementById('dfSaveBtn');
  saveBtn.disabled = true; saveBtn.classList.add('is-loading');

  const query = existingId
    ? supabase.from('doctors').update(payload).eq('id', existingId)
    : supabase.from('doctors').insert(payload);
  const { error } = await query;

  saveBtn.disabled = false; saveBtn.classList.remove('is-loading');

  if(error){
    errorBox.innerHTML = `<div class="form-banner error">${escapeHtml(error.message)}</div>`;
    return;
  }

  doctorFormModal.classList.remove('open');
  toast(existingId ? 'Doctor updated.' : 'Doctor added — now visible on the public site if marked active.', 'success');
  await loadDoctors();
  renderDoctors();
}

/* ============================= GO ============================= */
boot();
