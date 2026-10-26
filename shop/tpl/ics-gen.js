/* TCH Works calendar builder: makes RFC 5545 .ics files from a template's schedule.
   One implementation used both for the hosted files (run in Node) and in the browser. */
(function (root) {
  'use strict';
  var DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDate(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
  function ymd(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()); }
  function lastDay(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); }
  function esc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function utf8len(ch) { var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  function fold(line) {
    var out = [], cur = '', len = 0, limit = 75;
    Array.from(line).forEach(function (ch) {
      var l = utf8len(ch);
      if (len + l > limit) { out.push(cur); cur = ' '; len = 1; limit = 75; }
      cur += ch; len += l;
    });
    out.push(cur);
    return out.join('\r\n');
  }
  function addMinutes(hhmm, mins) {
    var p = hhmm.split(':'), t = (+p[0]) * 60 + (+p[1]) + mins;
    return { h: Math.floor(t / 60) % 24, m: t % 60, carry: t >= 1440 };
  }
  function firstDate(rule, start) {
    var kind = rule.split(':')[0], arg = rule.split(':')[1], d = start, i;
    if (kind === 'WEEKLY') {
      var want = arg.split(',').map(function (x) { return DAYS[x]; });
      for (i = 0; i < 7; i++) { if (want.indexOf(addDays(start, i).getUTCDay()) >= 0) return addDays(start, i); }
    }
    if (kind === 'MONTHLY') {
      var n = +arg;
      for (i = 0; i < 62; i++) { d = addDays(start, i); if ((n > 0 && d.getUTCDate() === n) || (n < 0 && d.getUTCDate() === lastDay(d))) return d; }
    }
    if (kind === 'YEARLY') {
      var mo = +arg.slice(0, 2), da = +arg.slice(2);
      for (i = 0; i < 367; i++) { d = addDays(start, i); if (d.getUTCMonth() + 1 === mo && d.getUTCDate() === da) return d; }
    }
    return start;
  }
  function rrule(rule, count) {
    var kind = rule.split(':')[0], arg = rule.split(':')[1], r;
    if (kind === 'ONCE') return null;
    if (kind === 'DAILY') r = 'FREQ=DAILY';
    if (kind === 'WEEKLY') r = 'FREQ=WEEKLY;BYDAY=' + arg;
    if (kind === 'MONTHLY') r = 'FREQ=MONTHLY;BYMONTHDAY=' + arg;
    if (kind === 'YEARLY') r = 'FREQ=YEARLY;BYMONTH=' + (+arg.slice(0, 2)) + ';BYMONTHDAY=' + (+arg.slice(2));
    return count ? r + ';COUNT=' + count : r;
  }
  var TZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/London', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0000', 'TZOFFSETTO:+0100', 'TZNAME:BST',
    'DTSTART:19700329T010000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0000', 'TZNAME:GMT', 'DTSTART:19701025T020000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];
  function vevent(L, o) {
    var t0 = o.time.split(':'), end = addMinutes(o.time, o.dur), endDate = end.carry ? addDays(o.date, 1) : o.date;
    L.push('BEGIN:VEVENT', 'UID:' + o.uid, 'DTSTAMP:' + o.stamp,
      'DTSTART;TZID=Europe/London:' + ymd(o.date) + 'T' + pad(+t0[0]) + pad(+t0[1]) + '00',
      'DTEND;TZID=Europe/London:' + ymd(endDate) + 'T' + pad(end.h) + pad(end.m) + '00',
      'SUMMARY:' + esc(o.summary));
    if (o.desc) L.push('DESCRIPTION:' + esc(o.desc));
    if (o.rrule) L.push('RRULE:' + o.rrule);
    L.push('CATEGORIES:TCH Works', 'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(o.summary),
      'TRIGGER:' + (o.alarm ? '-PT' + o.alarm + 'M' : 'PT0S'), 'END:VALARM', 'END:VEVENT');
  }
  /* spec: {slug,name,events:[{summary,desc,rule,time,dur,alarm,offset,count}],countdown:{label,milestones:[[daysBefore,summary,desc]]}}
     opts: {start:'YYYY-MM-DD', eventDate:'YYYY-MM-DD'|null, stamp:'YYYYMMDDTHHMMSSZ', today:'YYYY-MM-DD'|null, recurring:true} */
  function build(spec, opts) {
    var stamp = opts.stamp || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TCH Works//Template Calendar 1.0//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + esc(spec.name), 'X-WR-TIMEZONE:Europe/London', 'X-PUBLISHED-TTL:PT12H'].concat(TZ);
    var tag = (opts.start || '') + (opts.eventDate ? '-' + opts.eventDate : '');
    if (opts.recurring !== false && opts.start) {
      var s = parseDate(opts.start);
      (spec.events || []).forEach(function (e, i) {
        vevent(L, { uid: spec.slug + '-e' + i + '-' + tag.replace(/-/g, '') + '@tchworks.co.uk', stamp: stamp,
          date: firstDate(e.rule, addDays(s, e.offset || 0)), time: e.time, dur: e.dur || 15, summary: e.summary,
          desc: e.desc, rrule: rrule(e.rule, e.count), alarm: e.alarm || 0 });
      });
    }
    if (spec.countdown && opts.eventDate) {
      var ed = parseDate(opts.eventDate), today = opts.today ? parseDate(opts.today) : null;
      spec.countdown.milestones.forEach(function (m, i) {
        var d = addDays(ed, -m[0]);
        if (today && d < today) return;
        vevent(L, { uid: spec.slug + '-m' + i + '-' + opts.eventDate.replace(/-/g, '') + '@tchworks.co.uk', stamp: stamp, date: d,
          time: m[0] === 0 ? '08:00' : '09:00', dur: 30, summary: m[1], desc: m[2] || '', rrule: null, alarm: 0 });
      });
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  var api = { build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TCHICS = api;
})(this);
