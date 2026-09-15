// Background runner for automated scheduled posting

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

console.log('====================================================');
console.log('  AlphaPost Background Scheduling Daemon Running    ');
console.log('====================================================');
console.log('Watching for scheduled automations every 60 seconds...');

async function checkAutomations() {
  if (!fs.existsSync(DB_FILE)) return;
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(raw);
    const now = new Date();

    for (const auto of db.automations || []) {
      if (!auto.enabled) continue;

      const nextRun = auto.nextRunAt ? new Date(auto.nextRunAt) : new Date(0);
      if (now >= nextRun) {
        console.log(`[${now.toLocaleTimeString()}] Triggering scheduled automation: "${auto.name}"`);

        try {
          // Call local run endpoint
          const res = await fetch('http://localhost:3000/api/run-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ automationId: auto.id, dryRun: false }),
          });
          const result = await res.json();
          console.log(`[${now.toLocaleTimeString()}] Result:`, result.ok ? `Published OK -> ${result.title}` : `Error -> ${result.error}`);
        } catch (err) {
          console.error(`[${now.toLocaleTimeString()}] Execution request failed:`, err.message);
        }

        // Set next run with slight jitter
        const hours = auto.waitHours || 4;
        const jitterMinutes = Math.floor(Math.random() * 15);
        const nextTime = new Date(now.getTime() + (hours * 3600000) + (jitterMinutes * 60000));
        auto.nextRunAt = nextTime.toISOString();
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
        console.log(`Next run scheduled at: ${nextTime.toLocaleTimeString()} (${nextTime.toLocaleDateString()})`);
      }
    }

    // Also check bulk scheduled queue via cron endpoint
    try {
      const cronRes = await fetch('http://localhost:3000/api/cron', { method: 'POST' });
      const cronData = await cronRes.json();
      if (cronData.processedCount > 0) {
        console.log(`[${now.toLocaleTimeString()}] Bulk Queue processed ${cronData.processedCount} scheduled post(s):`, cronData.results);
      }
    } catch (cronErr) {
      // Ignore if local server is booting
    }
  } catch (err) {
    console.error('Error in scheduler daemon loop:', err);
  }
}

setInterval(checkAutomations, 60000);
checkAutomations();

