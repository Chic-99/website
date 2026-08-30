// Supabase Edge Function: send-appointment-email
//
// Triggered by the browser right after a new appointment is inserted
// (see js/booking.js), with body: { appointmentId: "<uuid>" }.
//
// It re-fetches the appointment from the database itself (using the
// service-role key, which only ever lives here on the server) rather than
// trusting whatever the browser sends, then emails CHIC's notification
// address via Resend (https://resend.com).
//
// Required secrets (set with `supabase secrets set ...`, see README):
//   SUPABASE_URL              — auto-provided by the platform
//   SUPABASE_SERVICE_ROLE_KEY — auto-provided by the platform
//   RESEND_API_KEY            — your Resend transactional email API key
//   NOTIFY_EMAIL              — destination address, e.g. chicnlr90@gmail.com
//   NOTIFY_FROM_EMAIL         — a "from" address on a domain verified in Resend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL') || 'chicnlr90@gmail.com';
const NOTIFY_FROM_EMAIL = Deno.env.get('NOTIFY_FROM_EMAIL') || 'onboarding@resend.dev';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function buildEmailHtml(appt: Record<string, any>): string {
  const row = (label: string, value: unknown) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#647680;font-size:13px;">${label}</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#092B43;">${escapeHtml(value ?? '—')}</td></tr>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#092B43;">New CHIC Connect Appointment Request</h2>
      <p style="color:#647680;font-size:13.5px;">Reference: <strong>${escapeHtml(appt.reference_number)}</strong></p>
      <table cellpadding="0" cellspacing="0">
        ${row('Doctor', appt.doctor_name)}
        ${row('Specialty', appt.specialty)}
        ${row('Preferred Date', appt.preferred_date)}
        ${row('Preferred Time', appt.preferred_time)}
        ${row('Patient Name', appt.patient_name)}
        ${row('Patient Phone', appt.patient_phone)}
        ${row('Patient Age', appt.patient_age)}
        ${row('Patient Gender', appt.patient_gender)}
        ${row('Patient Type', appt.patient_type)}
        ${row('Contact Preference', appt.contact_preference)}
        ${row('Submitted At', new Date(appt.created_at).toLocaleString('en-IN'))}
      </table>
      <p style="color:#9fb8c8;font-size:11.5px;margin-top:24px;">This is an automated notification from CHIC Connect. The appointment record remains saved in the database regardless of email delivery.</p>
    </div>
  `;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const payload = await req.json().catch(() => ({}));

    // Accept either a direct client call ({ appointmentId }) or a Supabase
    // Database Webhook payload ({ type: 'INSERT', table: 'appointments', record })
    // so this same function works with either trigger style.
    const appointmentId = payload.appointmentId || payload?.record?.id;
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: 'appointmentId is required' }), { status: 400 });
    }

    const { data: appt, error: fetchError } = await admin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appt) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), { status: 404 });
    }

    if (!RESEND_API_KEY) {
      // Email provider not configured yet. The appointment is already safely
      // saved — we just record that we couldn't notify anyone, and say so
      // clearly rather than pretending it worked.
      await admin.from('appointments').update({
        email_sent: false,
        email_error: 'RESEND_API_KEY secret is not configured'
      }).eq('id', appointmentId);
      return new Response(JSON.stringify({ warning: 'Email provider not configured; appointment saved without notification.' }), { status: 200 });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `CHIC Connect <${NOTIFY_FROM_EMAIL}>`,
        to: [NOTIFY_EMAIL],
        subject: `New Appointment Request — ${appt.reference_number} (${appt.doctor_name})`,
        html: buildEmailHtml(appt)
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      await admin.from('appointments').update({ email_sent: false, email_error: errText.slice(0, 500) }).eq('id', appointmentId);
      return new Response(JSON.stringify({ error: 'Email provider rejected the request', detail: errText }), { status: 502 });
    }

    await admin.from('appointments').update({ email_sent: true, email_error: null }).eq('id', appointmentId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error('send-appointment-email error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), { status: 500 });
  }
});
