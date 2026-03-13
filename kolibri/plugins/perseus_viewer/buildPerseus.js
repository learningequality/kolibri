const fs = require('fs');
const path = require('path');
const extractPerseusMessages = require('./extractPerseusMessages');

// Copy MathJax fonts from mathjax-full to the Perseus plugin's static assets
// directory where Tex.js expects them (via urls.static('assets/perseus_viewer/fonts')).
// mathjax-full is a dependency of @khanacademy/mathjax-renderer.
// In pnpm's virtual store, it's a sibling in the same node_modules directory
// (e.g. .pnpm/<pkg>/node_modules/mathjax-full).
const mathjaxRendererDir = path.dirname(
  require.resolve('@khanacademy/mathjax-renderer/package.json'),
);
// Go up from @khanacademy/mathjax-renderer to node_modules, then into mathjax-full
const mathjaxFontsSource = path.join(
  mathjaxRendererDir,
  '../../mathjax-full/ts/output/chtml/fonts/tex-woff-v2',
);
const mathjaxFontsTarget = path.resolve(
  __dirname,
  'static/assets/mathjax/fonts',
);
fs.mkdirSync(mathjaxFontsTarget, { recursive: true });
const fontFiles = fs.readdirSync(mathjaxFontsSource).filter(f => f.endsWith('.woff'));
for (const fontFile of fontFiles) {
  fs.copyFileSync(
    path.join(mathjaxFontsSource, fontFile),
    path.join(mathjaxFontsTarget, fontFile),
  );
}
console.log(`Copied ${fontFiles.length} MathJax font files to ${mathjaxFontsTarget}`);

// Now that the file has been built, we can extract all the perseus messages.
extractPerseusMessages();
