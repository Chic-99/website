import { DOCTORS_BY_ID } from './doctors.js';
import { styleForSpecialty } from './specialty-styles.js';

const modal = document.getElementById('profileModal');
const body = document.getElementById('profileModalBody');

function closeModal(){ modal.classList.remove('open'); }

function render(doc){
  const style = styleForSpecialty(doc.specialty);
  body.innerHTML = `
    <div class="profile-head">
      <div class="doc-avatar" style="background:${style.avatarBg};color:${style.avatarColor};">${style.svg}</div>
      <div>
        <div class="doc-name" style="font-size:19px;">${doc.name}</div>
        ${doc.telugu_name ? `<div class="doc-telugu">${doc.telugu_name}</div>` : ''}
        <span class="doc-type ${doc.doctor_type === 'Local Doctor' ? 'local' : 'visiting'}">${doc.doctor_type}</span>
      </div>
    </div>
    <div class="review-row"><span>Specialty</span><span>${doc.specialty}</span></div>
    <div class="review-row"><span>Qualification</span><span>${doc.qualification}</span></div>
    <div class="review-row"><span>Hospital / Clinic</span><span>${doc.hospital}</span></div>
    ${doc.phone ? `<div class="review-row"><span>Phone</span><span>${doc.phone}</span></div>` : ''}
    ${doc.bio ? `<p style="color:var(--muted);font-size:13.5px;margin-top:18px;line-height:1.6;">${doc.bio}</p>` : ''}
    <div class="modal-actions">
      <button class="btn btn-outline" id="profileCloseBtn">Close</button>
      <button class="btn btn-primary" id="profileBookBtn">Book Appointment</button>
    </div>
  `;
  document.getElementById('profileCloseBtn').addEventListener('click', closeModal);
  document.getElementById('profileBookBtn').addEventListener('click', () => {
    closeModal();
    window.dispatchEvent(new CustomEvent('chic:open-booking', { detail: { doctorId: doc.id } }));
  });
}

export function initProfileModal(){
  document.getElementById('profileModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
  window.addEventListener('chic:view-profile', (e) => {
    const doc = DOCTORS_BY_ID.get(e.detail.id);
    if(!doc) return;
    render(doc);
    modal.classList.add('open');
  });
}
