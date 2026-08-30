const STATUS_COLORS = {
  'Request Received': { bg: '#fdeee0', fg: '#b5590c' },
  'Called':           { bg: '#e9f1fb', fg: '#1565c0' },
  'Scheduled':        { bg: '#eaf4eb', fg: '#2e7d32' },
  'Confirmed':        { bg: '#e6f4f2', fg: '#0b827b' },
  'Closed':           { bg: '#e9eef2', fg: '#647680' }
};

/**
 * record: { ref, status, patient_name, patient_age, patient_gender, patient_phone,
 *           patient_type, contact_preference, doctor_name, specialty, preferred_date,
 *           preferred_time, created_at }
 */
export function printAppointmentSlip(record){
  const sc = STATUS_COLORS[record.status] || STATUS_COLORS['Request Received'];
  const slip = document.getElementById('printSlip');
  if(!slip) return;
  slip.innerHTML = `
    <div class="slip-header">
      <div>
        <div class="slip-org-name">CHIC Connect</div>
        <div class="slip-org-sub">Chennai Hospitals Information Centre · 24-2/395, Saraswathi Nagar, Magunta Layout, opp. Ratnam High School, Nellore – 524003</div>
        <div class="slip-org-sub">Appointments: 93999 99951 &nbsp;·&nbsp; 24/7 Helpline: 93999 99990</div>
      </div>
    </div>
    <div class="slip-meta">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Appointment Reference</div>
        <div class="slip-ref">${record.ref || record.reference_number || '—'}</div>
      </div>
      <span class="slip-status" style="background:${sc.bg};color:${sc.fg};">${record.status || '—'}</span>
    </div>

    <div class="slip-section-title">Patient Details</div>
    <div class="slip-row"><span>Full Name</span><span>${record.patient_name || record.name || '—'}</span></div>
    <div class="slip-row"><span>Age / Gender</span><span>${record.patient_age || '—'} / ${record.patient_gender || '—'}</span></div>
    <div class="slip-row"><span>Phone</span><span>${record.patient_phone || record.phone || '—'}</span></div>
    <div class="slip-row"><span>Patient Type</span><span>${record.patient_type || '—'}</span></div>
    <div class="slip-row"><span>Preferred Contact</span><span>${record.contact_preference || record.contactPref || '—'}</span></div>

    <div class="slip-section-title">Consultation Details</div>
    <div class="slip-row"><span>Doctor</span><span>${record.doctor_name || record.doctor || '—'}</span></div>
    <div class="slip-row"><span>Specialty</span><span>${record.specialty || '—'}</span></div>
    <div class="slip-row"><span>Date</span><span>${record.preferred_date || record.date || '—'}</span></div>
    <div class="slip-row"><span>Time Slot</span><span>${record.preferred_time || record.time || '—'}</span></div>
    <div class="slip-row"><span>Requested On</span><span>${record.created_at ? new Date(record.created_at).toLocaleString('en-IN') : (record.createdAt || '—')}</span></div>

    <div class="slip-section-title">Before You Visit</div>
    <ul class="slip-prep">
      <li>Arrive 15 minutes before your scheduled time slot with a valid photo ID.</li>
      <li>Bring any previous prescriptions, scans, or lab reports relevant to this consultation.</li>
      <li>Visiting Chennai specialist timings depend on their published visit schedule — CHIC will contact you if any change is required.</li>
      <li>For local doctor consultations, walk-in reporting time may vary; please confirm with the CHIC front desk if unsure.</li>
    </ul>

    <p class="slip-disclaimer">This document represents an appointment request and does not constitute confirmation until the CHIC team confirms the appointment.</p>
    <div class="slip-footer">
      <span>CHIC Connect · Nellore, Andhra Pradesh</span>
      <span>Printed ${new Date().toLocaleString('en-IN')}</span>
    </div>
  `;
  window.print();
}
