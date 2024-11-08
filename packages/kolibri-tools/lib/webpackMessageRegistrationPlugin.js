const { kolibriName } = require('kolibri-tools/lib/kolibriName');
const {
  sources: { ConcatSource },
} = require('webpack');

class MessageRegistrationPlugin {
  constructor({ injectAfterBundle = false, moduleName } = {}) {
    this.injectAfterBundle = injectAfterBundle;
    this.moduleName = moduleName;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('MessageRegistrationPlugin', compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: 'MessageRegistrationPlugin',
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          // Get the entry points
          const entrypoints = compilation.entrypoints;

          entrypoints.forEach(entrypoint => {
            // Get the first JS file from the entrypoint
            const entryFiles = entrypoint.getFiles();
            const mainFile = entryFiles.find(file => file.endsWith('.js'));

            if (mainFile && compilation.assets[mainFile]) {
              const asset = compilation.assets[mainFile];

              // Create the injection code using the DefinePlugin value
              const injectionCode = `
                (function() {
                  window.${kolibriName}.registerLanguageAssets('${this.moduleName}');
                })();\n
              `;

              // Create a new concatenated source
              const newSource = new ConcatSource(
                ...(this.injectAfterBundle ? [asset, injectionCode] : [injectionCode, asset]),
              );
              // Update the asset with the new source
              compilation.updateAsset(mainFile, newSource);
            }
          });
        },
      );
    });
  }
}

module.exports = MessageRegistrationPlugin;
