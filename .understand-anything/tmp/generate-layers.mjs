import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const input = JSON.parse(readFileSync(resolve(projectRoot, '.understand-anything/tmp/ua-arch-input.json'), 'utf8'));
const results = JSON.parse(readFileSync(resolve(projectRoot, '.understand-anything/tmp/ua-arch-results.json'), 'utf8'));

const layers = {
  'layer:fe-pages': [],
  'layer:fe-components': [],
  'layer:fe-services-utils': [],
  'layer:be-routes': [],
  'layer:be-controllers': [],
  'layer:be-services': [],
  'layer:be-models': [],
  'layer:be-middleware': [],
  'layer:constants-config': [],
  'layer:seed-scripts': [],
};

const assign = (layerId, ids) => {
  for (const id of ids) {
    if (!layers[layerId].includes(id)) layers[layerId].push(id);
  }
};

assign('layer:fe-pages', results.feSubgroups.pages);
assign('layer:fe-pages', results.feSubgroups.layouts);
assign('layer:fe-pages', ['file:FE/src/App.jsx', 'file:FE/src/main.jsx', 'file:FE/index.html']);

assign('layer:fe-components', results.feSubgroups.components);
assign('layer:fe-components', results.feSubgroups.styles);
assign('layer:fe-components', results.feSubgroups.assets);
assign('layer:fe-components', ['file:FE/src/App.css', 'file:FE/src/index.css']);

assign('layer:fe-services-utils', results.feSubgroups.utils);
assign('layer:fe-services-utils', results.feSubgroups.services);
assign('layer:fe-services-utils', results.feSubgroups.hooks);
assign('layer:fe-services-utils', results.feSubgroups.data);

assign('layer:be-routes', results.beSubgroups.routes);
assign('layer:be-routes', ['file:BE/server.js', 'file:BE/src/app.js']);

assign('layer:be-controllers', results.beSubgroups.controllers);

assign('layer:be-services', results.beSubgroups.services);
assign('layer:be-services', results.beSubgroups.utils);

assign('layer:be-models', results.beSubgroups.models);

assign('layer:be-middleware', results.beSubgroups.middleware);

assign('layer:constants-config', results.beSubgroups.constants);
assign('layer:constants-config', results.feSubgroups.constants);
assign('layer:constants-config', results.beSubgroups.config);
assign('layer:constants-config', [
  'config:BE/.env.example',
  'config:BE/package.json',
  'config:FE/package.json',
  'file:FE/vite.config.js',
  'file:FE/eslint.config.js',
  'config:.cursor/mcp.json',
  'config:.cursor/settings.json',
  'file:.understand-anything/.understandignore',
  'document:README.md',
  'document:FE/README.md',
]);

const seedIds = [
  ...results.beSubgroups['backfill-roles.js'],
  ...results.beSubgroups['seed-ctsv-demo.js'],
  ...results.beSubgroups['seed-events.js'],
  ...results.beSubgroups['seed.js'],
  ...results.beSubgroups['seed-clubs.js'],
  ...results.beSubgroups['seed-event-reviews.js'],
  ...results.beSubgroups.scripts,
  ...results.beSubgroups.data,
];
assign('layer:seed-scripts', seedIds);
assign('layer:seed-scripts', ['file:test_api.ps1', 'file:test_role_detection.ps1']);

const allAssigned = new Set(Object.values(layers).flat());
const allNodes = input.fileNodes.map((n) => n.id);
const missing = allNodes.filter((id) => !allAssigned.has(id));
const duplicate = allNodes.filter((id, i, arr) => arr.indexOf(id) !== i);

if (missing.length) {
  console.error('Missing assignments:', missing);
  process.exit(1);
}

const assignedList = Object.values(layers).flat();
if (assignedList.length !== allNodes.length) {
  const extra = assignedList.filter((id) => !allNodes.includes(id));
  const dupInLayers = assignedList.length - new Set(assignedList).size;
  console.error('Count mismatch', { total: allNodes.length, assigned: assignedList.length, dupInLayers, extra });
  process.exit(1);
}

const output = [
  {
    id: 'layer:fe-pages',
    name: 'Trang Frontend',
    description: 'Các trang React và layout cho portal Sinh viên, CTSV, Admin và luồng đăng nhập của F-Events.',
    nodeIds: layers['layer:fe-pages'].sort(),
  },
  {
    id: 'layer:fe-components',
    name: 'Component Frontend',
    description: 'Component UI tái sử dụng, stylesheet và asset thương hiệu cho giao diện Vite/React.',
    nodeIds: layers['layer:fe-components'].sort(),
  },
  {
    id: 'layer:fe-services-utils',
    name: 'Dịch vụ & Util Frontend',
    description: 'Client API, hook, helper và dữ liệu mock phục vụ gọi backend và logic phía trình duyệt.',
    nodeIds: layers['layer:fe-services-utils'].sort(),
  },
  {
    id: 'layer:be-routes',
    name: 'Route Backend',
    description: 'Định nghĩa route Express cho auth, event, club, admin, CTSV và điểm khởi động server.',
    nodeIds: layers['layer:be-routes'].sort(),
  },
  {
    id: 'layer:be-controllers',
    name: 'Controller Backend',
    description: 'Controller nhận HTTP request, validate đầu vào và ủy quyền xử lý cho service tương ứng.',
    nodeIds: layers['layer:be-controllers'].sort(),
  },
  {
    id: 'layer:be-services',
    name: 'Service Backend',
    description: 'Business logic sự kiện, câu lạc bộ, đăng ký, xác thực cùng các util JWT và xử lý lỗi.',
    nodeIds: layers['layer:be-services'].sort(),
  },
  {
    id: 'layer:be-models',
    name: 'Model Backend',
    description: 'Schema Mongoose cho User, Event, Club, Partner, Contract và các entity nghiệp vụ F-Events.',
    nodeIds: layers['layer:be-models'].sort(),
  },
  {
    id: 'layer:be-middleware',
    name: 'Middleware Backend',
    description: 'Middleware Express cho xác thực JWT, phân quyền theo role và xử lý lỗi tập trung.',
    nodeIds: layers['layer:be-middleware'].sort(),
  },
  {
    id: 'layer:constants-config',
    name: 'Hằng số & Cấu hình',
    description: 'Hằng số workflow sự kiện, cấu hình MongoDB/env, package.json, Vite/ESLint và tài liệu dự án.',
    nodeIds: layers['layer:constants-config'].sort(),
  },
  {
    id: 'layer:seed-scripts',
    name: 'Seed & Script',
    description: 'Script seed dữ liệu demo, bảo trì MongoDB, kiểm thử thủ công và fixture phục vụ phát triển.',
    nodeIds: layers['layer:seed-scripts'].sort(),
  },
];

writeFileSync(resolve(projectRoot, '.understand-anything/intermediate/layers.json'), JSON.stringify(output, null, 2));

console.log('Layers written successfully:');
for (const l of output) {
  console.log(`  ${l.name}: ${l.nodeIds.length} files`);
}
console.log(`Total: ${output.reduce((s, l) => s + l.nodeIds.length, 0)} / ${allNodes.length}`);
