/**
 * Build a minimal RFC-5545 .ics VCALENDAR string for a single event.
 * Downloading this file and opening it imports the event into Google
 * Calendar, Outlook, Apple Calendar, and every other RFC-5545 client.
 */
export type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startMs: number;
  endMs: number;
  url?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIcsDate(ms: number) {
  const d = new Date(ms);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

// Escape per RFC 5545 §3.3.11.
function esc(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcs(ev: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Annex Workforce//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@annex.workforce`,
    `DTSTAMP:${toIcsDate(Date.now())}`,
    `DTSTART:${toIcsDate(ev.startMs)}`,
    `DTEND:${toIcsDate(ev.endMs)}`,
    `SUMMARY:${esc(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Trigger a browser download of the .ics for `filename`. */
export function downloadIcs(filename: string, ev: IcsEvent) {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
