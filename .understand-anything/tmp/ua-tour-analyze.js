#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ENTRY_FILENAMES = new Set([
  'index.ts', 'index.js', 'main.ts', 'main.js', 'main.jsx',
  'app.ts', 'app.js', 'app.jsx',
  'server.ts', 'server.js',
  'mod.rs', 'main.go', 'main.py', 'main.rs', 'manage.py', 'app.py',
  'wsgi.py', 'asgi.py', 'run.py', '__main__.py',
  'Application.java', 'Main.java', 'Program.cs', 'config.ru', 'index.php',
  'App.swift', 'Application.kt', 'main.cpp', 'main.c',
]);

function isCodeFile(node) {
  return node.type === 'file';
}

function isDocFile(node) {
  return node.type === 'document';
}

function depthFromRoot(filePath) {
  if (!filePath) return 99;
  const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.length <= 2 ? 1 : 0;
}

function scoreEntryPoint(node, fanOutRank, fanInRank, totalNodes) {
  let score = 0;
  const name = node.name || path.basename(node.filePath || '');

  if (isCodeFile(node)) {
    if (ENTRY_FILENAMES.has(name)) score += 3;
    if (depthFromRoot(node.filePath)) score += 1;
    const top10FanOut = Math.ceil(totalNodes * 0.1);
    if (fanOutRank <= top10FanOut && fanOutRank > 0) score += 1;
    const bottom25FanIn = Math.floor(totalNodes * 0.25);
    if (fanInRank >= totalNodes - bottom25FanIn) score += 1;
  }

  if (isDocFile(node)) {
    const fp = (node.filePath || '').replace(/\\/g, '/');
    if (name === 'README.md' && !fp.includes('/')) score += 5;
    else if (name.endsWith('.md') && !fp.includes('/')) score += 2;
  }

  return score;
}

function buildFanCounts(nodes, edges) {
  const fanIn = new Map();
  const fanOut = new Map();
  for (const n of nodes) {
    fanIn.set(n.id, 0);
    fanOut.set(n.id, 0);
  }
  for (const e of edges) {
    if (fanIn.has(e.target)) fanIn.set(e.target, fanIn.get(e.target) + 1);
    if (fanOut.has(e.source)) fanOut.set(e.source, fanOut.get(e.source) + 1);
  }
  return { fanIn, fanOut };
}

function rankNodes(fanMap, nodes, key) {
  return nodes
    .map((n) => ({ id: n.id, [key]: fanMap.get(n.id) || 0, name: n.name, summary: n.summary || '' }))
    .sort((a, b) => b[key] - a[key] || a.id.localeCompare(b.id))
    .slice(0, 20);
}

function bfsFromEntry(startId, nodes, edges) {
  const nodeSet = new Set(nodes.map((n) => n.id));
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if ((e.type === 'imports' || e.type === 'calls') && adj.has(e.source) && nodeSet.has(e.target)) {
      adj.get(e.source).push(e.target);
    }
  }

  const order = [];
  const depthMap = {};
  const byDepth = {};
  const visited = new Set();

  if (!nodeSet.has(startId)) {
    return { startNode: startId, order, depthMap, byDepth };
  }

  const queue = [{ id: startId, depth: 0 }];
  visited.add(startId);

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    order.push(id);
    depthMap[id] = depth;
    const dk = String(depth);
    if (!byDepth[dk]) byDepth[dk] = [];
    byDepth[dk].push(id);

    for (const next of adj.get(id) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ id: next, depth: depth + 1 });
      }
    }
  }

  return { startNode: startId, order, depthMap, byDepth };
}

function findTopCodeEntry(candidates, nodes) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const c of candidates) {
    const n = nodeById.get(c.id);
    if (n && isCodeFile(n)) return c.id;
  }
  const code = nodes.filter(isCodeFile);
  return code.length ? code[0].id : null;
}

function categorizeNonCode(nodes) {
  const result = {
    documentation: [],
    infrastructure: [],
    data: [],
    config: [],
  };

  for (const n of nodes) {
    const entry = { id: n.id, name: n.name, type: n.type, summary: n.summary || '' };
    switch (n.type) {
      case 'document':
        result.documentation.push(entry);
        break;
      case 'service':
      case 'pipeline':
      case 'resource':
        result.infrastructure.push(entry);
        break;
      case 'table':
      case 'schema':
      case 'endpoint':
        result.data.push(entry);
        break;
      case 'config':
        result.config.push(entry);
        break;
      default:
        break;
    }
  }

  return result;
}

function findClusters(nodes, edges) {
  const forward = new Map();
  const backward = new Map();

  for (const e of edges) {
    if (!forward.has(e.source)) forward.set(e.source, new Set());
    forward.get(e.source).add(e.target);
    if (!backward.has(e.target)) backward.set(e.target, new Set());
    backward.get(e.target).add(e.source);
  }

  const bidirectionalPairs = [];
  const seenPair = new Set();

  for (const e of edges) {
    const rev =
      (backward.get(e.source) && backward.get(e.source).has(e.target)) ||
      (forward.get(e.target) && forward.get(e.target).has(e.source));
    if (rev) {
      const key = [e.source, e.target].sort().join('||');
      if (!seenPair.has(key)) {
        seenPair.add(key);
        bidirectionalPairs.push([e.source, e.target]);
      }
    }
  }

  const clusters = [];
  const used = new Set();

  for (const [a, b] of bidirectionalPairs) {
    let cluster = [a, b];
    const clusterSet = new Set(cluster);

    let expanded = true;
    while (expanded && cluster.length < 5) {
      expanded = false;
      for (const n of nodes) {
        if (clusterSet.has(n.id) || used.has(n.id)) continue;
        let connections = 0;
        for (const member of cluster) {
          const out = forward.get(member);
          const inn = backward.get(member);
          if ((out && out.has(n.id)) || (inn && inn.has(n.id))) connections++;
        }
        if (connections >= 2) {
          cluster.push(n.id);
          clusterSet.add(n.id);
          expanded = true;
          if (cluster.length >= 5) break;
        }
      }
    }

    const key = cluster.slice().sort().join('||');
    if (!used.has(key)) {
      used.add(key);
      let edgeCount = 0;
      for (const e of edges) {
        if (clusterSet.has(e.source) && clusterSet.has(e.target)) edgeCount++;
      }
      clusters.push({ nodes: cluster, edgeCount });
    }
  }

  clusters.sort((a, b) => b.edgeCount - a.edgeCount || b.nodes.length - a.nodes.length);
  return clusters.slice(0, 10);
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error('Usage: node ua-tour-analyze.js <input.json> <output.json>');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (err) {
    console.error('Failed to read input:', err.message);
    process.exit(1);
  }

  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const layers = data.layers || [];

  const { fanIn, fanOut } = buildFanCounts(nodes, edges);

  const fanInSorted = [...nodes].sort((a, b) => (fanIn.get(b.id) || 0) - (fanIn.get(a.id) || 0));
  const fanOutSorted = [...nodes].sort((a, b) => (fanOut.get(b.id) || 0) - (fanOut.get(a.id) || 0));

  const fanInRankMap = new Map(fanInSorted.map((n, i) => [n.id, i + 1]));
  const fanOutRankMap = new Map(fanOutSorted.map((n, i) => [n.id, i + 1]));

  const entryPointCandidates = nodes
    .map((n) => ({
      id: n.id,
      score: scoreEntryPoint(n, fanOutRankMap.get(n.id) || 0, fanInRankMap.get(n.id) || 0, nodes.length),
      name: n.name,
      summary: n.summary || '',
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 5);

  const topCodeEntry = findTopCodeEntry(entryPointCandidates, nodes);
  const bfsTraversal = topCodeEntry ? bfsFromEntry(topCodeEntry, nodes, edges) : { startNode: null, order: [], depthMap: {}, byDepth: {} };

  const nodeSummaryIndex = {};
  for (const n of nodes) {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary || '' };
  }

  const output = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking: rankNodes(fanIn, nodes, 'fanIn'),
    fanOutRanking: rankNodes(fanOut, nodes, 'fanOut'),
    bfsTraversal,
    nonCodeFiles: categorizeNonCode(nodes),
    clusters: findClusters(nodes, edges),
    layers: {
      count: layers.length,
      list: layers.map((l) => ({ id: l.id, name: l.name, description: l.description || '' })),
    },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
}

main();
