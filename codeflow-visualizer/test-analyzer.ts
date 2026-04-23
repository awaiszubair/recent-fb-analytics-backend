import { TypeScriptAnalyzer } from "./src/analyzer";
import * as path from "path";

async function run() {
  const analyzer = new TypeScriptAnalyzer(path.resolve("../"));
  const data = await analyzer.analyzeFile(path.resolve("../src/services/saveFacebookData.service.ts"));
  
  const processJobNodes = data.nodes.filter(n => n.name.includes("processPageSyncJob"));
  console.log("Nodes found:", processJobNodes);
  
  const processJobIds = processJobNodes.map(n => n.id);
  const outgoingEdges = data.edges.filter(e => processJobIds.includes(e.source));
  
  console.log("Outgoing edges from processPageSyncJob:");
  console.log(outgoingEdges);
}

run().catch(console.error);
