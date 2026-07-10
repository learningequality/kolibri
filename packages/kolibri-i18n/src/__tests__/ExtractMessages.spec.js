import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import extractMessages from '../ExtractMessages';

const fixtureDir = path.resolve(__dirname, '../__fixtures__/localeRouting');

describe('ExtractMessages per-namespace routing', () => {
  let pluginBase;
  let fallbackBase;

  beforeEach(() => {
    pluginBase = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));
    fallbackBase = fs.mkdtempSync(path.join(os.tmpdir(), 'fallback-'));
  });

  afterEach(() => {
    fs.rmSync(pluginBase, { recursive: true, force: true });
    fs.rmSync(fallbackBase, { recursive: true, force: true });
  });

  it('writes each namespace to its own localeDataFolder, falling back otherwise', async () => {
    const pathInfo = [
      {
        moduleFilePath: fixtureDir,
        namespace: 'plugin_ns',
        name: 'plugin_ns',
        localeDataFolder: pluginBase,
      },
      { moduleFilePath: fixtureDir, namespace: 'core_ns', name: 'core_ns' },
    ];

    await extractMessages(pathInfo, ['**/node_modules/**'], fallbackBase, false);

    expect(
      fs.existsSync(path.join(pluginBase, 'en', 'LC_MESSAGES', 'plugin_ns-messages.csv')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(fallbackBase, 'en', 'LC_MESSAGES', 'core_ns-messages.csv')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(fallbackBase, 'en', 'LC_MESSAGES', 'plugin_ns-messages.csv')),
    ).toBe(false);
  });
});
