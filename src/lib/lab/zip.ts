/** Minimal ZIP writer (stored entries, no compression) so a lab project can be downloaded without a dependency. */

let table: Uint32Array | null = null;
function crc32(bytes: Uint8Array) {
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export function makeZip(files: Record<string, string>): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());

  for (const [path, content] of Object.entries(files)) {
    const name = enc.encode(path);
    const data = enc.encode(content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint16(30, 0, true);
    cd.setUint16(32, 0, true);
    cd.setUint16(34, 0, true);
    cd.setUint16(36, 0, true);
    cd.setUint32(38, 0, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }

  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, Object.keys(files).length, true);
  end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  end.setUint16(20, 0, true);
  const blobParts: BlobPart[] = [...parts, ...central, new Uint8Array(end.buffer)].map((u) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer);
  return new Blob(blobParts, { type: "application/zip" });
}

/** Wraps lab files into a runnable Playwright project. */
export function projectFiles(files: Record<string, string>, opts: { name: string; baseURL: string; title: string }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) out[p] = c;
  out["package.json"] = JSON.stringify(
    {
      name: opts.name,
      private: true,
      scripts: { test: "playwright test", "test:headed": "playwright test --headed", report: "playwright show-report" },
      devDependencies: { "@playwright/test": "^1.49.1", "@types/node": "^20" },
    },
    null,
    2,
  );
  out["playwright.config.ts"] = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: '${opts.baseURL}',
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
`;
  out["README.md"] = `# ${opts.title}

Exported from QA Interview Ready live labs. The same code that ran in the browser lab runs here with real Playwright.

\`\`\`bash
npm install
npx playwright install chromium
npm test
\`\`\`

The tests run against the hosted practice app at ${opts.baseURL}. Change \`baseURL\` in \`playwright.config.ts\` to point them elsewhere.
`;
  out[".gitignore"] = "node_modules/\ntest-results/\nplaywright-report/\n";
  return out;
}
