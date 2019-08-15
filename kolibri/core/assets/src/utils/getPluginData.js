export default function getPluginData() {
  return (global['__kolibriPluginData'] || {})[__kolibriModuleName] || {};
}
