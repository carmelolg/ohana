import { formatDate, formatTime, dayDiffRome } from '@ohana/shared';
import template from './email-promemoria.html';
import type { Env } from './env';
import { sendGmail } from './gmail';
import { escapeHtml as escHtml } from './escape-html';

export interface EmailVars {
  first_name: string;
  space_name: string;
  space_color: string;
  when_relative: string;
  event_title: string;
  event_date: string;
  event_time: string;
  location: string;
  assignee: string;
  notes: string;
  contact_name: string;
  contact_phone: string;
  event_url: string;
  snooze_url: string;
  done_url: string;
  ics_url: string;
  settings_url: string;
}

/** Sostituisce le variabili {{…}}. I valori sono sempre escapati; gli URL passano `&` → `&amp;` come richiesto dall'HTML. */
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => escHtml(vars[k] ?? '—'));
}

export function whenRelative(occ: Date, now: Date, offsetMinutes: number): string {
  const diff = dayDiffRome(now, occ);
  if (diff <= 0) {
    return offsetMinutes > 0 && offsetMinutes < 1440
      ? `Tra ${offsetMinutes >= 60 ? offsetMinutes / 60 + ' h' : offsetMinutes + ' min'}`
      : 'Oggi';
  }
  if (diff === 1) {
    return 'Domani';
  }
  return `Tra ${diff} giorni`;
}

export function dateVars(occ: Date) {
  return { event_date: formatDate(occ), event_time: formatTime(occ) };
}

export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  if ((env.MAIL_PROVIDER ?? 'resend') === 'gmail') {
    return sendGmail(env, to, subject, html);
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html }),
  });
  if (!r.ok) {
    throw new Error(`Resend ${r.status}: ${await r.text()}`);
  }
}

export const renderReminder = (vars: EmailVars) =>
  renderTemplate(template, vars as unknown as Record<string, string>);

export function renderBrief(
  firstName: string,
  items: { time: string; title: string; space: string }[],
  appUrl: string,
): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e8e1d6;font-family:Menlo,monospace;font-size:13px;color:#6f665c;width:64px;">${escHtml(i.time)}</td><td style="padding:10px 0;border-bottom:1px solid #e8e1d6;font-size:16px;"><strong>${escHtml(i.title)}</strong><br><span style="font-size:13px;color:#6f665c;">${escHtml(i.space)}</span></td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html lang="it"><body style="margin:0;background:#f6f2eb;padding:32px 16px;font-family:'Helvetica Neue',Arial,sans-serif;color:#26211c;"><div style="max-width:560px;margin:0 auto;background:#fffdf9;border-radius:16px;padding:32px;"><p style="margin:0 0 6px;font-family:Menlo,monospace;font-size:12px;letter-spacing:.08em;color:#6f665c;">BUONGIORNO ${escHtml(firstName.toUpperCase())}</p><h1 style="margin:0 0 20px;font-size:26px;">La tua giornata</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table><p style="margin-top:24px;"><a href="${escHtml(appUrl)}/oggi" style="color:#a3532f;">Apri Ohana</a></p></div></body></html>`;
}
