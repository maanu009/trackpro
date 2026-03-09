    /* ===== DATA LAYER (API) ===== */
    const API = {
      base: '/api',
      token: localStorage.getItem('tp_token') || '',
      role: localStorage.getItem('tp_role') || '',
      username: localStorage.getItem('tp_user') || '',
      athletes: [], events: [], results: [], heats: {}, chestCount: 0,

      headers() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` }; },

      async loadAll() {
        try {
          const [aRes, eRes, rRes] = await Promise.all([
            fetch(this.base + '/athletes'), fetch(this.base + '/events'), fetch(this.base + '/results')
          ]);
          if (aRes.ok) {
            const rawAthletes = await aRes.json();
            this.athletes = rawAthletes.map(a => ({
              ...a,
              chest: a.admissionNumber,
              team: a.department,
              id: a._id
            }));
          }
          if (eRes.ok) this.events = await eRes.json();
          if (rRes.ok) this.results = await rRes.json();

          this.heats = JSON.parse(localStorage.getItem('tp_heats') || '{}');
          this.chestCount = parseInt(localStorage.getItem('tp_chest') || '0');
        } catch (e) { console.error('API Sync Error', e); }
      }
    };

    const DB = {
      getAthletes() { return API.athletes; },
      saveAthletes(a) { API.athletes = a; }, // Mostly obsolete, we fetch from API
      getEvents() { return API.events; },
      saveEvents(e) { API.events = e; },
      getResults() {
        // Format results perfectly for the old client app format: { "EventName": [{ rank, name, dept, perf, ... }] }
        const formatted = {};
        API.results.forEach(r => {
          if (!r.eventId || !r.athleteId) return;
          if (!formatted[r.eventId.name]) formatted[r.eventId.name] = [];
          formatted[r.eventId.name].push({
            rank: r.position, name: r.athleteId.name,
            chest: r.athleteId.admissionNumber, dept: r.athleteId.department,
            gender: r.athleteId.gender, performance: r.performance, isMR: r.isMR, isPB: r.isPB,
            athleteId: r.athleteId._id || r.athleteId.id
          });
        });
        return formatted;
      },
      saveResults(r) { /* Handled via POST */ },
      getHeats() { return API.heats; },
      saveHeats(h) { API.heats = h; localStorage.setItem('tp_heats', JSON.stringify(h)); },
      nextChest() { API.chestCount++; localStorage.setItem('tp_chest', API.chestCount); return API.chestCount; },
      getChestCount() { return API.chestCount; }
    };

    /* ===== AUTH & LOGIN ===== */
    function toggleLogin() {
       if(API.token) {
          // Logout
          localStorage.removeItem('tp_token'); localStorage.removeItem('tp_role'); localStorage.removeItem('tp_user');
          API.token = ''; API.role = ''; API.username = '';
          document.getElementById('navLoginBtn').textContent = 'Login';
          document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
          toast('Logged out successfully', 'info');
          showPage('home');
       } else {
          showPage('login');
       }
    }
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
       e.preventDefault();
       try {
           const res = await fetch(API.base + '/auth/login', {
               method: 'POST', headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({username: document.getElementById('loginUser').value, password: document.getElementById('loginPass').value})
           });
           const data = await res.json();
           if(res.ok) {
               API.token = data.token; API.role = data.user.role; API.username = data.user.username;
               localStorage.setItem('tp_token', API.token); localStorage.setItem('tp_role', API.role); localStorage.setItem('tp_user', API.username);
               document.getElementById('navLoginBtn').textContent = 'Logout';
               checkAuthUI();
               toast('Login successful', 'success');
               showPage('home');
           } else { toast(data.message || 'Login failed', 'error'); }
       } catch(e) { toast('Login failed', 'error'); }
    });

    function checkAuthUI() {
      if (API.token && API.role === 'admin') {
        isAdmin = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
      } else {
        isAdmin = false;
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('adminLogin').style.display = 'block';
      }
      
      if(API.token) {
         document.getElementById('navLoginBtn').textContent = 'Logout';
         document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'block');
      } else {
         document.getElementById('navLoginBtn').textContent = 'Login';
         document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
      }
    }


    /* ===== TOAST ===== */
    function toast(msg, type = 'info') {
      const c = document.getElementById('toastContainer');
      const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      t.innerHTML = '<i class="fas fa-' + icons[type] + '"></i><span>' + msg + '</span>';
      c.appendChild(t);
      setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 400) }, 3500);
    }

    /* ===== THEME ===== */
    function toggleTheme() {
      const h = document.documentElement;
      const icon = document.getElementById('themeIcon');
      if (h.dataset.theme === 'dark') { h.dataset.theme = 'light'; icon.className = 'fas fa-sun'; localStorage.setItem('tp_theme', 'light') }
      else { h.dataset.theme = 'dark'; icon.className = 'fas fa-moon'; localStorage.setItem('tp_theme', 'dark') }
    }
    (function () { const t = localStorage.getItem('tp_theme'); if (t) { document.documentElement.dataset.theme = t; if (t === 'light') document.getElementById('themeIcon').className = 'fas fa-sun' } })();

    /* ===== MENU ===== */
    function toggleMenu() { document.getElementById('navLinks').classList.toggle('open') }

    /* ===== NAVIGATION ===== */
    function showPage(id) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + id).classList.add('active');
      document.querySelectorAll('.nav-links a').forEach(a => { a.classList.toggle('active', a.dataset.page === id) });
      document.getElementById('navLinks').classList.remove('open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (id === 'athletes') renderAthletes();
      if (id === 'stats') renderStats();
      if (id === 'results') renderPublicResults();
      if (id === 'points') renderPointTable();
      if (id === 'admin' && document.getElementById('adminDashboard').style.display !== 'none') refreshAdmin();
      if (id === 'home') animateCounters();
    }

    /* ===== NAVBAR SCROLL ===== */
    window.addEventListener('scroll', () => { document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50) });

    /* ===== PARTICLES ===== */
    function initParticles() {
      const c = document.getElementById('particleCanvas'), ctx = c.getContext('2d');
      let w, h, particles = [];
      function resize() { w = c.width = window.innerWidth; h = c.height = window.innerHeight }
      resize(); window.addEventListener('resize', resize);
      for (let i = 0; i < 80; i++)particles.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2 + .5, dx: (Math.random() - .5) * .5, dy: (Math.random() - .5) * .5, o: Math.random() * .5 + .1 });
      function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
          p.x += p.dx; p.y += p.dy;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,180,255,' + p.o + ')'; ctx.fill();
        });
        for (let i = 0; i < particles.length; i++)for (let j = i + 1; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = 'rgba(0,180,255,' + (1 - d / 120) * .15 + ')'; ctx.stroke() }
        }
        requestAnimationFrame(draw);
      }
      draw();
    }

    /* ===== ANIMATED COUNTERS ===== */
    async function animateCounters() {
      await API.loadAll(); const athletes = DB.getAthletes(), events = DB.getEvents(), results = DB.getResults();
      let totalEntries = 0; athletes.forEach(a => totalEntries += a.events.length);
      let totalResults = 0; Object.values(results).forEach(r => totalResults += r.length);
      animateValue('homeAthletes', athletes.length);
      animateValue('homeEvents', events.length);
      animateValue('homeEntries', totalEntries);
      animateValue('homeResults', totalResults);
    }
    function animateValue(id, target) {
      const el = document.getElementById(id); if (!el) return;
      let current = 0; const step = Math.max(1, Math.ceil(target / 40));
      const timer = setInterval(() => { current += step; if (current >= target) { current = target; clearInterval(timer) } el.textContent = current }, 30);
    }

    /* ===== EVENT CHIPS ===== */
    let selectedEvents = [];
    function renderEventChips() {
      const grid = document.getElementById('eventChips');
      const events = DB.getEvents();
      grid.innerHTML = '';
      events.forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'event-chip' + (selectedEvents.includes(ev.name) ? ' selected' : '');
        if (selectedEvents.length >= 3 && !selectedEvents.includes(ev.name)) chip.classList.add('disabled');
        chip.textContent = ev.name;
        chip.onclick = () => toggleEvent(ev.name);
        grid.appendChild(chip);
      });
      document.getElementById('eventCount').textContent = '(' + selectedEvents.length + '/3)';
    }
    function toggleEvent(name) {
      if (selectedEvents.includes(name)) { selectedEvents = selectedEvents.filter(e => e !== name) }
      else { if (selectedEvents.length >= 3) { toast('Maximum 3 events allowed!', 'warning'); return } selectedEvents.push(name) }
      renderEventChips();
    }
    function resetRegForm() { selectedEvents = []; renderEventChips(); document.getElementById('profileCard').style.display = 'none'; document.getElementById('ageHint').textContent = ''; document.getElementById('categoryHint').textContent = ''; }

    /* ===== CATEGORY <-> AGE AUTO-SYNC ===== */
    function syncAgeFromCategory() {
      const cat = document.getElementById('regCategory').value;
      const ageInput = document.getElementById('regAge');
      const ageHint = document.getElementById('ageHint');
      const catHint = document.getElementById('categoryHint');
      if (cat === 'Junior') {
        if (!ageInput.value || parseInt(ageInput.value) >= 18) ageInput.value = '';
        ageHint.textContent = '⚡ Junior category: Age must be under 18';
        ageHint.style.color = 'var(--electric)';
        catHint.textContent = '🏃 Age group: Under 18 years';
        ageInput.max = 17; ageInput.min = 5;
        ageInput.focus();
      } else if (cat === 'Senior') {
        if (!ageInput.value || parseInt(ageInput.value) < 18) ageInput.value = '';
        ageHint.textContent = '⚡ Senior category: Age must be 18 or above';
        ageHint.style.color = 'var(--gold)';
        catHint.textContent = '🏃 Age group: 18 years and above';
        ageInput.max = 99; ageInput.min = 18;
        ageInput.focus();
      } else {
        ageHint.textContent = '';
        catHint.textContent = '';
        ageInput.max = 99; ageInput.min = 5;
      }
    }
    function syncCategoryFromAge() {
      const age = parseInt(document.getElementById('regAge').value);
      const catSelect = document.getElementById('regCategory');
      const catHint = document.getElementById('categoryHint');
      const ageHint = document.getElementById('ageHint');
      if (isNaN(age) || age < 5) { catHint.textContent = ''; ageHint.textContent = ''; return; }
      if (age < 18) {
        catSelect.value = 'Junior';
        catHint.textContent = '✅ Auto-selected: Junior (Under 18)';
        catHint.style.color = 'var(--green)';
        ageHint.textContent = '⚡ Junior category';
        ageHint.style.color = 'var(--electric)';
      } else {
        catSelect.value = 'Senior';
        catHint.textContent = '✅ Auto-selected: Senior (18+)';
        catHint.style.color = 'var(--green)';
        ageHint.textContent = '⚡ Senior category';
        ageHint.style.color = 'var(--gold)';
      }
    }

    /* ===== REGISTRATION ===== */
    function registerAthlete(e) {
      e.preventDefault();
      if (selectedEvents.length === 0) { toast('Please select at least one event!', 'warning'); return }
      const chest = String(DB.nextChest()).padStart(3, '0');
      const athlete = {
        id: Date.now(), chest,
        name: document.getElementById('regName').value.trim(),
        age: parseInt(document.getElementById('regAge').value),
        gender: document.getElementById('regGender').value,
        team: document.getElementById('regTeam').value.trim(),
        category: document.getElementById('regCategory').value,
        admNum: document.getElementById('regAdmNum').value.trim(),
        events: [...selectedEvents],
        createdAt: new Date().toISOString()
      };
      const athletes = DB.getAthletes(); athletes.push(athlete); DB.saveAthletes(athletes);
      showProfile(athlete);
      document.getElementById('regForm').reset(); selectedEvents = []; renderEventChips();
      toast('Athlete registered! Chest #' + chest, 'success');
    }
    function showProfile(a) {
      const mc = document.getElementById('modalContent');
      let histHTML = '<p class="text2" style="margin-top:10px;font-size:0.9rem">No events yet</p>';
      if (a.events && a.events.length) {
        histHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">';
        a.events.forEach(evName => { histHTML += `<span class="event-chip">${evName}</span>` });
        histHTML += '</div>';
      }
      mc.innerHTML = `
        <div class="modal-header">
          <h3>Athlete Profile</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <h2 style="font-size:1.8rem;color:var(--electric);margin-bottom:5px">${a.name}</h2>
            <p style="color:var(--text2);margin-bottom:15px"><i class="fas fa-id-badge"></i> ${a.admissionNumber} &nbsp;|&nbsp; <i class="fas fa-venus-mars"></i> ${a.gender}</p>
            <div style="background:var(--navy);padding:10px 15px;border-radius:var(--radius2);border:1px solid var(--glass3);display:inline-block">
              <span style="font-weight:600;color:var(--gold)">${a.department}</span>
            </div>
          </div>
          <div style="width:120px;height:120px;background:var(--navy);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--glass3);border:4px solid var(--glass2)">
             <i class="fas fa-user-circle"></i>
          </div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="generateIDCard('${a._id || a.id}')"><i class="fas fa-qrcode"></i> Generate ID Card</button>
        <div id="qrCodeContainer" style="display:none; text-align:center;"></div>
        <h4 style="margin-top:20px;color:var(--text2);font-size:0.9rem;text-transform:uppercase;letter-spacing:1px">Events</h4>
        ${histHTML}
      `;
      document.getElementById('modalOverlay').classList.add('active');
    }

    function generateIDCard(id) {
      const a = API.athletes.find(x => (x._id || x.id) == id);
      if (!a) return;
      const qrContainer = document.getElementById('qrCodeContainer');
      qrContainer.style.display = 'block';
      qrContainer.innerHTML = '<h4>ID Card QR</h4>';
      new QRCode(qrContainer, {
        text: JSON.stringify({ name: a.name, id: a.admissionNumber, dept: a.department, events: a.events }),
        width: 128, height: 128, colorDark: "#00b4ff", colorLight: "#ffffff"
      });
    }

    /* ===== ATHLETES LIST ===== */
    function renderAthletes() {
      const athletes = DB.getAthletes(), grid = document.getElementById('athleteGrid'), noAth = document.getElementById('noAthletes');
      populateEventFilter('eventFilter');
      const filtered = applyFilters(athletes, 'athleteSearch', 'eventFilter', 'genderFilter');
      if (filtered.length === 0) { grid.innerHTML = ''; noAth.style.display = 'block'; return }
      noAth.style.display = 'none';
      grid.innerHTML = filtered.map((a, i) => '<div class="athlete-card" style="animation-delay:' + (.05 * i) + 's">' +
        '<div style="display:flex;align-items:center;gap:16px"><div class="chest-badge">' + a.chest + '</div><div><div class="name">' + a.name + '</div><div class="meta"><span>' + a.gender + '</span><span>' + a.team + '</span><span>' + a.category + '</span></div></div></div>' +
        '<div class="events-list">' + a.events.map(e => '<span class="event-tag">' + e + '</span>').join('') + '</div></div>').join('');
    }
    function applyFilters(athletes, searchId, eventId, genderId) {
      let s = document.getElementById(searchId).value.toLowerCase();
      let ev = document.getElementById(eventId).value;
      let g = document.getElementById(genderId) ? document.getElementById(genderId).value : '';
      return athletes.filter(a => {
        if (s && !a.name.toLowerCase().includes(s) && !a.chest.includes(s) && !a.team.toLowerCase().includes(s)) return false;
        if (ev && !a.events.includes(ev)) return false;
        if (g && a.gender !== g) return false;
        return true;
      });
    }
    function filterAthletes() { renderAthletes() }
    function populateEventFilter(id) {
      const sel = document.getElementById(id), events = DB.getEvents();
      const val = sel.value; sel.innerHTML = '<option value="">All Events</option>';
      events.forEach(e => { const o = document.createElement('option'); o.value = e.name; o.textContent = e.name; sel.appendChild(o) });
      sel.value = val;
    }

    /* ===== STATS ===== */
    function renderStats() {
      const athletes = DB.getAthletes(), events = DB.getEvents();
      const males = athletes.filter(a => a.gender === 'Male').length;
      const females = athletes.filter(a => a.gender === 'Female').length;
      animateValue('sTotalAthletes', athletes.length);
      animateValue('sTotalEvents', events.length);
      animateValue('sTotalMale', males);
      animateValue('sTotalFemale', females);
      // Event chart
      const ec = document.getElementById('eventChart');
      const counts = events.map(ev => ({ name: ev.name, count: athletes.filter(a => a.events.includes(ev.name)).length }));
      const max = Math.max(...counts.map(c => c.count), 1);
      ec.innerHTML = counts.map(c => '<div class="bar-item"><div class="bar-value">' + c.count + '</div><div class="bar-fill" style="height:' + ((c.count / max) * 100 || 2) + '%"></div><div class="bar-label">' + c.name + '</div></div>').join('');
      // Gender chart
      const gc = document.getElementById('genderChart');
      const total = males + females || 1;
      gc.innerHTML = '<div style="text-align:center"><div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(var(--blue) ' + (males / total * 360) + 'deg,var(--gold) 0deg);margin:0 auto 15px;position:relative;display:flex;align-items:center;justify-content:center"><div style="width:70px;height:70px;border-radius:50%;background:var(--navy2)"></div></div></div>' +
        '<div><div style="margin-bottom:12px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--blue);margin-right:8px"></span>Male: ' + males + ' (' + (males / total * 100).toFixed(0) + '%)</div>' +
        '<div><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--gold);margin-right:8px"></span>Female: ' + females + ' (' + (females / total * 100).toFixed(0) + '%)</div></div>';
      // Team chart
      const tc = document.getElementById('teamChart');
      const teams = {}; athletes.forEach(a => { teams[a.team] = (teams[a.team] || 0) + 1 });
      const tArr = Object.entries(teams).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const tMax = Math.max(...tArr.map(t => t[1]), 1);
      tc.innerHTML = tArr.map(t => '<div class="bar-item"><div class="bar-value">' + t[1] + '</div><div class="bar-fill" style="height:' + ((t[1] / tMax) * 100 || 2) + '%;background:linear-gradient(180deg,var(--gold),#f97316)"></div><div class="bar-label">' + t[0] + '</div></div>').join('') || (('<div style="text-align:center;width:100%;color:var(--text2);padding:20px">No data</div>'));
    }

    /* ===== ADMIN ===== */
    let isAdmin = false;
    async function adminLogin() {
      const u = document.getElementById('adminUser').value, p = document.getElementById('adminPass').value;
      try {
        const res = await fetch(API.base + '/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (res.ok && data.user.role === 'admin') {
          API.token = data.token; API.role = data.user.role; API.username = data.user.username;
          localStorage.setItem('tp_token', API.token); localStorage.setItem('tp_role', API.role); localStorage.setItem('tp_user', API.username);
          checkAuthUI(); refreshAdmin(); toast('Welcome, Admin!', 'success');
        } else { toast(data.message || data.error || 'Invalid credentials!', 'error'); }
      } catch (e) { toast('Login failed', 'error'); }
    }
    function adminLogout() {
      localStorage.removeItem('tp_token'); localStorage.removeItem('tp_role'); localStorage.removeItem('tp_user');
      API.token = ''; API.role = ''; API.username = '';
      checkAuthUI(); toast('Logged out', 'info');
    }
    function refreshAdmin() { renderAdminAthletes(); renderAdminEvents(); populateEventFilter('adminEventFilter'); populateHeatEvents(); populateResultEvents() }
    function switchTab(id, btn) {
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(id).classList.add('active'); btn.classList.add('active');
    }

    /* ===== ADMIN ATHLETES ===== */
    function renderAdminAthletes() {
      const athletes = DB.getAthletes();
      const s = document.getElementById('adminSearch').value.toLowerCase();
      const ev = document.getElementById('adminEventFilter').value;
      const filtered = athletes.filter(a => {
        if (s && !a.name.toLowerCase().includes(s) && !a.chest.includes(s) && !a.team.toLowerCase().includes(s)) return false;
        if (ev && !a.events.includes(ev)) return false; return true;
      });
      document.getElementById('adminAthleteTable').innerHTML = filtered.map(a =>
        '<tr><td><strong>' + a.chest + '</strong></td><td>' + a.name + '</td><td>' + a.age + '</td><td>' + a.gender + '</td><td>' + a.team + '</td><td>' + a.category + '</td>' +
        '<td>' + a.events.map(e => '<span class="event-tag" style="display:inline-block;margin:2px">' + e + '</span>').join('') + '</td>' +
        '<td><button class="btn btn-sm btn-outline" onclick="editAthlete(' + a.id + ')" style="margin:2px"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-danger" onclick="deleteAthlete(' + a.id + ')" style="margin:2px"><i class="fas fa-trash"></i></button></td></tr>').join('');
    }

    /* ===== EDIT ATHLETE ===== */
    function editAthlete(id) {
      const athletes = DB.getAthletes(), a = athletes.find(x => x.id === id); if (!a) return;
      const events = DB.getEvents();
      const mc = document.getElementById('modalContent');
      mc.innerHTML = '<div class="modal-header"><h3>Edit Athlete</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="form-grid">' +
        '<div class="form-group"><label>Name</label><input type="text" id="editName" value="' + a.name + '"></div>' +
        '<div class="form-group"><label>Age</label><input type="number" id="editAge" value="' + a.age + '"></div>' +
        '<div class="form-group"><label>Gender</label><select id="editGender"><option' + (a.gender === 'Male' ? ' selected' : '') + '>Male</option><option' + (a.gender === 'Female' ? ' selected' : '') + '>Female</option></select></div>' +
        '<div class="form-group"><label>Department</label><select id="editTeam"><option value="CHE"' + (a.team === 'CHE' ? ' selected' : '') + '>CHE</option><option value="ME"' + (a.team === 'ME' ? ' selected' : '') + '>ME</option><option value="EEE"' + (a.team === 'EEE' ? ' selected' : '') + '>EEE</option><option value="IE"' + (a.team === 'IE' ? ' selected' : '') + '>IE</option><option value="ELE"' + (a.team === 'ELE' ? ' selected' : '') + '>ELE</option><option value="CE"' + (a.team === 'CE' ? ' selected' : '') + '>CE</option></select></div>' +
        '<div class="form-group"><label>Category</label><select id="editCategory"><option' + (a.category === 'Junior' ? ' selected' : '') + '>Junior</option><option' + (a.category === 'Senior' ? ' selected' : '') + '>Senior</option></select></div>' +
        '<div class="form-group"><label>Admission Number</label><input type="text" id="editAdmNum" value="' + (a.admNum || '') + '"></div></div>' +
        '<div style="margin-top:16px"><label style="font-size:.9rem;font-weight:600;color:var(--text2)">Events</label><div id="editEventsGrid" class="events-grid" style="margin-top:8px">' +
        events.map(ev => '<div class="event-chip editEvChip' + (a.events.includes(ev.name) ? ' selected' : '') + '" data-ev="' + ev.name + '" onclick="toggleEditEvent(this)">' + ev.name + '</div>').join('') + '</div></div>' +
        '<button class="btn btn-primary" style="margin-top:20px;width:100%;justify-content:center" onclick="saveEditAthlete(' + id + ')"><i class="fas fa-save"></i> Save Changes</button>';
      openModal();
    }
    function toggleEditEvent(chip) {
      const sel = document.querySelectorAll('.editEvChip.selected');
      if (chip.classList.contains('selected')) { chip.classList.remove('selected') }
      else { if (sel.length >= 3) { toast('Max 3 events!', 'warning'); return } chip.classList.add('selected') }
    }
    function saveEditAthlete(id) {
      const athletes = DB.getAthletes(), idx = athletes.findIndex(a => a.id === id); if (idx === -1) return;
      const selEvs = [...document.querySelectorAll('.editEvChip.selected')].map(c => c.dataset.ev);
      if (selEvs.length === 0) { toast('Select at least one event!', 'warning'); return }
      athletes[idx].name = document.getElementById('editName').value.trim();
      athletes[idx].age = parseInt(document.getElementById('editAge').value);
      athletes[idx].gender = document.getElementById('editGender').value;
      athletes[idx].team = document.getElementById('editTeam').value;
      athletes[idx].category = document.getElementById('editCategory').value;
      athletes[idx].admNum = document.getElementById('editAdmNum').value.trim();
      athletes[idx].events = selEvs;
      DB.saveAthletes(athletes); closeModal(); renderAdminAthletes(); toast('Athlete updated!', 'success');
    }

    /* ===== DELETE ATHLETE ===== */
    function deleteAthlete(id) {
      const mc = document.getElementById('modalContent');
      mc.innerHTML = '<div class="modal-header"><h3>Confirm Delete</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<p style="margin-bottom:20px;color:var(--text2)">Are you sure you want to delete this athlete? This action cannot be undone.</p>' +
        '<div style="display:flex;gap:12px;justify-content:flex-end">' +
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        `<button class="btn btn-danger" onclick="confirmDelete('${id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
      openModal();
    }
    async function confirmDelete(id) {
      try {
        const res = await fetch(API.base + '/athletes/' + id, { method: 'DELETE', headers: API.headers() });
        if (res.ok) {
          await API.loadAll();
          renderAdminAthletes(); toast('Athlete deleted', 'info');
          closeModal();
        }
      } catch (e) { }
    }

    /* ===== ADMIN EVENTS ===== */
    function renderAdminEvents() {
      const events = DB.getEvents(), athletes = DB.getAthletes();
      document.getElementById('eventsList').innerHTML = events.map(ev => {
        const count = athletes.filter(a => a.events.includes(ev.name)).length;
        const evId = ev._id || ev.id;
        return '<div class="glass-card"><div style="display:flex;justify-content:space-between;align-items:start"><div><h4>' + ev.name + '</h4><p style="color:var(--text2);font-size:.85rem;margin-top:4px">' + count + ' participant' + (count !== 1 ? 's' : '') + '</p></div>' +
          '<div style="display:flex;gap:6px"><button class="btn btn-sm btn-outline" onclick="viewEventParticipants(\'' + ev.name + '\')"><i class="fas fa-users"></i></button>' +
          '<button class="btn btn-sm btn-outline" onclick="editEvent(\'' + evId + '\')"><i class="fas fa-edit"></i></button>' +
          '<button class="btn btn-sm btn-danger" onclick="removeEvent(\'' + evId + '\')"><i class="fas fa-trash"></i></button></div></div></div>';
      }).join('');
    }
    /* ===== PUBLIC EVENTS ===== */
    function renderPublicEvents() {
      const events = DB.getEvents();
      document.getElementById('publicEventsContainer').innerHTML = events.map(ev => {
        return '<div class="glass-card" style="padding:20px;display:flex;flex-direction:column;gap:12px;border-left:4px solid var(--electric)">' +
          '<h3 style="margin:0">' + ev.name + '</h3>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          '<span class="event-tag"><i class="fas fa-running"></i> ' + ev.type + '</span>' +
          '<span class="event-tag" style="background:rgba(235,168,52,0.15)"><i class="fas fa-layer-group"></i> ' + ev.category + '</span>' +
          '</div></div>';
      }).join('');
    }
    function showAddEventModal() {
      const mc = document.getElementById('modalContent');
      mc.innerHTML = '<div class="modal-header"><h3>Add New Event</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="form-group"><label>Event Name</label><input type="text" id="newEventName" placeholder="e.g. 3000m Steeplechase"></div>' +
        '<div class="form-group"><label>Event Type</label><select id="newEventType"><option value="Track">Track</option><option value="Field">Field</option></select></div>' +
        '<div class="form-group"><label>Event Category</label><select id="newEventCategory"><option value="Standard">Standard</option><option value="Junior">Junior</option><option value="Senior">Senior</option></select></div>' +
        '<button class="btn btn-primary" style="margin-top:16px;width:100%;justify-content:center" onclick="addEvent()"><i class="fas fa-plus"></i> Add Event</button>';
      openModal();
    }
    async function addEvent() {
      const name = document.getElementById('newEventName').value.trim();
      const type = document.getElementById('newEventType').value;
      const category = document.getElementById('newEventCategory').value;
      if (!name) return;
      try {
        const res = await fetch(API.base + '/events', {
          method: 'POST', headers: API.headers(), body: JSON.stringify({ name, type, category })
        });
        if (res.ok) {
          await API.loadAll();
          closeModal(); renderAdminEvents(); renderEventChips(); toast('Event added!', 'success');
        } else { toast('Error adding event', 'error'); }
      } catch (e) { toast('Network error', 'error'); }
    }
    function editEvent(id) {
      const events = DB.getEvents(), ev = events.find(e => (e._id || e.id) === id); if (!ev) return;
      const mc = document.getElementById('modalContent');
      mc.innerHTML = '<div class="modal-header"><h3>Edit Event</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="form-group"><label>Event Name</label><input type="text" id="editEventName" value="' + ev.name + '"></div>' +
        '<div class="form-group"><label>Event Type</label><select id="editEventType"><option value="Track"' + (ev.type === 'Track' ? ' selected' : '') + '>Track</option><option value="Field"' + (ev.type === 'Field' ? ' selected' : '') + '>Field</option></select></div>' +
        '<div class="form-group"><label>Event Category</label><select id="editEventCategory">' +
        ['Standard', 'Junior', 'Senior', 'Boys', 'Girls', 'Men', 'Women', 'Mixed'].map(c => '<option value="' + c + '"' + (ev.category === c ? ' selected' : '') + '>' + c + '</option>').join('') +
        '</select></div>' +
        '<button class="btn btn-primary" style="margin-top:16px;width:100%;justify-content:center" onclick="saveEvent(\'' + id + '\')"><i class="fas fa-save"></i> Save</button>';
      openModal();
    }
    async function saveEvent(id) {
      const name = document.getElementById('editEventName').value.trim(); if (!name) { toast('Enter name!', 'warning'); return }
      const type = document.getElementById('editEventType').value;
      const category = document.getElementById('editEventCategory').value;
      try {
        const res = await fetch(API.base + '/events/' + id, {
          method: 'PUT', headers: API.headers(), body: JSON.stringify({ name, type, category })
        });
        if (res.ok) {
          await API.loadAll();
          closeModal(); renderAdminEvents(); renderEventChips(); toast('Event updated!', 'success');
        } else { toast('Failed to update event', 'error'); }
      } catch (e) { toast('Network error', 'error'); }
    }
    function removeEvent(id) {
      const events = DB.getEvents(), ev = events.find(e => (e._id || e.id) === id); if (!ev) return;
      const mc = document.getElementById('modalContent');
      mc.innerHTML = '<div class="modal-header"><h3>Remove Event</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<p style="margin-bottom:20px;color:var(--text2)">Remove "' + ev.name + '"? Athletes will lose this event from their selections.</p>' +
        '<div style="display:flex;gap:12px;justify-content:flex-end"><button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-danger" onclick="confirmRemoveEvent(\'' + id + '\')"><i class="fas fa-trash"></i> Remove</button></div>';
      openModal();
    }
    async function confirmRemoveEvent(id) {
      try {
        const res = await fetch(API.base + '/events/' + id, { method: 'DELETE', headers: API.headers() });
        if (res.ok) {
          await API.loadAll();
          closeModal(); renderAdminEvents(); renderEventChips(); toast('Event removed', 'info');
        } else { toast('Failed to remove event', 'error'); }
      } catch (e) { toast('Network error', 'error'); }
    }
    function viewEventParticipants(evName) {
      const athletes = DB.getAthletes().filter(a => a.events.includes(evName));
      const mc = document.getElementById('modalContent');
      mc.innerHTML = '<div class="modal-header"><h3>' + evName + ' Participants (' + athletes.length + ')</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        (athletes.length ? '<div class="table-container"><table><thead><tr><th>Chest</th><th>Name</th><th>Gender</th><th>Dept</th><th>Category</th></tr></thead><tbody>' +
          athletes.map(a => '<tr><td><strong>' + a.chest + '</strong></td><td>' + a.name + '</td><td>' + a.gender + '</td><td>' + a.team + '</td><td>' + a.category + '</td></tr>').join('') +
          '</tbody></table></div>' : '<p style="color:var(--text2);text-align:center;padding:20px">No participants yet.</p>');
      openModal();
    }

    /* ===== HEATS ===== */
    function populateHeatEvents() {
      const sel = document.getElementById('heatEventSelect'), events = DB.getEvents();
      sel.innerHTML = '<option value="">Select Event</option>';
      events.forEach(e => { const o = document.createElement('option'); o.value = e.name; o.textContent = e.name; sel.appendChild(o) });
    }
    function generateHeats() {
      const evName = document.getElementById('heatEventSelect').value; if (!evName) { toast('Select an event!', 'warning'); return }
      const size = parseInt(document.getElementById('heatSize').value) || 8;
      let athletes = DB.getAthletes().filter(a => a.events.includes(evName));
      // Shuffle
      for (let i = athletes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[athletes[i], athletes[j]] = [athletes[j], athletes[i]] }
      const heats = [];
      for (let i = 0; i < athletes.length; i += size) { heats.push(athletes.slice(i, i + size)) }
      const allHeats = DB.getHeats(); allHeats[evName] = heats; DB.saveHeats(allHeats);
      loadHeats(); toast('Heats generated for ' + evName + '!', 'success');
    }
    function loadHeats() {
      const evName = document.getElementById('heatEventSelect').value;
      const container = document.getElementById('heatsContainer');
      if (!evName) { container.innerHTML = '<p style="color:var(--text2);text-align:center;padding:30px">Select an event to view heats</p>'; return }
      const allHeats = DB.getHeats(), heats = allHeats[evName] || [];
      if (heats.length === 0) { container.innerHTML = '<p style="color:var(--text2);text-align:center;padding:30px">No heats generated. Click "Generate Heats".</p>'; return }
      container.innerHTML = heats.map((h, i) => '<div class="heat-card"><h4><i class="fas fa-flag-checkered" style="color:var(--gold)"></i> Heat ' + (i + 1) + '</h4>' +
        h.map((a, j) => '<div class="lane"><span>Lane ' + (j + 1) + ': <strong>' + a.name + '</strong></span><span>Chest #' + a.chest + '</span></div>').join('') + '</div>').join('');
    }

    /* ===== RESULTS ===== */
    const trackEvents = ['100m', '200m', '400m', '800m', '1500m', 'Relay', '5000m', '10000m', '110m Hurdles', '400m Hurdles', '3000m Steeplechase'];
    function isTrackEvent(name) { return trackEvents.some(t => name.toLowerCase().includes(t.toLowerCase())) }
    function getDefaultUnit(evName) { return isTrackEvent(evName) ? 's' : 'm' }
    function formatResult(val) {
      if (!val) return '-';
      if (val === 'DNS') return '<span style="color:var(--danger);font-weight:600">DNS</span>';
      if (val === 'DNF') return '<span style="color:var(--danger);font-weight:600">DNF</span>';
      return val;
    }

    function populateResultEvents() {
      const sel = document.getElementById('resultEventSelect'), events = DB.getEvents(), athletes = DB.getAthletes(), allResults = DB.getResults();
      sel.innerHTML = '<option value="">-- Select an Event to Enter Results --</option>';
      events.forEach(e => {
        const count = athletes.filter(a => a.events.includes(e.name)).length;
        const hasResults = (allResults[e.name] || []).length > 0;
        const o = document.createElement('option');
        o.value = e.name;
        o.textContent = e.name + ' (' + count + ' athletes' + (hasResults ? ' ✓' : '') + ')';
        sel.appendChild(o);
      });
    }

    function renderResultsSummary() {
      const sm = document.getElementById('resultsSummary'); if (!sm) return;
      const events = DB.getEvents(), allResults = DB.getResults();
      const totalEvents = events.length;
      const eventsWithResults = events.filter(e => (allResults[e.name] || []).length > 0).length;
      const totalResultEntries = Object.values(allResults).reduce((sum, r) => sum + r.length, 0);
      sm.innerHTML =
        '<div class="stat-card" style="padding:16px"><div class="stat-number" style="font-size:1.8rem">' + totalEvents + '</div><div class="stat-label">Total Events</div></div>' +
        '<div class="stat-card" style="padding:16px"><div class="stat-number" style="font-size:1.8rem;background:linear-gradient(135deg,#22c55e,#16a34a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">' + eventsWithResults + '</div><div class="stat-label">Events with Results</div></div>' +
        '<div class="stat-card" style="padding:16px"><div class="stat-number" style="font-size:1.8rem;background:linear-gradient(135deg,var(--gold),#ea580c);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">' + (totalEvents - eventsWithResults) + '</div><div class="stat-label">Pending Results</div></div>' +
        '<div class="stat-card" style="padding:16px"><div class="stat-number" style="font-size:1.8rem">' + totalResultEntries + '</div><div class="stat-label">Total Records</div></div>';
    }

    function loadResults() {
      const evName = document.getElementById('resultEventSelect').value;
      const entry = document.getElementById('resultsEntry');
      const noEv = document.getElementById('noEventSelected');
      renderResultsSummary();
      if (!evName) {
        entry.style.display = 'none';
        if (noEv) noEv.style.display = 'block';
        return;
      }
      entry.style.display = 'block';
      if (noEv) noEv.style.display = 'none';
      const isTrack = isTrackEvent(evName);

      document.getElementById('resultEventTitle').textContent = evName + ' — Enter Results';
      document.getElementById('resultEventHint').textContent = isTrack
        ? 'Enter finishing time in seconds for each athlete (e.g. 10.52, 23.41)'
        : 'Enter distance in meters for each athlete (e.g. 5.20, 1.85)';

      const eventObj = API.events.find(e => e.name === evName || e.name + ' - ' + e.category === evName);
      const athletes = DB.getAthletes().filter(a => a.events.includes(evName));
      const existing = eventObj ? API.results.filter(r => r.eventId && r.eventId._id === eventObj._id) : [];

      const form = document.getElementById('resultsForm');
      const defUnit = getDefaultUnit(evName);
      if (athletes.length === 0) {
        form.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2)"><i class="fas fa-user-slash" style="font-size:2.5rem;margin-bottom:12px;display:block;color:var(--glass3)"></i><h4>No Athletes Registered</h4><p style="font-size:.85rem">No athletes have registered for this event yet.</p></div>';
        return;
      }

      const headerHtml = '<div style="display:grid;grid-template-columns:55px 1fr 120px 90px 80px 70px;gap:10px;padding:10px 12px;background:var(--glass2);border-radius:var(--radius2);margin-bottom:6px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text2)">' +
        '<span>Chest</span><span>Athlete Name</span><span>Status</span><span id="resultColLabel">' + (isTrack ? 'Time' : 'Distance') + '</span><span>Unit</span><span>Pos.</span></div>';

      form.innerHTML = headerHtml + athletes.map((a, idx) => {
        const r = existing.find(x => (x.athleteId && x.athleteId._id === (a._id || a.id)));
        const savedBorder = r ? 'border-left:3px solid #22c55e;' : 'border-left:3px solid transparent;';

        let resultVal = '', unitVal = defUnit, status = 'Completed';
        if (r) {
          if (r.performance === 'DNS') status = 'DNS';
          else if (r.performance === 'DNF') status = 'DNF';
          else {
            const match = r.performance.match(/^([\d.]+)(.*)$/);
            if (match) { resultVal = match[1]; unitVal = match[2] || defUnit; }
            else resultVal = r.performance;
          }
        }
        const isComp = status === 'Completed';

        return '<div class="result-entry-row" style="' + savedBorder + '">' +
          '<label style="font-size:1rem;color:var(--gold);font-family:var(--font2)">' + a.chest + '</label>' +
          '<span class="name-col"><strong>' + a.name + '</strong> <span style="color:var(--text2);font-size:.78rem">(' + a.team + ')</span></span>' +
          '<select class="result-input-styled status-select" data-id="' + a.id + '" onchange="toggleResultInput(this, \'' + a.id + '\')">' +
          '<option value="Completed"' + (isComp ? ' selected' : '') + '>Completed</option>' +
          '<option value="DNS"' + (status === 'DNS' ? ' selected' : '') + '>DNS (Not Reported)</option>' +
          '<option value="DNF"' + (status === 'DNF' ? ' selected' : '') + '>DNF (Did Not Finish)</option>' +
          '</select>' +
          '<input type="text" class="result-input-styled result-input" data-id="' + a.id + '" placeholder="' + (isTrack ? 'e.g. 10.52' : 'e.g. 5.20') + '" value="' + resultVal + '" ' + (!isComp ? 'disabled' : '') + '>' +
          '<select class="result-input-styled unit-select" data-id="' + a.id + '" ' + (!isComp ? 'disabled' : '') + '>' +
          '<option value="s"' + (unitVal === 's' ? ' selected' : '') + '>sec</option>' +
          '<option value="m"' + (unitVal === 'm' ? ' selected' : '') + '>m</option>' +
          '<option value="min"' + (unitVal === 'min' ? ' selected' : '') + '>min</option>' +
          '</select>' +
          '<input type="number" class="result-input-styled rank-input" data-id="' + a.id + '" placeholder="#" value="' + (r && isComp ? r.position : '') + '" min="1" ' + (!isComp ? 'disabled' : '') + '>' +
          '</div>';
      }).join('');
      renderPodium(evName);
      renderFullRankings(evName);
    }

    function toggleResultInput(sel, id) {
      const inp = document.querySelector('.result-input[data-id="' + id + '"]');
      const unit = document.querySelector('.unit-select[data-id="' + id + '"]');
      const rank = document.querySelector('.rank-input[data-id="' + id + '"]');
      if (sel.value !== 'Completed') {
        inp.disabled = true; unit.disabled = true; rank.disabled = true;
        inp.value = ''; rank.value = '';
      } else {
        inp.disabled = false; unit.disabled = false; rank.disabled = false;
      }
    }

    function autoRankResults() {
      const evName = document.getElementById('resultEventSelect').value;
      if (!evName) { toast('Select an event first!', 'warning'); return; }
      const rows = [...document.querySelectorAll('.result-entry-row')].map(row => {
        const id = row.querySelector('.status-select').dataset.id;
        const status = row.querySelector('.status-select').value;
        const inp = row.querySelector('.result-input');
        const val = parseFloat(inp.value);
        return { id, val, status, hasVal: status === 'Completed' && inp.value.trim() !== '' && !isNaN(val) };
      }).filter(r => r.hasVal);

      if (rows.length === 0) { toast('Enter times/distances first before auto-ranking!', 'warning'); return; }
      if (isTrackEvent(evName)) { rows.sort((a, b) => a.val - b.val) }
      else { rows.sort((a, b) => b.val - a.val) }
      rows.forEach((r, i) => {
        const rankInp = document.querySelector('.rank-input[data-id="' + r.id + '"]');
        if (rankInp) rankInp.value = i + 1;
      });
      toast('Auto-ranked ' + rows.length + ' athletes by ' + (isTrackEvent(evName) ? 'fastest time ⚡' : 'longest distance 📏') + '!', 'success');
    }

    async function saveResults() {
      const evName = document.getElementById('resultEventSelect').value;
      if (!evName) { toast('Select an event first!', 'warning'); return; }

      const eventObj = API.events.find(e => e.name === evName || e.name + ' - ' + e.category === evName);
      if (!eventObj) { toast('Event not found in Database', 'error'); return; }

      const results = [];
      document.querySelectorAll('.status-select').forEach(sel => {
        const id = sel.dataset.id;
        const status = sel.value;
        const inp = document.querySelector('.result-input[data-id="' + id + '"]');
        const rank = document.querySelector('.rank-input[data-id="' + id + '"]');
        const unit = document.querySelector('.unit-select[data-id="' + id + '"]');

        let perf = '';
        if (status === 'DNS') perf = 'DNS';
        else if (status === 'DNF') perf = 'DNF';
        else if (inp.value.trim()) perf = inp.value.trim() + (unit ? unit.value : 's');

        if (perf) {
          const ath = API.athletes.find(a => (a._id || a.id) == id);
          if (ath) {
            results.push({
              eventId: eventObj._id,
              athleteId: ath._id,
              performance: perf,
              position: (status === 'Completed' ? parseInt(rank.value) || 999 : 999)
            });
          }
        }
      });
      if (results.length === 0) { toast('Enter at least one result!', 'warning'); return; }

      try {
        for (let r of results) {
          await fetch(API.base + '/results', {
            method: 'POST', headers: API.headers(), body: JSON.stringify(r)
          });
        }
        await API.loadAll();
        renderPodium(evName);
        renderFullRankings(evName);
        renderResultsSummary();
        populateResultEvents();
        renderMedalCount();
        document.getElementById('resultEventSelect').value = evName;
        toast('✅ Results saved for ' + evName + '! (' + results.length + ' records)', 'success');
      } catch (e) { toast('Error saving results', 'error'); }
    }

    function clearEventResults() {
      const evName = document.getElementById('resultEventSelect').value;
      if (!evName) return;
      if (!confirm('Clear all results for ' + evName + '?')) return;
      const allResults = DB.getResults(); delete allResults[evName]; DB.saveResults(allResults);
      loadResults();
      populateResultEvents();
      document.getElementById('resultEventSelect').value = evName;
      toast('Results cleared for ' + evName, 'info');
    }

    function renderPodium(evName) {
      const allResults = DB.getResults();
      const results = (allResults[evName] || []).filter(r => r.performance !== 'DNS' && r.performance !== 'DNF').sort((a, b) => a.rank - b.rank);
      const athletes = DB.getAthletes(), pd = document.getElementById('podiumDisplay');
      if (results.length < 1) { pd.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text2)"><i class="fas fa-trophy" style="font-size:2rem;margin-bottom:8px;display:block;color:var(--glass3)"></i><p>Save results to see the podium</p></div>'; return }
      const top3 = results.slice(0, 3);
      const places = ['gold', 'silver', 'bronze'], icons = ['🥇', '🥈', '🥉'];
      // Visual order: Silver(1st place=idx1), Gold(0th=idx0), Bronze(2nd=idx2)
      const order = top3.length >= 2 ? [1, 0, 2].filter(i => i < top3.length) : [0];
      pd.innerHTML = '<div class="podium">' + order.map(i => {
        const r = top3[i], a = athletes.find(x => x.id === r.athleteId);
        return '<div class="podium-place ' + places[i] + '">' +
          '<div class="rank">' + icons[i] + '</div>' +
          '<div class="p-name">' + (a ? a.name : 'Unknown') + '</div>' +
          '<div style="font-size:.75rem;color:var(--text2)">' + (a ? a.team : '') + '</div>' +
          '<div class="p-result">' + formatResult(r.performance) + '</div></div>';
      }).join('') + '</div>';
    }

    function renderFullRankings(evName) {
      const allResults = DB.getResults(), results = (allResults[evName] || []).sort((a, b) => a.rank - b.rank);
      const athletes = DB.getAthletes(), fd = document.getElementById('fullRankingsDisplay');
      if (results.length < 1) { fd.innerHTML = '<p style="color:var(--text2);text-align:center;padding:20px">No results to display</p>'; return }
      const medalIcons = { 1: '🥇', 2: '🥈', 3: '🥉' };
      const isTrack = isTrackEvent(evName);
      fd.innerHTML = '<div class="table-container"><table class="results-table"><thead><tr><th>Pos</th><th>Chest</th><th>Athlete</th><th>Dept</th><th>' + (isTrack ? 'Time' : 'Distance') + '</th><th>Category</th></tr></thead><tbody>' +
        results.map(r => {
          const a = athletes.find(x => x.id === r.athleteId);
          const isDidNot = r.performance === 'DNS' || r.performance === 'DNF';
          const posDisplay = isDidNot ? '-' : (medalIcons[r.rank] || '<span style="color:var(--text2)">#' + r.rank + '</span>');
          const rankClass = (!isDidNot && r.rank <= 3) ? 'rank-' + r.rank : '';
          return '<tr class="' + rankClass + '"><td style="font-size:1.1rem">' + posDisplay + '</td><td><strong>' + (a ? a.chest : '?') + '</strong></td><td>' + (a ? a.name : 'Unknown') + '</td><td>' + (a ? a.team : '-') + '</td><td class="time-record">' + formatResult(r.performance) + (!isDidNot && r.rank === 1 ? ' <span class="record-badge best"><i class="fas fa-star"></i> Best</span>' : '') + '</td><td>' + (a ? a.category : '-') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
    }

    /* ===== PUBLIC RESULTS PAGE ===== */
    function renderPublicResults() {
      const container = document.getElementById('publicResultsContainer');
      const allResults = DB.getResults(), events = DB.getEvents(), athletes = DB.getAthletes();
      // Populate event filter
      const evSel = document.getElementById('publicResultEvent');
      const curEv = evSel.value;
      evSel.innerHTML = '<option value="">All Events</option>';
      events.forEach(e => {
        const hasR = (allResults[e.name] || []).length > 0;
        if (hasR || !curEv) {
          const o = document.createElement('option'); o.value = e.name; o.textContent = e.name + (hasR ? ' ✓' : ''); evSel.appendChild(o);
        }
      });
      evSel.value = curEv;
      const catFilter = document.getElementById('publicResultCategory').value;
      // Filter events that have results
      let eventsWithResults = events.filter(e => (allResults[e.name] || []).length > 0);
      if (curEv) eventsWithResults = eventsWithResults.filter(e => e.name === curEv);
      if (eventsWithResults.length === 0) {
        container.innerHTML = '<div class="no-results-msg"><i class="fas fa-trophy"></i><h3>No Results Yet</h3><p>Competition results will appear here once they are entered by the admin.</p></div>';
        return;
      }
      const medalIcons = { 1: '🥇', 2: '🥈', 3: '🥉' };
      container.innerHTML = eventsWithResults.map(ev => {
        let results = (allResults[ev.name] || []).sort((a, b) => a.rank - b.rank);
        // Category filter
        if (catFilter) {
          const catAthleteIds = athletes.filter(a => a.category === catFilter).map(a => a.id);
          results = results.filter(r => catAthleteIds.includes(r.athleteId));
        }
        if (results.length === 0) return '';
        const isTrack = isTrackEvent(ev.name);
        // Build podium - top3 visual order: silver, gold, bronze
        const top3 = results.slice(0, 3);
        const podiumOrder = top3.length >= 2 ? [1, 0, 2].filter(i => i < top3.length) : [0];
        const places = ['gold', 'silver', 'bronze'], podiumIcons = ['🥇', '🥈', '🥉'];
        const pd = '<div class="podium" style="transform:scale(0.8);transform-origin:top left;margin-bottom:-20px">' + podiumOrder.map(i => {
          const r = top3[i], a = athletes.find(x => x.id === r.athleteId);
          return '<div class="podium-place ' + places[i] + '"><div class="rank">' + podiumIcons[i] + '</div>' +
            '<div class="p-name">' + (a ? a.name : '?') + '</div><div style="font-size:.7rem;color:var(--text2)">' + (a ? a.team : '') + '</div>' +
            '<div class="p-result">' + formatResult(r.performance) + '</div></div>';
        }).join('') + '</div>';
        // Table remaining
        const tbl = '<div class="table-container" style="margin-top:20px;box-shadow:none;background:transparent"><table class="results-table"><thead><tr><th>Pos</th><th>Chest</th><th>Athlete</th><th>Dept</th><th>Result</th><th>Category</th></tr></thead><tbody>' +
          results.slice(3).map(r => {
            const a = athletes.find(x => x.id === r.athleteId);
            const isDidNot = r.performance === 'DNS' || r.performance === 'DNF';
            const posDisplay = isDidNot ? '-' : ('<span style="color:var(--text2)">#' + r.rank + '</span>');
            const rankClass = '';
            return '<tr class="' + rankClass + '"><td style="font-size:1.1rem">' + posDisplay + '</td><td><strong>' + (a ? a.chest : '?') + '</strong></td><td>' + (a ? a.name : 'Unknown') + '</td><td>' + (a ? a.team : '-') + '</td><td class="time-record">' + formatResult(r.performance) + (!isDidNot && r.rank === 1 ? ' <span class="record-badge best"><i class="fas fa-star"></i> Best</span>' : '') + '</td><td>' + (a ? a.category : '-') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        return '<div class="result-event-card">' +
          '<h3><i class="fas ' + (isTrack ? 'fa-stopwatch' : 'fa-ruler') + '" style="color:var(--gold)"></i> ' + ev.name +
          ' <span style="font-size:.8rem;font-weight:400;color:var(--text2);margin-left:auto">' + (isTrack ? 'Track' : 'Field') + ' Event · ' + results.length + ' results</span></h3>' +
          pd + tbl + '</div>';
      }).join('');
    }

    function exportResultsPDF() {
      const allResults = DB.getResults(), events = DB.getEvents(), athletes = DB.getAthletes();
      const eventsWithResults = events.filter(e => (allResults[e.name] || []).length > 0);
      if (!eventsWithResults.length) { toast('No results to export!', 'warning'); return }
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>TrackPro - Competition Results</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#1a1a2e}h1{color:#0a1628;border-bottom:3px solid #f59e0b;padding-bottom:10px}h2{color:#0a1628;margin-top:30px;border-left:4px solid #3b82f6;padding-left:10px}table{width:100%;border-collapse:collapse;margin:10px 0 25px}th{background:#0a1628;color:#fff;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px}td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}tr:nth-child(even){background:#f8fafc}.medal{font-size:16px}.time{font-weight:bold;color:#2563eb;font-size:14px}.best{background:#fef3c7;padding:2px 8px;border-radius:4px;color:#b45309;font-size:11px;font-weight:600}.gold-row td{background:#fefce8}.silver-row td{background:#f8fafc}.bronze-row td{background:#fff7ed}p.gen{color:#6b7280;font-size:13px}</style></head><body>');
      w.document.write('<h1>🏆 TrackPro — Competition Results</h1><p class="gen">Generated: ' + new Date().toLocaleString() + ' | Total Events: ' + eventsWithResults.length + '</p>');
      eventsWithResults.forEach(ev => {
        const results = (allResults[ev.name] || []).sort((a, b) => a.rank - b.rank);
        const medalIcons = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const isTrack = isTrackEvent(ev.name);
        w.document.write('<h2>' + (isTrack ? '🏃 ' : '🏋️ ') + ev.name + ' (' + results.length + ' results)</h2>');
        w.document.write('<table><thead><tr><th>Pos</th><th>Chest</th><th>Athlete</th><th>Department</th><th>' + (isTrack ? 'Time' : 'Distance') + '</th><th>Category</th></tr></thead><tbody>');
        results.forEach(r => {
          const a = athletes.find(x => x.id === r.athleteId);
          const isDidNot = r.performance === 'DNS' || r.performance === 'DNF';
          const posDisplay = isDidNot ? '-' : (medalIcons[r.rank] || '#' + r.rank);
          const rowClass = r.rank === 1 ? 'gold-row' : r.rank === 2 ? 'silver-row' : r.rank === 3 ? 'bronze-row' : '';
          w.document.write('<tr class="' + rowClass + '"><td><span class="medal">' + posDisplay + '</span></td><td>' + (a ? a.chest : '?') + '</td><td>' + (a ? a.name : 'Unknown') + '</td><td>' + (a ? a.team : '-') + '</td><td class="time">' + formatResult(r.performance) + (!isDidNot && r.rank === 1 ? ' <span class="best">★ Best</span>' : '') + '</td><td>' + (a ? a.category : '-') + '</td></tr>');
        });
        w.document.write('</tbody></table>');
      });
      w.document.write('</body></html>'); w.document.close(); w.print(); toast('Results PDF ready!', 'success');
    }

    /* ===== MODAL ===== */
    function openModal() { document.getElementById('modalOverlay').classList.add('active') }
    function closeModal() { document.getElementById('modalOverlay').classList.remove('active') }

    /* ===== EXPORT PDF ===== */
    function exportPDF() {
      const athletes = DB.getAthletes(); if (!athletes.length) { toast('No athletes to export!', 'warning'); return }
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>TrackPro - Athletes</title><style>body{font-family:Arial,sans-serif;padding:30px}h1{color:#0a1628;border-bottom:3px solid #3b82f6;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#0a1628;color:#fff;padding:10px;text-align:left}td{padding:8px 10px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f5f5f5}.badge{background:#f59e0b;color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold}.tag{background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:12px;margin:1px}</style></head><body>');
      w.document.write('<h1>🏟️ TrackPro - Registered Athletes</h1><p>Generated: ' + new Date().toLocaleString() + '</p>');
      w.document.write('<table><thead><tr><th>Chest #</th><th>Name</th><th>Age</th><th>Gender</th><th>Dept</th><th>Category</th><th>Adm #</th><th>Events</th></tr></thead><tbody>');
      athletes.forEach(a => { w.document.write('<tr><td><span class="badge">' + a.chest + '</span></td><td>' + a.name + '</td><td>' + a.age + '</td><td>' + a.gender + '</td><td>' + a.team + '</td><td>' + a.category + '</td><td>' + (a.admNum || '-') + '</td><td>' + a.events.map(e => '<span class="tag">' + e + '</span>').join(' ') + '</td></tr>') });
      w.document.write('</tbody></table></body></html>');
      w.document.close(); w.print(); toast('PDF ready to print!', 'success');
    }

    /* ===== EXPORT CSV ===== */
    function exportCSV() {
      const athletes = DB.getAthletes(); if (!athletes.length) { toast('No athletes to export!', 'warning'); return }
      let csv = 'Chest#,Name,Age,Gender,Dept,Category,Adm#,Events\n';
      athletes.forEach(a => { csv += a.chest + ',"' + a.name + '",' + a.age + ',' + a.gender + ',"' + a.team + '",' + a.category + ',"' + (a.admNum || '') + '",\"' + a.events.join('; ') + '\"\n' });
      const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'trackpro_athletes.csv'; link.click(); URL.revokeObjectURL(url);
      toast('CSV downloaded!', 'success');
    }

    /* ===== PRINT CHEST NUMBERS ===== */
    function printChestNumbers() {
      const athletes = DB.getAthletes(); if (!athletes.length) { toast('No athletes!', 'warning'); return }
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Chest Numbers</title><style>body{font-family:Arial;padding:20px}h1{text-align:center;color:#0a1628}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-top:20px}.card{border:3px solid #0a1628;border-radius:12px;padding:20px;text-align:center}.num{font-size:3rem;font-weight:900;color:#0a1628}.name{font-size:1rem;margin-top:5px;color:#555}.team{font-size:.85rem;color:#888}@media print{.grid{grid-template-columns:repeat(4,1fr)}}</style></head><body>');
      w.document.write('<h1>🏃 TrackPro - Chest Numbers</h1><div class="grid">');
      athletes.forEach(a => { w.document.write('<div class="card"><div class="num">' + a.chest + '</div><div class="name">' + a.name + '</div><div class="team">' + a.team + '</div></div>') });
      w.document.write('</div></body></html>'); w.document.close(); w.print(); toast('Print ready!', 'success');
    }

    /* ===== DEPARTMENT POINT TABLE ===== */
    function renderPointTable() {
      const allResults = DB.getResults(), athletes = DB.getAthletes();
      const pointsConfig = { 1: 5, 2: 3, 3: 1 }; // Gold, Silver, Bronze points

      // Calculate points
      const deptStats = {};
      Object.keys(allResults).forEach(evName => {
        const results = allResults[evName].filter(r => r.rank <= 3 && r.performance !== 'DNS' && r.performance !== 'DNF');
        results.forEach(r => {
          const a = athletes.find(x => x.id === r.athleteId);
          if (a && a.team) {
            if (!deptStats[a.team]) deptStats[a.team] = { points: 0, gold: 0, silver: 0, bronze: 0, results: [] };
            deptStats[a.team].points += pointsConfig[r.rank] || 0;
            if (r.rank === 1) deptStats[a.team].gold++;
            if (r.rank === 2) deptStats[a.team].silver++;
            if (r.rank === 3) deptStats[a.team].bronze++;
            deptStats[a.team].results.push({ evName, a, rank: r.rank, performance: r.performance });
          }
        });
      });

      const sortedDepts = Object.keys(deptStats).sort((a, b) => {
        if (deptStats[b].points !== deptStats[a].points) return deptStats[b].points - deptStats[a].points;
        if (deptStats[b].gold !== deptStats[a].gold) return deptStats[b].gold - deptStats[a].gold;
        if (deptStats[b].silver !== deptStats[a].silver) return deptStats[b].silver - deptStats[a].silver;
        return deptStats[b].bronze - deptStats[a].bronze;
      });

      const ptContainer = document.getElementById('deptPointTableContainer');
      const detContainer = document.getElementById('deptDetailedResultsContainer');

      if (sortedDepts.length === 0) {
        ptContainer.innerHTML = '<div class="no-results-msg"><i class="fas fa-trophy" style="font-size:3rem;color:var(--glass3);margin-bottom:12px;display:block"></i><h3>No Points Awarded Yet</h3><p>Ensure event results have been entered to calculate department standings.</p></div>';
        detContainer.innerHTML = '';
        return;
      }

      // 1. Render Point Table
      ptContainer.innerHTML = '<div class="table-container"><table class="results-table"><thead><tr><th>Position</th><th>Department</th><th>Gold (5p)</th><th>Silver (3p)</th><th>Bronze (1p)</th><th>Total Points</th></tr></thead><tbody>' +
        sortedDepts.map((d, i) => {
          const s = deptStats[d];
          const rankIcon = i === 0 ? '🏆 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : '#' + (i + 1);
          const rowClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
          return '<tr class="' + rowClass + '">' +
            '<td><strong>' + rankIcon + '</strong></td>' +
            '<td style="font-size:1.1rem;color:var(--electric)"><strong>' + d + '</strong></td>' +
            '<td>' + s.gold + ' <span style="font-size:0.8rem;color:var(--text2)">(' + (s.gold * 5) + 'p)</span></td>' +
            '<td>' + s.silver + ' <span style="font-size:0.8rem;color:var(--text2)">(' + (s.silver * 3) + 'p)</span></td>' +
            '<td>' + s.bronze + ' <span style="font-size:0.8rem;color:var(--text2)">(' + (s.bronze) + 'p)</span></td>' +
            '<td style="font-size:1.2rem;color:var(--gold);font-weight:700">' + s.points + ' pts</td>' +
            '</tr>';
        }).join('') +
        '</tbody></table></div>';

      // 2. Render Detailed Results Grouped by Department
      detContainer.innerHTML = sortedDepts.map(d => {
        const s = deptStats[d];
        const res = s.results.sort((a, b) => a.rank - b.rank);
        if (res.length === 0) return '';
        return '<div class="result-event-card" style="margin-bottom:24px;background:var(--glass);padding:20px;border-radius:var(--radius);border:1px solid var(--glass3)">' +
          '<h3 style="border-bottom:1px solid var(--glass3);padding-bottom:12px;margin-bottom:16px"><i class="fas fa-building" style="color:var(--electric)"></i> ' + d + ' <span style="font-size:0.9rem;font-weight:500;color:var(--gold);float:right">' + s.points + ' Total Points</span></h3>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">' +
          res.map(r => {
            const medal = r.rank === 1 ? '🥇 Gold' : r.rank === 2 ? '🥈 Silver' : '🥉 Bronze';
            const color = r.rank === 1 ? 'var(--gold)' : r.rank === 2 ? '#94a3b8' : '#b45309';
            return '<div style="background:var(--glass2);padding:12px;border-radius:8px;border-left:3px solid ' + color + '">' +
              '<div style="font-size:0.8rem;color:' + color + ';font-weight:600;margin-bottom:4px">' + medal + ' &mdash; ' + r.evName + '</div>' +
              '<div><strong>' + r.a.name + '</strong> <span style="font-size:0.8rem;color:var(--text2)">(' + r.a.chest + ')</span></div>' +
              '<div style="font-size:0.8rem;color:var(--text2)">Result: ' + formatResult(r.performance) + '</div>' +
              '</div>';
          }).join('') +
          '</div></div>';
      }).join('');
    }

    function exportPointTablePDF() {
      const allResults = DB.getResults(), athletes = DB.getAthletes();
      const pointsConfig = { 1: 5, 2: 3, 3: 1 };
      const deptStats = {};
      Object.keys(allResults).forEach(evName => {
        allResults[evName].filter(r => r.rank <= 3).forEach(r => {
          const a = athletes.find(x => x.id === r.athleteId);
          if (a && a.team) {
            if (!deptStats[a.team]) deptStats[a.team] = { points: 0, gold: 0, silver: 0, bronze: 0 };
            deptStats[a.team].points += pointsConfig[r.rank] || 0;
            if (r.rank === 1) deptStats[a.team].gold++;
            if (r.rank === 2) deptStats[a.team].silver++;
            if (r.rank === 3) deptStats[a.team].bronze++;
          }
        });
      });
      const sortedDepts = Object.keys(deptStats).sort((a, b) => {
        if (deptStats[b].points !== deptStats[a].points) return deptStats[b].points - deptStats[a].points;
        return deptStats[b].gold - deptStats[a].gold;
      });
      if (sortedDepts.length === 0) { toast('No points data to export!', 'warning'); return; }

      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Department Standings</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#1a1a2e}h1{color:#0a1628;border-bottom:3px solid #f59e0b;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#0a1628;color:#fff;padding:12px;text-align:left;font-size:13px}td{padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px}tr:nth-child(even){background:#f8fafc}.pts{font-weight:bold;color:#b45309;font-size:16px}.gold-row td{background:#fefce8}p.gen{color:#6b7280;font-size:13px}</style></head><body>');
      w.document.write('<h1>🏆 Department Overall Standings</h1><p class="gen">Generated: ' + new Date().toLocaleString() + ' | Scoring: Gold (5), Silver (3), Bronze (1)</p>');
      w.document.write('<table><thead><tr><th>Pos</th><th>Department</th><th>Gold</th><th>Silver</th><th>Bronze</th><th>Total Points</th></tr></thead><tbody>');
      sortedDepts.forEach((d, i) => {
        const s = deptStats[d];
        const rowClass = i === 0 ? 'gold-row' : '';
        w.document.write('<tr class="' + rowClass + '"><td><strong>' + (i + 1) + '</strong></td><td><strong>' + d + '</strong></td><td>' + s.gold + '</td><td>' + s.silver + '</td><td>' + s.bronze + '</td><td class="pts">' + s.points + '</td></tr>');
      });
      w.document.write('</tbody></table></body></html>');
      w.document.close(); w.print(); toast('Standings PDF ready!', 'success');
    }



    /* ===== INIT ===== */
    async function renderMedalCount() {
      try {
        const res = await fetch(API.base + '/results/medal-count');
        if (!res.ok) return;
        const data = await res.json();
        let html = '<div class="table-container"><table><tr><th>Rank</th><th>Department</th><th>🥇 Gold</th><th>🥈 Silver</th><th>🥉 Bronze</th><th>Total Pts</th></tr>';
        data.forEach((d, i) => {
          const pts = (d.gold * 5) + (d.silver * 3) + (d.bronze * 1);
          html += `<tr class="${i === 0 ? 'gold-row' : ''}"><td>${i + 1}</td><td style="font-weight:bold">${d.department}</td><td>${d.gold}</td><td>${d.silver}</td><td>${d.bronze}</td><td style="color:var(--gold);font-weight:bold">${pts}</td></tr>`;
        });
        html += '</table></div>';
        document.getElementById('deptPointTableContainer').innerHTML = html;
      } catch (e) { console.error(e); }
    }

    (async function initApp() {
      try {
        await API.loadAll();
        checkAuthUI();
        await renderMedalCount();
        renderPublicEvents();
      } catch (e) {
        console.error("Init Error:", e);
      } finally {
        setTimeout(() => { document.getElementById('loader').classList.add('hide') }, 500);
      }
    })();

    window.addEventListener('DOMContentLoaded', () => {
      initParticles();
      renderEventChips();
      animateCounters();

      // Live Results Refresh
      setInterval(async () => {
        if (document.getElementById('page-results').classList.contains('active')) {
          await API.loadAll();
          const evName = document.getElementById('resultEventSelect').value;
          if (evName) {
            renderPodium(evName);
            renderFullRankings(evName);
          }
        }
        // Background sync for public events
        if (document.getElementById('page-publicEvents').classList.contains('active')) {
          await API.loadAll();
          renderPublicEvents();
        }
      }, 5000);
    });
