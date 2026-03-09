const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace saveResults
const oldSaveResultsRegex = /function saveResults\(\) \{[\s\S]*?toast\('✅ Results saved[\s\S]*?\}\n/;
const newSaveResults = `async function saveResults() {
      const evName = document.getElementById('resultEventSelect').value;
      if (!evName) { toast('Select an event first!', 'warning'); return; }
      
      // Match UI event name "100m" to Mongo event. Old events had name = '100m'.
      const eventObj = API.events.find(e => e.name === evName || \`\${e.name} - \${e.category}\` === evName);
      if(!eventObj) { toast('Event not found in Database', 'error'); return; }
      
      const results = [];
      document.querySelectorAll('.result-input').forEach(inp => {
        const id = inp.dataset.id;
        const rank = document.querySelector('.rank-input[data-id="' + id + '"]');
        const unit = document.querySelector('.unit-select[data-id="' + id + '"]');
        if (inp.value.trim()) {
           const ath = API.athletes.find(a => (a._id || a.id) == id);
           if(ath) {
             results.push({
               eventId: eventObj._id,
               athleteId: ath._id,
               performance: inp.value.trim() + (unit ? unit.value : 's'),
               position: parseInt(rank.value) || 999
             });
           }
        }
      });
      if (results.length === 0) { toast('Enter at least one result!', 'warning'); return; }
      
      try {
         for(let r of results) {
            await fetch(API.base + '/results', {
               method: 'POST', headers: API.headers(), body: JSON.stringify(r)
            });
         }
         await API.loadAll();
         renderPodium(evName);
         renderFullRankings(evName);
         renderResultsSummary();
         populateResultEvents();
         renderMedalCount(); // Update Medal Count
         document.getElementById('resultEventSelect').value = evName;
         toast('✅ Results saved for ' + evName + '! (' + results.length + ' records)', 'success');
      } catch(e) { toast('Error saving results', 'error'); }
    }
`;

html = html.replace(oldSaveResultsRegex, newSaveResults);

// Add renderMedalCount function and initialize it on load
const addMedalFuncRegex = /\/\* ===== INIT ===== \*\//;
const medalFunc = `    async function renderMedalCount() {
       try {
           const res = await fetch(API.base + '/results/medal-count');
           if(!res.ok) return;
           const data = await res.json();
           let html = '<div class="table-container"><table><tr><th>Rank</th><th>Department</th><th>🥇 Gold</th><th>🥈 Silver</th><th>🥉 Bronze</th><th>Total Pts</th></tr>';
           data.forEach((d, i) => {
              const pts = (d.gold*5) + (d.silver*3) + (d.bronze*1);
              html += \`<tr class="\${i===0?'gold-row':''}"><td>\${i+1}</td><td style="font-weight:bold">\${d.department}</td><td>\${d.gold}</td><td>\${d.silver}</td><td>\${d.bronze}</td><td style="color:var(--gold);font-weight:bold">\${pts}</td></tr>\`;
           });
           html += '</table></div>';
           document.getElementById('deptPointTableContainer').innerHTML = html;
       } catch(e) { console.error(e); }
    }
    
    /* ===== INIT ===== */`;

html = html.replace(addMedalFuncRegex, medalFunc);

// Hook renderMedalCount into INIT
html = html.replace('await API.loadAll();', 'await API.loadAll(); await renderMedalCount();');

// Delete Athlete uses API
const oldDeleteRegex = /function deleteAthlete\(id\) \{[\s\S]*?DB\.saveAthletes\(athletes\);[\s\S]*?toast\('Athlete deleted', 'info'\);\n    \}/;
const newDelete = `async function deleteAthlete(id) {
       try {
          const res = await fetch(API.base + '/athletes/' + id, { method: 'DELETE', headers: API.headers() });
          if(res.ok) {
             await API.loadAll();
             renderAdminAthletes(); toast('Athlete deleted', 'info');
             animateCounters();
          }
       } catch(e) {}
    }`;
html = html.replace(oldDeleteRegex, newDelete);

fs.writeFileSync('index.html', html);
