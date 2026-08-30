const SERVICES = {
  'specialist-consultations': {
    title: 'Specialist Consultations',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 2v20M2 12h20"/></svg>',
    summary: 'Meet visiting Chennai specialists during their scheduled Nellore visits.',
    points: [
      'Visiting specialists travel from Chennai hospitals to Nellore on published schedules.',
      'CHIC coordinates the appointment request and shares confirmed visit dates as they are finalised.',
      'Bring any earlier prescriptions, scans, or lab reports relevant to your condition.',
      'Consultation fees and any advance booking requirements are confirmed by the CHIC team when your date is set.'
    ]
  },
  'local-doctor-consultations': {
    title: 'Local Doctor Consultations',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg>',
    summary: 'Access trusted general and family physicians based in Nellore.',
    points: [
      'Local doctors are available for day-to-day and ongoing care without travelling to Chennai.',
      'Useful for general check-ups, chronic condition follow-up, and first opinions before a specialist referral.',
      'Walk-in and appointment options may both be available depending on the doctor — CHIC can confirm which applies.'
    ]
  },
  'diagnostic-laboratory': {
    title: 'Diagnostic & Laboratory',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M9 3h6l1 4H8l1-4z"/><path d="M6 7h12l1 13H5L6 7z"/></svg>',
    summary: 'Complete required investigations as part of your consultation plan.',
    points: [
      'Lab tests and diagnostic scans ordered by your doctor can be coordinated locally in Nellore where possible.',
      'For advanced imaging or specialised tests unavailable locally, CHIC can help direct you to the appropriate Chennai facility.',
      'Reports are typically shared directly with your treating doctor to keep your care plan on track.'
    ]
  },
  'pharmacy-medical-shop': {
    title: 'Pharmacy / Medical Shop',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><rect x="4" y="7" width="16" height="13" rx="1"/><path d="M9 7V5a3 3 0 016 0v2"/></svg>',
    summary: 'Access medicines conveniently as part of your treatment plan.',
    points: [
      'Prescribed medicines can be sourced locally so you don\u2019t need a separate trip for every refill.',
      'CHIC can help confirm availability of specific brands or alternatives suggested by your doctor.',
      'Keep your prescription handy — pharmacy staff may need to verify dosage before dispensing certain medicines.'
    ]
  },
  'chennai-hospital-coordination': {
    title: 'Chennai Hospital Coordination',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    summary: 'When advanced care is needed, CHIC helps coordinate the next step.',
    points: [
      'For conditions that need specialised hospital-level care, CHIC helps you understand the next steps in Chennai.',
      'This includes helping you reach the right department and sharing relevant background before your visit.',
      'CHIC stays a local point of contact throughout, even once you are being seen in Chennai.'
    ]
  },
  'physiotherapy-rehabilitation': {
    title: 'Physiotherapy & Rehabilitation',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M6 20V10M12 20V4M18 20v-7"/></svg>',
    summary: 'Local rehabilitation support to continue your recovery.',
    points: [
      'Post-surgical, injury, and mobility-related rehabilitation support is available locally in Nellore.',
      'Sessions can be planned around a treatment schedule recommended by your specialist.',
      'CHIC can help coordinate progress updates back to your treating doctor when relevant.'
    ]
  },
  'nursing-support': {
    title: 'Nursing Support',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z"/></svg>',
    summary: 'Coordinated nursing assistance as part of your care journey.',
    points: [
      'Nursing support can be arranged for post-procedure care, elderly care, or ongoing home-based needs.',
      'CHIC helps match the level of support required with available local nursing resources.',
      'Speak with the CHIC team about duration, shift timings, and any special care requirements.'
    ]
  },
  'healthcare-guidance': {
    title: 'Healthcare Guidance',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>',
    summary: 'A local team to help you navigate your healthcare options.',
    points: [
      'Not sure which specialist or service you need? CHIC\u2019s local team can help point you in the right direction.',
      'This includes explaining what to expect from a visiting specialist visit versus a local consultation.',
      'General guidance is free of charge — reach out any time via the numbers on this site.'
    ]
  }
};

const modal = document.getElementById('serviceModal');
const body = document.getElementById('serviceModalBody');

function closeModal(){ modal.classList.remove('open'); }

function render(slug){
  const svc = SERVICES[slug];
  if(!svc) return;
  body.innerHTML = `
    <div class="service-detail-icon">${svc.icon}</div>
    <h3>${svc.title}</h3>
    <div class="service-detail-body">
      <p>${svc.summary}</p>
      <ul class="service-detail-list">${svc.points.map(p => `<li>${p}</li>`).join('')}</ul>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="serviceCloseBtn">Close</button>
      <button class="btn btn-primary" id="serviceBookBtn">Book Appointment</button>
    </div>
  `;
  document.getElementById('serviceCloseBtn').addEventListener('click', closeModal);
  document.getElementById('serviceBookBtn').addEventListener('click', () => {
    closeModal();
    window.dispatchEvent(new CustomEvent('chic:open-booking', { detail: { doctorId: null } }));
  });
}

export function initServiceModal(){
  document.getElementById('serviceModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
  document.querySelectorAll('.svc-link[data-service]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      render(link.dataset.service);
      modal.classList.add('open');
    });
  });
}
