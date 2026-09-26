interface IcsEvent {
  title: string;
  description: string;
  location: string;
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
}

function toDateParts(dateStr: string, timeStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  d.setHours(h, m, 0, 0);
  const start = new Date(d);
  const end = new Date(d.getTime() + 30 * 60 * 1000);
  const fmt = (dt: Date) =>
    dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return { start: fmt(start), end: fmt(end) };
}

export function generateIcs(event: IcsEvent): string {
  const { start, end } = toDateParts(event.dateStr, event.timeStr);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const description = event.description.replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pawly Pet Health//Vet Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${dtStamp}@pawly.pet`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(event: IcsEvent): void {
  const ics = generateIcs(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pawly-vet-appointment.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
