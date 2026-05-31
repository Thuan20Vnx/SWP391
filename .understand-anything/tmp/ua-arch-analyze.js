#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DIR_PATTERNS = {
  routes: 'api', api: 'api', controllers: 'api', endpoints: 'api', handlers: 'api',
  services: 'service', core: 'service', lib: 'service', domain: 'service', logic: 'service',
  models: 'data', db: 'data', data: 'data', persistence: 'data', repository: 'data', entities: 'data',
  components: 'ui', views: 'ui', pages: 'ui', ui: 'ui', layouts: 'ui', screens: 'ui',
  middleware: 'middleware', plugins: 'middleware', interceptors: 'middleware', guards: 'middleware',
  utils: 'utility', helpers: 'utility', common: 'utility', shared: 'utility', tools: 'utility',
  config: 'config', constants: 'config', env: 'config', settings: 'config',
  __tests__: 'test', test: 'test', tests: 'test', spec: 'test', specs: 'test',
  types: 'types', interfaces: 'types', schemas: 'types', contracts: 'types', dtos: 'types',
  hooks: 'hooks',
  store: 'state', state: 'state', reducers: 'state', actions: 'state', slices: 'state',
  assets: 'assets', static: 'assets', public: 'assets',
  migrations: 'data',
  management: 'config', commands: 'config',
  templatetags: 'utility',
  signals: 'service',
  serializers: 'api',
  cmd: 'entry',
  internal: 'service',
  pkg: 'utility',
  dto: 'types', request: 'types', response: 'types',
  entity: 'data',
  controller: 'api',
  routers: 'api',
  composables: 'service',
  blueprints: 'api',
  mailers: 'service', jobs: 'service', channels: 'service',
  bin: 'entry',
  docs: 'documentation', documentation: 'documentation', wiki: 'documentation',
  deploy: 'infrastructure', deployment: 'infrastructure', infra: 'infrastructure', infrastructure: 'infrastructure',
  '.github': 'ci-cd', '.gitlab': 'ci-cd', '.circleci': 'ci-cd',
  k8s: 'infrastructure', kubernetes: 'infrastructure', helm: 'infrastructure', charts: 'infrastructure',
  terraform: 'infrastructure', tf: 'infrastructure',
  docker: 'infrastructure',
  sql: 'data', database: 'data', schema: 'data',
  scripts: 'utility',
  styles: 'ui',
};

function classifyFilePattern(filePath, nodeType) {
  const base = path.basename(filePath);
  const lower = filePath.toLowerCase();

  if (/\.(test|spec)\./i.test(base) || /^test_/i.test(base) || /_test\.(go|py)$/i.test(base) ||
      /Test\.(java|cs)$/i.test(base) || /_spec\.(rb|js|ts)$/i.test(base) || /Tests\.cs$/i.test(base)) {
    return 'test';
  }
  if (/\.d\.ts$/i.test(base)) return 'types';
  if (/^(index\.(ts|js|jsx|tsx)|__init__\.py)$/i.test(base)) return 'entry';
  if (base === 'manage.py' && !filePath.includes('/')) return 'entry';
  if (/^(wsgi|asgi)\.py$/i.test(base)) return 'config';
  if (/^main\.go$/i.test(base) && /cmd\//i.test(filePath)) return 'entry';
  if (/^(main|lib)\.rs$/i.test(base) && filePath.startsWith('src/')) return 'entry';
  if (/^(Application\.java|Program\.cs)$/i.test(base)) return 'entry';
  if (base === 'config.ru') return 'entry';
  if (/^(Cargo\.toml|go\.mod|Gemfile|pom\.xml|build\.gradle|composer\.json)$/i.test(base)) return 'config';
  if (/^Dockerfile$/i.test(base) || /^docker-compose\./i.test(base)) return 'infrastructure';
  if (/\.(tf|tfvars)$/i.test(base)) return 'infrastructure';
  if (/\.github\/workflows\//i.test(filePath) || /\.gitlab-ci\.yml$/i.test(base) || base === 'Jenkinsfile') return 'ci-cd';
  if (/\.(sql)$/i.test(base)) return 'data';
  if (/\.(graphql|gql|proto)$/i.test(base)) return 'types';
  if (/\.(md|rst)$/i.test(base)) return 'documentation';
  if (base === 'Makefile') return 'infrastructure';

  if (nodeType === 'config') return 'config';
  if (nodeType === 'document') return 'documentation';
  if (nodeType === 'service' || nodeType === 'resource') return 'infrastructure';
  if (nodeType === 'pipeline') return 'ci-cd';
  if (nodeType === 'table' || nodeType === 'schema') return 'data';
  if (nodeType === 'endpoint') return 'api';

  return null;
}

function getFilePath(node) {
  return node.filePath || node.name || '';
}

function commonPathPrefix(paths) {
  if (paths.length === 0) return '';
  const splitPaths = paths.map((p) => p.split(/[/\\]/).filter(Boolean));
  if (splitPaths.every((parts) => parts.length <= 1)) return '';

  let prefix = [];
  const minLen = Math.min(...splitPaths.map((p) => p.length));
  for (let i = 0; i < minLen; i++) {
    const seg = splitPaths[0][i];
    if (splitPaths.every((p) => p[i] === seg)) prefix.push(seg);
    else break;
  }
  return prefix.length > 0 ? prefix.join('/') + '/' : '';
}

function assignDirectoryGroup(filePath, prefix) {
  const rel = prefix && filePath.startsWith(prefix)
    ? filePath.slice(prefix.length)
    : filePath;

  const parts = rel.split(/[/\\]/).filter(Boolean);
  if (parts.length === 0) return 'root';
  if (parts.length === 1) {
    const ext = path.extname(parts[0]);
    if (ext) {
      if (/\.(test|spec)\./i.test(parts[0])) return 'test';
      if (/\.config\./i.test(parts[0])) return 'config';
      return 'root';
    }
    return parts[0];
  }
  return parts[0];
}

function classifyDirectoryGroup(groupName, samplePath) {
  const lower = groupName.toLowerCase();
  if (DIR_PATTERNS[lower]) return DIR_PATTERNS[lower];

  if (groupName === 'BE' || groupName === 'FE') {
    const sub = samplePath.split(/[/\\]/).filter(Boolean);
    const idx = sub.indexOf(groupName);
    if (idx >= 0 && sub[idx + 1]) {
      const inner = sub[idx + 1].toLowerCase();
      if (DIR_PATTERNS[inner]) return DIR_PATTERNS[inner];
    }
  }

  const filePat = classifyFilePattern(samplePath, 'file');
  return filePat || 'unknown';
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error('Usage: node ua-arch-analyze.js <input.json> <output.json>');
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (err) {
    console.error('Failed to read input:', err.message);
    process.exit(1);
  }

  const { fileNodes, importEdges, allEdges } = input;
  if (!Array.isArray(fileNodes)) {
    console.error('Invalid input: fileNodes must be an array');
    process.exit(1);
  }

  const nodeById = Object.fromEntries(fileNodes.map((n) => [n.id, n]));
  const paths = fileNodes.map(getFilePath);
  const prefix = commonPathPrefix(paths);

  const directoryGroups = {};
  const nodeToGroup = {};
  for (const node of fileNodes) {
    const fp = getFilePath(node);
    const group = assignDirectoryGroup(fp, prefix);
    if (!directoryGroups[group]) directoryGroups[group] = [];
    directoryGroups[group].push(node.id);
    nodeToGroup[node.id] = group;
  }

  const nodeTypeGroups = {};
  for (const node of fileNodes) {
    if (!nodeTypeGroups[node.type]) nodeTypeGroups[node.type] = [];
    nodeTypeGroups[node.type].push(node.id);
  }

  const fileFanOut = {};
  const fileFanIn = {};
  for (const node of fileNodes) {
    fileFanOut[node.id] = 0;
    fileFanIn[node.id] = 0;
  }

  const adjacency = {};
  for (const e of (importEdges || [])) {
    if (e.type !== 'imports') continue;
    if (!nodeById[e.source] || !nodeById[e.target]) continue;
    if (!adjacency[e.source]) adjacency[e.source] = new Set();
    adjacency[e.source].add(e.target);
    fileFanOut[e.source] = (fileFanOut[e.source] || 0) + 1;
    fileFanIn[e.target] = (fileFanIn[e.target] || 0) + 1;
  }

  const groupImportCounts = {};
  const addGroupImport = (from, to) => {
    const key = `${from}->${to}`;
    groupImportCounts[key] = (groupImportCounts[key] || 0) + 1;
  };

  for (const e of (importEdges || [])) {
    if (e.type !== 'imports') continue;
    const sg = nodeToGroup[e.source];
    const tg = nodeToGroup[e.target];
    if (sg && tg) addGroupImport(sg, tg);
  }

  const interGroupImports = Object.entries(groupImportCounts).map(([key, count]) => {
    const [from, to] = key.split('->');
    return { from, to, count };
  });

  const intraGroupDensity = {};
  for (const group of Object.keys(directoryGroups)) {
    let internalEdges = 0;
    let totalEdges = 0;
    for (const e of (importEdges || [])) {
      if (e.type !== 'imports') continue;
      const sg = nodeToGroup[e.source];
      const tg = nodeToGroup[e.target];
      if (sg === group || tg === group) {
        totalEdges++;
        if (sg === group && tg === group) internalEdges++;
      }
    }
    intraGroupDensity[group] = {
      internalEdges,
      totalEdges,
      density: totalEdges > 0 ? internalEdges / totalEdges : 0,
    };
  }

  const crossCategoryMap = {};
  for (const e of (allEdges || [])) {
    const src = nodeById[e.source];
    const tgt = nodeById[e.target];
    if (!src || !tgt) continue;
    const key = `${src.type}|${tgt.type}|${e.type}`;
    crossCategoryMap[key] = (crossCategoryMap[key] || 0) + 1;
  }

  const crossCategoryEdges = Object.entries(crossCategoryMap).map(([key, count]) => {
    const [fromType, toType, edgeType] = key.split('|');
    return { fromType, toType, edgeType, count };
  });

  const patternMatches = {};
  for (const [group, ids] of Object.entries(directoryGroups)) {
    const sampleNode = nodeById[ids[0]];
    const samplePath = getFilePath(sampleNode);
    patternMatches[group] = classifyDirectoryGroup(group, samplePath);
  }

  const infraPatterns = [
    /^Dockerfile$/i, /^docker-compose\./i, /\.(tf|tfvars)$/i,
    /k8s\//i, /kubernetes\//i, /helm\//i, /terraform\//i, /docker\//i,
  ];
  const ciPatterns = [
    /\.github\/workflows\//i, /\.gitlab-ci\.yml$/i, /^Jenkinsfile$/i,
  ];

  const infraFiles = [];
  let hasDockerfile = false;
  let hasCompose = false;
  let hasK8s = false;
  let hasTerraform = false;
  let hasCI = false;

  for (const node of fileNodes) {
    const fp = getFilePath(node);
    const base = path.basename(fp);
    if (/^Dockerfile$/i.test(base)) { hasDockerfile = true; infraFiles.push(fp); }
    if (/^docker-compose\./i.test(base)) { hasCompose = true; infraFiles.push(fp); }
    if (/k8s|kubernetes|helm\//i.test(fp)) { hasK8s = true; infraFiles.push(fp); }
    if (/\.(tf|tfvars)$/i.test(base) || /terraform\//i.test(fp)) { hasTerraform = true; infraFiles.push(fp); }
    if (ciPatterns.some((p) => p.test(fp))) { hasCI = true; infraFiles.push(fp); }
    if (node.type === 'service' || node.type === 'resource') infraFiles.push(fp);
    if (node.type === 'pipeline') { hasCI = true; infraFiles.push(fp); }
  }

  const deploymentTopology = {
    hasDockerfile,
    hasCompose,
    hasK8s,
    hasTerraform,
    hasCI,
    infraFiles: [...new Set(infraFiles)],
  };

  const schemaPatterns = [/\.(sql|graphql|gql|proto)$/i, /schema/i];
  const migrationPatterns = [/migrations?\//i, /migration/i];
  const modelPatterns = [/models?\//i, /\/model\./i];
  const apiPatterns = [/routes?\//i, /controllers?\//i, /handlers?\//i, /api\//i];

  const dataPipeline = {
    schemaFiles: [],
    migrationFiles: [],
    dataModelFiles: [],
    apiHandlerFiles: [],
  };

  for (const node of fileNodes) {
    const fp = getFilePath(node);
    if (schemaPatterns.some((p) => p.test(fp)) || node.type === 'schema') {
      dataPipeline.schemaFiles.push(fp);
    }
    if (migrationPatterns.some((p) => p.test(fp))) {
      dataPipeline.migrationFiles.push(fp);
    }
    if (modelPatterns.some((p) => p.test(fp)) || node.type === 'table') {
      dataPipeline.dataModelFiles.push(fp);
    }
    if (apiPatterns.some((p) => p.test(fp)) || node.type === 'endpoint') {
      dataPipeline.apiHandlerFiles.push(fp);
    }
  }

  const groupsWithDocs = new Set();
  for (const node of fileNodes) {
    const fp = getFilePath(node);
    const group = nodeToGroup[node.id];
    if (/readme\.md$/i.test(fp) || node.type === 'document') {
      groupsWithDocs.add(group);
    }
    if (/^docs\//i.test(fp)) {
      const parts = fp.split(/[/\\]/);
      if (parts.length > 1) groupsWithDocs.add(parts[0]);
    }
  }

  const totalGroups = Object.keys(directoryGroups).length;
  const docCoverage = {
    groupsWithDocs: groupsWithDocs.size,
    totalGroups,
    coverageRatio: totalGroups > 0 ? groupsWithDocs.size / totalGroups : 0,
    undocumentedGroups: Object.keys(directoryGroups).filter((g) => !groupsWithDocs.has(g)),
  };

  const pairCounts = {};
  for (const { from, to, count } of interGroupImports) {
    if (from === to) continue;
    const key = [from, to].sort().join('<>');
    if (!pairCounts[key]) pairCounts[key] = {};
    pairCounts[key][from] = (pairCounts[key][from] || 0) + count;
  }

  const dependencyDirection = [];
  for (const [key, counts] of Object.entries(pairCounts)) {
    const [a, b] = key.split('<>');
    const aToB = counts[a] || 0;
    const bToA = counts[b] || 0;
    if (aToB > bToA) dependencyDirection.push({ dependent: a, dependsOn: b });
    else if (bToA > aToB) dependencyDirection.push({ dependent: b, dependsOn: a });
  }

  const filesPerGroup = {};
  for (const [g, ids] of Object.entries(directoryGroups)) {
    filesPerGroup[g] = ids.length;
  }

  const nodeTypeCounts = {};
  for (const [t, ids] of Object.entries(nodeTypeGroups)) {
    nodeTypeCounts[t] = ids.length;
  }

  const beSubgroups = {};
  const feSubgroups = {};
  for (const node of fileNodes) {
    const fp = getFilePath(node);
    const parts = fp.split(/[/\\]/).filter(Boolean);
    if (parts[0] === 'BE' && parts.length >= 3 && parts[1] === 'src') {
      const sub = parts[2];
      if (!beSubgroups[sub]) beSubgroups[sub] = [];
      beSubgroups[sub].push(node.id);
    } else if (parts[0] === 'BE') {
      const sub = parts[1] || 'root';
      const key = parts[1] === 'src' ? 'src' : sub;
      if (!beSubgroups[key]) beSubgroups[key] = [];
      beSubgroups[key].push(node.id);
    }
    if (parts[0] === 'FE' && parts.length >= 3 && parts[1] === 'src') {
      const sub = parts[2];
      if (!feSubgroups[sub]) feSubgroups[sub] = [];
      feSubgroups[sub].push(node.id);
    } else if (parts[0] === 'FE') {
      const sub = parts[1] || 'root';
      if (!feSubgroups[sub]) feSubgroups[sub] = [];
      feSubgroups[sub].push(node.id);
    }
  }

  const result = {
    scriptCompleted: true,
    commonPrefix: prefix,
    directoryGroups,
    beSubgroups,
    feSubgroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      nodeTypeCounts,
    },
    fileFanIn,
    fileFanOut,
  };

  try {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Failed to write output:', err.message);
    process.exit(1);
  }
}

main();
