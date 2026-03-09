const fetch = require('node-fetch');
async function test() {
  try {
    const [a, b, c] = await Promise.all([
      fetch('http://localhost:3000/api/athletes'),
      fetch('http://localhost:3000/api/events'),
      fetch('http://localhost:3000/api/results')
    ]);
    console.log(a.ok, b.ok, c.ok);
  } catch(e) { console.error("Caught:", e); }
}
test();
