const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'FB Backend API');

const toDelete = [
  'Example/Create Example.request.yaml',
  'Example/Delete Example.request.yaml',
  'Example/Get Example By ID.request.yaml',
  'Example/List Examples.request.yaml',
  'Example/Update Example.request.yaml',
  'Insights/Get Available Metrics.request.yaml',
  'Insights/Get Multiple Page Insights-1.request.yaml',
  'Insights/Get Multiple Page Insights.request.yaml',
  'Insights/Get Multiple Post Insights.request.yaml',
  'Insights/Get Page Insights-1.request.yaml',
  'Insights/Get Page Insights.request.yaml',
  'Insights/Get Post Insights.request.yaml',
  'Insights/Insights Health.request.yaml',
  'Insights/Insights.postman_collection.json',
];

toDelete.forEach(f => {
  const p = path.join(base, f);
  try {
    fs.unlinkSync(p);
    console.log('Deleted: ' + f);
  } catch (e) {
    console.log('Skip: ' + f + ' (' + e.message + ')');
  }
});

const gen = path.join(base, 'General');
try {
  fs.rmSync(gen, { recursive: true, force: true });
  console.log('Deleted folder: General');
} catch (e) {
  console.log('Skip General: ' + e.message);
}

console.log('CLEANUP COMPLETE');
