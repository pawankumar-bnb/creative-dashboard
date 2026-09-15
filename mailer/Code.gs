/**
 * Creative Request Ops — email notifier (Google Apps Script)
 *
 * Deployed as a Web app ("Execute as: Me", "Who has access: Anyone"). The
 * Supabase database posts a JSON event here on every stage change and this
 * script sends one email per recipient from the deploying Google account.
 *
 * Setup: paste this file into a new Apps Script project (script.google.com),
 * replace TOKEN with a long random secret, Deploy → New deployment → Web app.
 */
const TOKEN = 'PASTE-A-LONG-RANDOM-SECRET-HERE';
const SENDER_NAME = 'Creative Request Ops';

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents || '{}');
    if (!p.token || p.token !== TOKEN) return json_({ ok: false, error: 'unauthorized' });
    const recipients = (p.recipients || []).filter((r) => r && r.email);
    let sent = 0;
    recipients.forEach((r) => {
      const mail = render_(p, r);
      MailApp.sendEmail({ to: r.email, subject: mail.subject, htmlBody: mail.html, name: SENDER_NAME, noReply: false });
      sent++;
    });
    return json_({ ok: true, sent: sent });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() { return json_({ ok: true, service: 'creative-request-ops-mailer' }); }

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- templates ---------- */
function render_(p, r) {
  const t = p.task || {};
  const who = p.actor && p.actor.name ? p.actor.name : 'Someone';
  const first = (r.name || '').split(' ')[0] || 'there';
  const tat = t.tatHours ? fmtTat_(t.tatHours) : '';
  const E = {
    raised:     { subject: `New request: ${t.title}`, headline: 'A new request was raised', lead: `${who} raised a new request. It is waiting for the coordinator to write the brief, pick the person and set the TAT.` },
    assigned:   { subject: `Assigned to you — ${t.title}${tat ? ' · TAT ' + tat : ''}`, headline: r.role === 'assignee' ? 'This task is now with you' : 'The task has been assigned', lead: r.role === 'assignee' ? `${who} briefed and assigned this task to you. The TAT clock has started${tat ? ' — you have ' + tat : ''}.` : `${who} assigned this task to ${t.assignee ? t.assignee.name : 'the team'}${tat ? ' with a TAT of ' + tat : ''}.` },
    reassigned: { subject: `Reassigned — ${t.title}`, headline: r.role === 'assignee' ? 'This task is now with you' : 'The task was reassigned', lead: `${who} reassigned this task to ${t.assignee ? t.assignee.name : 'someone else'}.` },
    submitted:  { subject: `Ready for QC — ${t.title}`, headline: 'Work submitted for QC', lead: `${who} marked the work complete and sent it for QC. The file link is on the task.` },
    rework:     { subject: `Sent back for rework (round ${t.round || 2}) — ${t.title}`, headline: 'Changes requested', lead: `${who} sent this task back to production for changes. This is round ${t.round || 2}.` },
    qc_passed:  { subject: `QC passed — final approval needed: ${t.title}`, headline: 'QC passed — waiting for final approval', lead: `${who} passed QC. ${r.role === 'requester' || r.role === 'admin' ? 'You can now give the final approval or request changes.' : 'It is now with the requester and admin for final approval.'}` },
    approved:   { subject: `Approved — ${t.title}`, headline: 'Final approval done', lead: `${who} gave the final approval. The task is closed${t.assignee ? ' and ' + t.assignee.name + "'s turnaround has been recorded" : ''}.` },
    reopened:   { subject: `Reopened — ${t.title}`, headline: 'Task reopened', lead: `${who} reopened this task; it is back in production.` },
    cancelled:  { subject: `Cancelled — ${t.title}`, headline: 'Request cancelled', lead: `${who} cancelled this request.` },
  };
  const ev = E[p.event] || { subject: `Update — ${t.title}`, headline: 'Task updated', lead: `${who} updated this task.` };
  const rows = [
    ['Task', `${esc_(t.id)} — ${esc_(t.title)}`],
    ['Type', esc_([t.type, t.team].filter(Boolean).join(' · '))],
    ['Stage', esc_(t.stageName || t.stage || '')],
    ['Priority', esc_(t.priority || '')],
    ['Raised by', esc_(t.requester ? t.requester.name : '')],
    ['Assigned to', esc_(t.assignee ? t.assignee.name : '—')],
    ['TAT', tat ? esc_(tat) + (t.dueBy ? ' · due by ' + esc_(t.dueBy) : '') : '—'],
    ['Needed by', esc_(t.dueDate || '—')],
  ];
  const note = p.note ? `<div style="margin:16px 0;padding:12px 14px;background:#FEF1D6;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;color:#3b2a06;font-size:14px;white-space:pre-wrap">${esc_(p.note)}</div>` : '';
  const html = `<!doctype html><html><body style="margin:0;background:#F3F5F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0F172A">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7A90;font-weight:700;margin-bottom:10px">Creative Request Ops · Brick&amp;Bolt</div>
    <div style="background:#fff;border:1px solid #D9E0EA;border-radius:14px;padding:22px 24px">
      <div style="font-size:19px;font-weight:700;margin-bottom:6px">${esc_(ev.headline)}</div>
      <div style="font-size:14px;color:#46546B;line-height:1.5">Hi ${esc_(first)}, ${esc_(ev.lead)}</div>
      ${note}
      <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">
        ${rows.map((x) => `<tr><td style="padding:7px 0;color:#6B7A90;width:120px;vertical-align:top">${x[0]}</td><td style="padding:7px 0;font-weight:500">${x[1]}</td></tr>`).join('')}
      </table>
      <a href="${esc_(t.link || '')}" style="display:inline-block;background:#1F4FD1;color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:10px;font-size:14px">Open task ${esc_(t.id)}</a>
    </div>
    <div style="font-size:12px;color:#98A4B8;margin-top:14px">You get this because you are the ${esc_(r.role || 'team member')} on this task. Sent automatically by the Creative Request Ops workflow.</div>
  </div></body></html>`;
  return { subject: `[${t.id}] ${ev.subject}`, html: html };
}
function fmtTat_(h) { h = Number(h); if (!h) return ''; if (h % 24 === 0) { const d = h / 24; return d + (d === 1 ? ' day' : ' days'); } if (h > 24) return (h / 24).toFixed(1) + ' days'; return h + 'h'; }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
