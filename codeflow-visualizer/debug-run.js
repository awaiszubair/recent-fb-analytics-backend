// Final verification test
const path = require('path');
const { TypeScriptAnalyzer } = require('./out/analyzer');

const rootPath = path.resolve(__dirname, '..');
const filePath = path.join(rootPath, 'src', 'cron', 'tasks', 'fullSync.task.ts');

const analyzer = new TypeScriptAnalyzer(rootPath);

analyzer.analyzeFile(filePath).then(result => {
  console.log(`NODES: ${result.nodes.length}, EDGES: ${result.edges.length}`);
  console.log('');
  result.edges.forEach(e => {
    const src = result.nodes.find(n => n.id === e.source);
    const tgt = result.nodes.find(n => n.id === e.target);
    console.log(`  ${src?.name}  -->  ${tgt?.name}`);
  });
}).catch(err => console.error('ERROR:', err.message));
