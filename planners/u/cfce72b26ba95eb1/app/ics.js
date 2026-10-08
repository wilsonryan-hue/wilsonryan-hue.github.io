// Tiny iCalendar writer (RFC 5545): CRLF, 75-octet folding, escaping, Europe/London VTIMEZONE, display alarm.
window.TCHICS = (function(){
  const esc = s => String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
  const enc = new TextEncoder();
  function fold(line){
    const out = []; let cur = '';
    for (const ch of line){
      const lim = out.length ? 74 : 75;
      if (enc.encode(cur + ch).length > lim){ out.push(cur); cur = ch; } else cur += ch;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  const pad = n => String(n).padStart(2,'0');
  const local = (d, hh, mm) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(hh)}${pad(mm)}00`;
  const utcNow = () => new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const VTZ = ['BEGIN:VTIMEZONE','TZID:Europe/London','BEGIN:DAYLIGHT','TZOFFSETFROM:+0000','TZOFFSETTO:+0100','TZNAME:BST','DTSTART:19700329T010000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT','BEGIN:STANDARD','TZOFFSETFROM:+0100','TZOFFSETTO:+0000','TZNAME:GMT','DTSTART:19701025T020000','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD','END:VTIMEZONE'];
  // events: [{uid, date:Date(local day), hh, mm, minutes, summary, description}]
  function build(calName, events){
    const L = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TCH Works//Planners 1.0//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+esc(calName),'X-WR-TIMEZONE:Europe/London', ...VTZ];
    const stamp = utcNow();
    for (const e of events){
      const end = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate(), e.hh, e.mm + (e.minutes||10));
      L.push('BEGIN:VEVENT','UID:'+e.uid,'DTSTAMP:'+stamp,
        'DTSTART;TZID=Europe/London:'+local(e.date,e.hh,e.mm),
        'DTEND;TZID=Europe/London:'+local(end,end.getHours(),end.getMinutes()),
        'SUMMARY:'+esc(e.summary),'DESCRIPTION:'+esc(e.description||''),'TRANSP:TRANSPARENT',
        'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(e.summary),'TRIGGER:PT0M','END:VALARM','END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  function download(filename, text){
    const blob = new Blob([text], {type:'text/calendar;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  return { build, download };
})();
