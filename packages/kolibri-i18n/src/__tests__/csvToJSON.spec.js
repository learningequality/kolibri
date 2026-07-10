import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import csvToJSON from '../csvToJSON';

const fixtureDir = path.resolve(__dirname, '../__fixtures__/localeRouting');

describe('csvToJSON per-namespace routing', () => {
  let pluginBase;
  let fallbackBase;
  let langInfoPath;

  beforeEach(() => {
    pluginBase = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));
    fallbackBase = fs.mkdtempSync(path.join(os.tmpdir(), 'fallback-'));

    // Seed the plugin's CSV so parseCSVDefinitions has something to read.
    const csvDir = path.join(pluginBase, 'en', 'LC_MESSAGES');
    fs.mkdirSync(csvDir, { recursive: true });
    fs.writeFileSync(
      path.join(csvDir, 'plugin_ns-messages.csv'),
      'Identifier,Source String,Context,Translation\nRoutingTest.hello,Hello,A greeting,Hello\n',
    );

    langInfoPath = path.join(fallbackBase, 'langInfo.json');
    fs.writeFileSync(langInfoPath, JSON.stringify([{ crowdin_code: 'en', intl_code: 'en' }]));
  });

  afterEach(() => {
    fs.rmSync(pluginBase, { recursive: true, force: true });
    fs.rmSync(fallbackBase, { recursive: true, force: true });
  });

  it('writes each namespace JSON to its own localeDataFolder', () => {
    const pathInfo = [
      {
        moduleFilePath: fixtureDir,
        name: 'plugin_ns',
        namespace: 'plugin_ns',
        localeDataFolder: pluginBase,
      },
    ];

    csvToJSON(pathInfo, ['**/node_modules/**'], langInfoPath, fallbackBase, false);

    expect(
      fs.existsSync(path.join(pluginBase, 'en', 'LC_MESSAGES', 'plugin_ns-messages.json')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(fallbackBase, 'en', 'LC_MESSAGES', 'plugin_ns-messages.json')),
    ).toBe(false);
  });
});
