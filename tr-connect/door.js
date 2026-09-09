const TRConnect = (() => {
  const BOOK_KEY = "tr.connect.v12.book";
  const SESSION_KEY = "tr.connect.v12.session";
  const OFFICE = [
    { id: "ryan", name: "Ryan Wilson", email: "ryan@treunroc.com", seat: "office", money: true },
    { id: "kacey", name: "Kacey", email: "kacey@treunroc.com", seat: "office", money: true },
    { id: "jim", name: "Jim Lindsay", email: "jim@treunroc.com", seat: "office", money: false },
    { id: "alex", name: "Alex Condon", email: "alex@treunroc.com", seat: "office", money: false },
    { id: "roxy", name: "Roxy", email: "roxy@treunroc.com", seat: "office", money: false },
    { id: "marlon", name: "Marlon", email: "marlon@treunroc.com", seat: "office", money: false }
  ];
  const SITE = [
    { id: "joe", name: "Joe", email: "joe@treunroc.com", seat: "site", money: false },
    { id: "jim-site", name: "Jim Lindsay", email: "jim@treunroc.com", seat: "site", money: false },
    { id: "alex-site", name: "Alex Condon", email: "alex@treunroc.com", seat: "site", money: false }
  ];
  const JOBS = [
    { id: "iford", name: "Iford Golf Centre — fire reinstatement", value: "£230k band", status: "Live", note: "Applications APP01 / APP02 on file." },
    { id: "hexham", name: "Weird Fish Hexham", value: "Fit-out", status: "Live / snag", note: "Final application held." },
    { id: "joebrowns", name: "Joe Browns / Cirencester", value: "Materials + labour", status: "Live", note: "HSBC materials line on the book." }
  ];
  const SEED = { marlon: "6feaa1900ad7e7cec7e512e44b240fc29d45eacfad1373c84fb37b3b7f6c0245" };
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function loadBook() { try { return { ...SEED, ...(JSON.parse(localStorage.getItem(BOOK_KEY) || "{}")) }; } catch { return { ...SEED }; } }
  function saveBook(book) { localStorage.setItem(BOOK_KEY, JSON.stringify(book)); }
  function session() { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); return s && s.id ? s : null; } catch { return null; } }
  function setSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email, seat: user.seat, money: !!user.money, at: Date.now() })); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function people(mode) { return mode === "site" ? SITE : OFFICE; }
  function validPassword(pw) {
    if (!pw || pw.length < 6) return "Password needs at least 6 characters.";
    if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/\d/.test(pw)) return "Use upper, lower and a number.";
    return "";
  }
  function mount(mode) {
    const root = document.getElementById("app");
    const roster = people(mode);
    let picked = null;
    let err = "";
    function paint() { const who = session(); if (who) return paintDesk(who); paintDoor(); }
    function paintDoor() {
      root.innerHTML = `<div class="brand"><div class="mark">TR</div><div><div class="kicker">Treun Roc Contracts</div><h1>Treun Roc Connect</h1></div></div><p class="note">Staff desk for Treun Roc only. This is not TCH Works. Tap your name. First time on this device, the password you type becomes yours here.</p><div class="tabs"><a class="${mode === "office" ? "on" : ""}" href="./index.html">Office</a><a class="${mode === "site" ? "on" : ""}" href="./site.html">Site staff</a></div><div class="card" id="roster"></div>`;
      const box = root.querySelector("#roster");
      if (!picked) {
        box.innerHTML = roster.map((p) => `<button class="person" data-id="${p.id}"><b>${p.name}</b><span>${p.email}</span></button>`).join("");
        box.querySelectorAll("button.person").forEach((b) => { b.onclick = () => { picked = roster.find((p) => p.id === b.dataset.id); err = ""; paintDoor(); }; });
        return;
      }
      const first = !loadBook()[picked.id];
      box.innerHTML = `<p class="gold">${picked.name}</p><p class="meta">${picked.email}</p><label>${first ? "Set your password" : "Password"}</label><input id="pw" type="password" /><div class="row"><button class="btn ghost" id="back" type="button">Back</button><button class="btn" id="go" type="button">${first ? "Save and enter" : "Enter desk"}</button></div><div class="err">${err}</div>`;
      const pw = box.querySelector("#pw"); pw.focus();
      box.querySelector("#back").onclick = () => { picked = null; err = ""; paintDoor(); };
      const submit = async () => {
        const value = pw.value.trim();
        const bad = validPassword(value);
        if (bad) { err = bad; paintDoor(); return; }
        const hash = await sha256(value);
        const next = loadBook();
        if (!next[picked.id]) { next[picked.id] = hash; saveBook(next); setSession(picked); paint(); return; }
        if (next[picked.id] !== hash) { err = "Wrong password."; paintDoor(); return; }
        setSession(picked); paint();
      };
      box.querySelector("#go").onclick = submit;
      pw.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    }
    function paintDesk(who) {
      const jobs = JOBS.map((j) => `<div class="job"><h3>${j.name}</h3><div class="meta">${j.status} · ${who.money ? j.value : "value hidden"}</div><p class="note" style="margin:6px 0 0">${j.note}</p></div>`).join("");
      root.innerHTML = `<header class="desk"><div><div class="kicker">${who.seat === "site" ? "Site staff" : "Office desk"}</div><h1>Good day, ${who.name.split(" ")[0]}</h1><p class="note" style="margin:6px 0 0">Treun Roc Connect · not TCH Works</p></div><button class="out" id="out" type="button">Sign out</button></header><div class="card"><div class="kicker">Live jobs</div>${jobs}</div>`;
      root.querySelector("#out").onclick = () => { clearSession(); picked = null; paint(); };
    }
    paint();
  }
  return { mount };
})();
