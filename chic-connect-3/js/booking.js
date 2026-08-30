import { supabase, warnIfNotConfigured } from './supabase-client.js';
import { DOCTORS_BY_ID, onDoctorsReady } from './doctors.js';
import { printAppointmentSlip } from './print-slip.js';

const modal = document.getElementById('bookingModal');
const modalBody = document.getElementById('modalBody');
const dots = document.querySelectorAll('.step-dot');

let bookingState = emptyState();
let allDoctors = [];

function emptyState(){
  return { doctorId:'', doctorName:'', specialty:'', date:'', time:'', name:'', phone:'', email:'', age:'', gender:'', contactPref:'Phone Call', patientType:'New Patient' };
}

onDoctorsReady((docs) => { allDoctors = docs; });

function setDots(step){ dots.forEach((d,i) => d.classList.toggle('done', i < step)); }

export function openBookingModal(prefillDoctorId){
  if(warnIfNotConfigured()){
    alert("Booking isn't available yet — this site hasn't been connected to Supabase. Please call CHIC directly to book.");
    return;
  }
  bookingState = emptyState();
  if(prefillDoctorId){
    const doc = DOCTORS_BY_ID.get(prefillDoctorId) || allDoctors.find(d => d.id === prefillDoctorId);
    if(doc){ bookingState.doctorId = doc.id; bookingState.doctorName = doc.name; bookingState.specialty = doc.specialty; }
  }
  modal.classList.add('open');
  renderStep1();
}
function closeModal(){ modal.classList.remove('open'); }

function currentDoctorList(){
  return allDoctors.length ? allDoctors : [...DOCTORS_BY_ID.values()];
}
function specialtiesList(){
  return [...new Set(currentDoctorList().map(d => d.specialty))];
}
function doctorOptionsFor(specialty){
  return currentDoctorList().filter(d => specialty === 'All' || d.specialty === specialty);
}

function renderStep1(){
  setDots(1);
  const specialties = specialtiesList();
  const specOptions = specialties.map(s => `<option value="${s}" ${bookingState.specialty===s?'selected':''}>${s}</option>`).join('');
  modalBody.innerHTML = `
    <div class="modal-eyebrow">Step 01 · Specialist</div>
    <h3>Choose a specialty &amp; doctor</h3>
    <div class="modal-field">
      <label>Specialty</label>
      <select id="specSelect"><option value="">Select specialty</option>${specOptions}</select>
    </div>
    <div class="modal-field">
      <label>Doctor</label>
      <select id="docSelect"><option value="">Select specialty first</option></select>
    </div>
    <div class="modal-actions">
      <div></div>
      <button class="btn btn-primary" id="toStep2">Continue</button>
    </div>
  `;
  const specSelect = document.getElementById('specSelect');
  const docSelect = document.getElementById('docSelect');
  function populateDocs(){
    const val = specSelect.value;
    const opts = val ? doctorOptionsFor(val) : [];
    docSelect.innerHTML = opts.length
      ? opts.map(d => `<option value="${d.id}" ${bookingState.doctorId===d.id?'selected':''}>${d.name}</option>`).join('')
      : '<option value="">Select specialty first</option>';
  }
  specSelect.addEventListener('change', () => { bookingState.specialty = specSelect.value; bookingState.doctorId=''; populateDocs(); });
  if(bookingState.specialty) populateDocs();
  docSelect.addEventListener('change', () => {
    bookingState.doctorId = docSelect.value;
    const doc = currentDoctorList().find(d => d.id === docSelect.value);
    bookingState.doctorName = doc ? doc.name : '';
  });
  document.getElementById('toStep2').addEventListener('click', () => {
    if(!specSelect.value || !docSelect.value){ alert('Please select a specialty and doctor to continue.'); return; }
    bookingState.specialty = specSelect.value;
    bookingState.doctorId = docSelect.value;
    const doc = currentDoctorList().find(d => d.id === docSelect.value);
    bookingState.doctorName = doc ? doc.name : '';
    renderStep2();
  });
}

function renderStep2(){
  setDots(2);
  modalBody.innerHTML = `
    <div class="modal-eyebrow">Step 02 · Date &amp; Time</div>
    <h3>${bookingState.doctorName}</h3>
    <div class="empty-state" style="margin-bottom:20px;">
      <p>No confirmed visiting dates are published for this doctor yet. Choose your preferred date and time below — CHIC staff will contact you directly to confirm timing.</p>
    </div>
    <div class="modal-field">
      <label>Preferred date (subject to CHIC confirmation)</label>
      <input type="date" id="dateInput" value="${bookingState.date}" min="${new Date().toISOString().slice(0,10)}">
    </div>
    <div class="modal-field">
      <label>Preferred time</label>
      <div class="slot-grid" id="slotGrid">
        ${['10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM'].map(t=>`<div class="slot-btn ${bookingState.time===t?'selected':''}" data-slot="${t}">${t}</div>`).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="backStep1">Back</button>
      <button class="btn btn-primary" id="toStep3">Continue</button>
    </div>
  `;
  document.getElementById('dateInput').addEventListener('change', e => bookingState.date = e.target.value);
  document.querySelectorAll('#slotGrid .slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#slotGrid .slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      bookingState.time = btn.dataset.slot;
    });
  });
  document.getElementById('backStep1').addEventListener('click', renderStep1);
  document.getElementById('toStep3').addEventListener('click', () => {
    if(!bookingState.date || !bookingState.time){ alert('Please choose a preferred date and time.'); return; }
    renderStep3();
  });
}

function renderStep3(){
  setDots(3);
  modalBody.innerHTML = `
    <div class="modal-eyebrow">Step 03 · Patient Details</div>
    <h3>Your details</h3>
    <div class="modal-field"><label>Full Name</label><input type="text" id="pName" value="${bookingState.name}"></div>
    <div class="modal-field"><label>Phone</label><input type="tel" id="pPhone" value="${bookingState.phone}"></div>
    <div class="modal-field"><label>Email (optional — get a confirmation copy)</label><input type="email" id="pEmail" value="${bookingState.email || ''}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div class="modal-field"><label>Age</label><input type="number" min="0" max="120" id="pAge" value="${bookingState.age}"></div>
      <div class="modal-field">
        <label>Gender</label>
        <select id="pGender">
          <option value="">Select</option>
          <option value="Female" ${bookingState.gender==='Female'?'selected':''}>Female</option>
          <option value="Male" ${bookingState.gender==='Male'?'selected':''}>Male</option>
          <option value="Other" ${bookingState.gender==='Other'?'selected':''}>Other</option>
        </select>
      </div>
    </div>
    <div class="modal-field">
      <label>Patient Type</label>
      <select id="pType">
        <option value="New Patient" ${bookingState.patientType==='New Patient'?'selected':''}>New Patient</option>
        <option value="Existing Patient" ${bookingState.patientType==='Existing Patient'?'selected':''}>Existing Patient</option>
      </select>
    </div>
    <div class="modal-field">
      <label>Preferred Contact Method</label>
      <select id="pContactPref">
        <option value="Phone Call" ${bookingState.contactPref==='Phone Call'?'selected':''}>Phone Call</option>
        <option value="WhatsApp" ${bookingState.contactPref==='WhatsApp'?'selected':''}>WhatsApp</option>
        <option value="SMS" ${bookingState.contactPref==='SMS'?'selected':''}>SMS</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="backStep2">Back</button>
      <button class="btn btn-primary" id="toStep4">Review</button>
    </div>
  `;
  document.getElementById('backStep2').addEventListener('click', renderStep2);
  document.getElementById('toStep4').addEventListener('click', () => {
    const name = document.getElementById('pName').value.trim();
    const phone = document.getElementById('pPhone').value.trim();
    const email = document.getElementById('pEmail').value.trim();
    if(!name || !phone){ alert('Please enter your name and phone number.'); return; }
    if(!/^[0-9+\-\s]{7,15}$/.test(phone)){ alert('Please enter a valid phone number.'); return; }
    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ alert('Please enter a valid email address, or leave it blank.'); return; }
    bookingState.name = name;
    bookingState.phone = phone;
    bookingState.email = email;
    bookingState.age = document.getElementById('pAge').value.trim();
    bookingState.gender = document.getElementById('pGender').value;
    bookingState.patientType = document.getElementById('pType').value;
    bookingState.contactPref = document.getElementById('pContactPref').value;
    renderStep4();
  });
}

function renderStep4(){
  setDots(4);
  modalBody.innerHTML = `
    <div class="modal-eyebrow">Step 04 · Review</div>
    <h3>Confirm your request</h3>
    <div class="review-row"><span>Doctor</span><span>${bookingState.doctorName}</span></div>
    <div class="review-row"><span>Specialty</span><span>${bookingState.specialty}</span></div>
    <div class="review-row"><span>Date</span><span>${bookingState.date}</span></div>
    <div class="review-row"><span>Time</span><span>${bookingState.time}</span></div>
    <div class="review-row"><span>Patient</span><span>${bookingState.name}</span></div>
    <div class="review-row"><span>Age / Gender</span><span>${bookingState.age || '—'} / ${bookingState.gender || '—'}</span></div>
    <div class="review-row"><span>Phone</span><span>${bookingState.phone}</span></div>
    ${bookingState.email ? `<div class="review-row"><span>Email</span><span>${bookingState.email}</span></div>` : ''}
    <div class="review-row"><span>Patient Type</span><span>${bookingState.patientType}</span></div>
    <div class="review-row"><span>Contact Preference</span><span>${bookingState.contactPref}</span></div>
    <div id="submitError"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="backStep3">Edit</button>
      <button class="btn btn-primary" id="toConfirm">Confirm Appointment Request</button>
    </div>
  `;
  document.getElementById('backStep3').addEventListener('click', renderStep3);
  document.getElementById('toConfirm').addEventListener('click', submitAppointment);
}

async function submitAppointment(){
  const btn = document.getElementById('toConfirm');
  const errorBox = document.getElementById('submitError');
  errorBox.innerHTML = '';
  btn.disabled = true; btn.classList.add('is-loading'); btn.textContent = 'Submitting…';

  const { data: rpcData, error } = await supabase.rpc('create_appointment', {
    p_doctor_id: bookingState.doctorId || null,
    p_doctor_name: bookingState.doctorName,
    p_specialty: bookingState.specialty,
    p_preferred_date: bookingState.date,
    p_preferred_time: bookingState.time,
    p_patient_name: bookingState.name,
    p_patient_phone: bookingState.phone,
    p_patient_email: bookingState.email || null,
    p_patient_age: bookingState.age ? parseInt(bookingState.age, 10) : null,
    p_patient_gender: bookingState.gender || null,
    p_contact_preference: bookingState.contactPref,
    p_patient_type: bookingState.patientType
  });
  // create_appointment returns a table (i.e. an array with one row)
  const data = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  if(error){
    console.error('Appointment insert failed:', error);
    btn.disabled = false; btn.classList.remove('is-loading'); btn.textContent = 'Confirm Appointment Request';
    errorBox.innerHTML = `<div class="form-banner error">Something went wrong submitting your request (${escapeMsg(error.message)}). Please try again, or call CHIC directly at 93999 99951.</div>`;
    return;
  }

  // Fire the email notification. If this fails, the appointment itself is
  // already safely saved above — we never lose the request over an email
  // problem. We just let the patient know staff may take slightly longer
  // to see it, since the automatic alert didn't go through.
  let emailFailed = false;
  try{
    const { error: fnError } = await supabase.functions.invoke('send-appointment-email', {
      body: { appointmentId: data.id }
    });
    if(fnError) emailFailed = true;
  } catch(e){
    emailFailed = true;
    console.error('Email notification failed:', e);
  }

  renderConfirmation(data, emailFailed);
}

function escapeMsg(msg){
  return String(msg || '').replace(/</g, '&lt;');
}

function renderConfirmation(record, emailFailed){
  modalBody.innerHTML = `
    <div class="confirm-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg></div>
    <h3>Appointment request received</h3>
    <p style="color:var(--muted);font-size:13.5px;margin-bottom:20px;">Reference: <strong style="color:var(--navy);">${record.reference_number}</strong></p>
    <div class="review-row"><span>Doctor</span><span>${record.doctor_name}</span></div>
    <div class="review-row"><span>Date</span><span>${record.preferred_date} · ${record.preferred_time}</span></div>
    <div class="review-row"><span>Status</span><span>${record.status}</span></div>
    <p style="color:var(--muted);font-size:12.5px;margin:14px 0 4px;">Submitting a request does not automatically confirm it — only the CHIC team can mark an appointment as confirmed. Need it sooner? Call us directly:</p>
    ${bookingState.email ? `<p style="color:var(--muted);font-size:12.5px;">A copy of this confirmation is also being sent to <strong>${bookingState.email}</strong>.</p>` : ''}
    ${emailFailed ? `<div class="form-banner error" style="margin-top:10px;">Your request is safely saved, but our automatic staff alert didn't go through. If you don't hear back soon, please call us.</div>` : ''}
    <div class="contact-phones" style="border-bottom:none;margin-top:10px;">
      <a href="tel:+919399999951" class="cphone">
        <span class="cp-left"><span class="cp-tag">Appointments</span><span class="cp-num">93999 99951</span></span>
        <span class="cp-call">Call</span>
      </a>
      <a href="tel:+919399999990" class="cphone">
        <span class="cp-left"><span class="cp-tag">24/7 Helpline</span><span class="cp-num">93999 99990</span></span>
        <span class="cp-call">Call</span>
      </a>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="closeConfirm">Close</button>
      <button class="btn btn-primary" id="printConfirm">Print Appointment Summary</button>
    </div>
  `;
  document.getElementById('closeConfirm').addEventListener('click', closeModal);
  document.getElementById('printConfirm').addEventListener('click', () => printAppointmentSlip({
    ref: record.reference_number,
    status: record.status,
    doctor_name: record.doctor_name,
    specialty: record.specialty,
    preferred_date: record.preferred_date,
    preferred_time: record.preferred_time,
    created_at: record.created_at,
    // create_appointment() only returns a few summary fields (not patient
    // details, to keep the security-definer function's return surface
    // minimal) — so pull the patient fields from the form state instead,
    // which is the same data the patient just typed in.
    patient_name: bookingState.name,
    patient_phone: bookingState.phone,
    patient_age: bookingState.age,
    patient_gender: bookingState.gender,
    patient_type: bookingState.patientType,
    contact_preference: bookingState.contactPref
  }));
}

export function initBookingModal(){
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

  // Static "Book Appointment" triggers that exist outside doctor cards
  // (nav bar, hero, quick-access grid, final CTA).
  document.querySelectorAll('.book-trigger').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); openBookingModal(null); });
  });

  // Dynamic doctor-card "Book Appointment" buttons dispatch this event
  // (see js/doctors.js) since those cards don't exist yet at page load.
  window.addEventListener('chic:open-booking', (e) => openBookingModal(e.detail.doctorId));
}
