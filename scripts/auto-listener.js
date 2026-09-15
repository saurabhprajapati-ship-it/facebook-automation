// PostNova 24/7 Background Auto-DM Listener
// Continuously monitors Instagram comments and dispatches automated DMs without requiring any manual button clicks.

const INTERVAL_MS = 20000; // 20 seconds interval

async function checkComments() {
  try {
    const res = await fetch('http://localhost:3000/api/auto-dm/run-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.sentCount > 0) {
      console.log(`[${new Date().toLocaleTimeString()}] ✅ Auto-delivered ${data.sentCount} DM(s) to new commenters!`);
    }
  } catch (err) {
    // Ignore when server is restarting
  }
}

console.log('🚀 PostNova Auto-DM 24/7 Background Listener active (checking every 20s)...');
setInterval(checkComments, INTERVAL_MS);
// Run initial check immediately
checkComments();
