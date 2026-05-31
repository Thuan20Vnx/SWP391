import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const graphPath = resolve(projectRoot, '.understand-anything/intermediate/assembled-graph.json');
const outPath = resolve(projectRoot, '.understand-anything/tmp/ua-arch-input.json');

const FILE_NODE_TYPES = new Set([
  'file', 'config', 'document', 'service', 'pipeline',
  'table', 'schema', 'resource', 'endpoint',
]);

const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
const fileNodeIds = new Set(
  graph.nodes.filter((n) => FILE_NODE_TYPES.has(n.type)).map((n) => n.id)
);

const fileNodes = graph.nodes.filter((n) => fileNodeIds.has(n.id));

const isFileLevelEdge = (e) =>
  fileNodeIds.has(e.source) && fileNodeIds.has(e.target);

const importEdges = graph.edges.filter(
  (e) => e.type === 'imports' && isFileLevelEdge(e)
);

const allEdges = graph.edges.filter(isFileLevelEdge);

const output = { fileNodes, importEdges, allEdges };
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${fileNodes.length} file nodes, ${importEdges.length} import edges, ${allEdges.length} all edges`);
