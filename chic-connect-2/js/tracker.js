import { supabase, warnIfNotConfigured } from './supabase-client.js';
import { printAppointmentSlip } from './print-slip.js';

export function initTracker(){
  const trackerBtn = document.getElementById('trackerBtn');
  const trackerInput = document.getElementById('trackerInput');
  const trackerResult = document.getElementById('trackerResult');

  async function runTracker(){
    const refRaw = trackerInput.value.trim();
    if(!refRaw){ trackerResult.innerHTML = ''; return; }
    if(warnIfNotConfigured(trackerResult)) return;

    trackerResult.innerHTML = `<p class="state-msg">Looking up your appointment…</p>`;

    // For privacy, tracking requires both the reference AND the phone number
    // used at booking — a reference number alone is not enough to look up
    // someone else's appointment. If the person only typed a reference, ask
    // for the phone number too rather than silently failing.
    const phone = window.prompt('For your privacy, please also enter the phone number used when booking:');
    if(phone === null){ trackerResult.innerHTML = ''; return; }

    const { data, error } = await supabase.rpc('track_appointment', {
      p_reference: refRaw,
      p_phone: phone.trim()
    });

    if(error){
      console.error('Tracker RPC failed:', error);
      trackerResult.innerHTML = `<p class="tracker-empty">Something went wrong looking up your appointment. Please try again or call CHIC directly.</p>`;
      return;
    }

    const found = Array.isArray(data) ? data[0] : data;
    if(!found){
      trackerResult.innerHTML = `<p class="tracker-empty">No appointment found for "${escapeHtml(refRaw)}" with that phone number. Please double-check your reference number and phone number, or call CHIC directly.</p>`;
      return;
    }

    trackerResult.innerHTML = `
      <div class="tracker-result-card">
        <div class="tracker-result-top">
          <div>
            <div class="tracker-ref">${found.reference_number}</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">${found.doctor_name} · ${found.preferred_date} ${found.preferred_time}</div>
          </div>
          <span class="status-pill">${found.status}</span>
        </div>
        <div class="review-row"><span>Patient</span><span>${found.patient_name}</span></div>
        <div class="review-row"><span>Requested</span><span>${new Date(found.created_at).toLocaleString('en-IN')}</span></div>
        <div class="modal-actions" style="margin-top:16px;">
          <button class="btn btn-outline" id="trackerPrintBtn">Print Summary</button>
          <a href="tel:+919399999951" class="btn btn-primary" style="justify-content:center;">Call Appointments Desk</a>
        </div>
      </div>
    `;
    document.getElementById('trackerPrintBtn').addEventListener('click', () => printAppointmentSlip(found));
  }

  trackerBtn.addEventListener('click', (e) => { e.preventDefault(); runTracker(); });
  trackerInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') runTracker(); });
}

function escapeHtml(str){
  return String(str).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
