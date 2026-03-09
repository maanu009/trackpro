const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Replace DATA LAYER
const dbCode = `    /* ===== DATA LAYER ===== */
    const DB = {
      defaultEvents: ['100m', '200m', '400m', '800m', '1500m', 'Long Jump', 'High Jump', 'Shot Put', 'Relay'],
      getAthletes() { return JSON.parse(localStorage.getItem('tp_athletes') || '[]') },
      saveAthletes(a) { localStorage.setItem('tp_athletes', JSON.stringify(a)) },
      getEvents() { let e = JSON.parse(localStorage.getItem('tp_events') || 'null'); if (!e) { e = this.defaultEvents.map((n, i) => ({ id: i + 1, name: n })); this.saveEvents(e) } return e },
      saveEvents(e) { localStorage.setItem('tp_events', JSON.stringify(e)) },
      getResults() { return JSON.parse(localStorage.getItem('tp_results') || '{}') },
      saveResults(r) { localStorage.setItem('tp_results', JSON.stringify(r)) },
      getHeats() { return JSON.parse(localStorage.getItem('tp_heats') || '{}') },
      saveHeats(h) { localStorage.setItem('tp_heats', JSON.stringify(h)) },
      nextChest() { let n = parseInt(localStorage.getItem('tp_chest') || '0') + 1; localStorage.setItem('tp_chest', n.toString()); return n },
      getChestCount() { return parseInt(localStorage.getItem('tp_chest') || '0') }
    };`;

const apiCode = `    /* ===== DATA LAYER (API) ===== */
    const API = {
      base: '/api',
      token: localStorage.getItem('tp_token') || '',
      role: localStorage.getItem('tp_role') || '',
      username: localStorage.getItem('tp_user') || '',
      athletes: [], events: [], results: [], heats: {}, chestCount: 0,
      
      headers() { return { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${this.token}\` }; },
      
      async loadAll() {
        try {
          const [aRes, eRes, rRes] = await Promise.all([
            fetch(this.base + '/athletes'), fetch(this.base + '/events'), fetch(this.base + '/results')
          ]);
          if(aRes.ok) this.athletes = await aRes.json();
          if(eRes.ok) this.events = await eRes.json();
          if(rRes.ok) this.results = await rRes.json();
          
          this.heats = JSON.parse(localStorage.getItem('tp_heats') || '{}');
          this.chestCount = parseInt(localStorage.getItem('tp_chest') || '0');
        } catch(e) { console.error('API Sync Error', e); }
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
             if(!r.eventId || !r.athleteId) return;
             if(!formatted[r.eventId.name]) formatted[r.eventId.name] = [];
             formatted[r.eventId.name].push({
                rank: r.position, name: r.athleteId.name,
                chest: r.athleteId.admissionNumber, dept: r.athleteId.department,
                gender: r.athleteId.gender, performance: r.performance, isMR: r.isMR, isPB: r.isPB
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
               body: JSON.stringify({username: loginUser.value, password: loginPass.value})
           });
           const data = await res.json();
           if(res.ok) {
               API.token = data.token; API.role = data.user.role; API.username = data.user.username;
               localStorage.setItem('tp_token', API.token); localStorage.setItem('tp_role', API.role); localStorage.setItem('tp_user', API.username);
               document.getElementById('navLoginBtn').textContent = 'Logout';
               checkAuthUI();
               toast('Login successful', 'success');
               showPage('home');
           } else { toast(data.message, 'error'); }
       } catch(e) { toast('Login failed', 'error'); }
    });

    function checkAuthUI() {
        if(API.token) {
           document.getElementById('navLoginBtn').textContent = 'Logout';
           document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'block');
           if(API.role !== 'admin') {
              document.querySelectorAll('.auth-admin').forEach(el => el.style.display = 'none');
           }
        } else {
           document.getElementById('navLoginBtn').textContent = 'Login';
           document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
        }
    }
`;

html = html.replace(dbCode, apiCode);

// 2. Wrap INIT in an async IIFE to load API
html = html.replace('/* ===== INIT ===== */', `/* ===== INIT ===== */
    (async function initApp() {
      await API.loadAll();
      checkAuthUI();
`);

// Find the line with loader hide (usually the last init line) and close the IIFE
html = html.replace("setTimeout(() => { document.getElementById('loader').classList.add('hide') }, 1000);",
    "setTimeout(() => { document.getElementById('loader').classList.add('hide') }, 1000);\n      if(window.location.hash === '#results') setInterval(async()=>{await API.loadAll(); loadResults();}, 5000); // Live Results\n    })();");

// 3. Rewrite registerAthlete to use fetchPOST
html = html.replace(/function registerAthlete\(e\) \{[\s\S]*?toast\('Registration successful!', 'success'\);\n    \}/,
    `async function registerAthlete(e) {
      e.preventDefault();
      if (!selectedEvents.length) { toast('Please select at least one event!', 'warning'); return }
      
      const adminNum = document.getElementById('regAdmission').value; // We mapped chest to admission essentially. Or we can keep chest. TrackPro old DB had chest internally. Let's send admission number as chest if we need to.
      // Wait, model Athlete says admissionNumber. Old code uses chest logic. We will map admissionNumber to chest locally if user typed something in ID:
      
      const athlete = {
        name: document.getElementById('regName').value,
        admissionNumber: String(DB.nextChest()).padStart(3, '0'), // Auto-generate admissionNumber like old Chest for simplicity
        department: document.getElementById('regDept').value,
        gender: document.getElementById('regGender').value,
        events: selectedEvents
      };
      
      try {
          const res = await fetch(API.base + '/athletes', {
              method: 'POST', headers: API.headers(), body: JSON.stringify(athlete)
          });
          if(res.ok) {
              await API.loadAll(); // update local array
              resetRegForm();
              toast('Registration successful! Chest No: ' + athlete.admissionNumber, 'success');
              animateCounters();
          } else { const err = await res.json(); toast(err.message || 'Error', 'error'); }
      } catch(e) { toast('Error registering athlete', 'error'); }
    }`);

// Also fix stats DB.getAthletes().length to use API.athletes etc
html = html.replace(/const athletes = DB.getAthletes\(\), events = DB.getEvents\(\), results = DB.getResults\(\);/g, `await API.loadAll(); const athletes = DB.getAthletes(), events = DB.getEvents(), results = DB.getResults();`);

// Add Medal Count ID Card Generate call to showProfile function
html = html.replace(/function showProfile\(a\) \{[\s\S]*?\}\)/,
    `function showProfile(a) {
      const mc = document.getElementById('modalContent');
      let histHTML = '<p class="text2" style="margin-top:10px;font-size:0.9rem">No events yet</p>';
      if (a.events && a.events.length) {
        histHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">';
        a.events.forEach(evName => { histHTML += \`<span class="event-chip">\${evName}</span>\` });
        histHTML += '</div>';
      }
      mc.innerHTML = \`
        <div class="modal-header">
          <h3>Athlete Profile</h3>
          <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <h2 style="font-size:1.8rem;color:var(--electric);margin-bottom:5px">\${a.name}</h2>
            <p style="color:var(--text2);margin-bottom:15px"><i class="fas fa-id-badge"></i> \${a.admissionNumber} &nbsp;|&nbsp; <i class="fas fa-venus-mars"></i> \${a.gender}</p>
            <div style="background:var(--navy);padding:10px 15px;border-radius:var(--radius2);border:1px solid var(--glass3);display:inline-block">
              <span style="font-weight:600;color:var(--gold)">\${a.department}</span>
            </div>
          </div>
          <div style="width:120px;height:120px;background:var(--navy);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--glass3);border:4px solid var(--glass2)">
             <i class="fas fa-user-circle"></i>
          </div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="generateIDCard('\${a._id || a.id}')"><i class="fas fa-qrcode"></i> Generate ID Card</button>
        <div id="qrCodeContainer" style="display:none; text-align:center;"></div>
        <h4 style="margin-top:20px;color:var(--text2);font-size:0.9rem;text-transform:uppercase;letter-spacing:1px">Events</h4>
        \${histHTML}
      \`;
      document.getElementById('modalOverlay').classList.add('active');
    }
    
    function generateIDCard(id) {
       const a = API.athletes.find(x => (x._id || x.id) == id);
       if(!a) return;
       const qrContainer = document.getElementById('qrCodeContainer');
       qrContainer.style.display = 'block';
       qrContainer.innerHTML = '<h4>ID Card QR</h4>';
       new QRCode(qrContainer, {
           text: JSON.stringify({ name: a.name, id: a.admissionNumber, dept: a.department, events: a.events }),
           width: 128, height: 128, colorDark : "#00b4ff", colorLight : "#ffffff"
       });
    }`);

// Finally replace addEvent logic
html = html.replace(/function addEvent\(\) \{[\s\S]*?toast\('Event added!', 'success'\);\n    \}/,
    `async function addEvent() {
      const name = document.getElementById('newEventName').value.trim();
      const type = document.getElementById('newEventType').value;
      const category = document.getElementById('newEventCategory').value;
      if (!name) return;
      try {
         const res = await fetch(API.base + '/events', {
            method: 'POST', headers: API.headers(), body: JSON.stringify({name, type, category})
         });
         if(res.ok) {
            await API.loadAll();
            closeModal(); renderAdminEvents(); renderEventChips(); toast('Event added!', 'success');
         } else { toast('Error adding event', 'error'); }
      } catch(e) { toast('Network error', 'error'); }
    }`);

fs.writeFileSync('index.html', html);
console.log('Refactoring complete.');
