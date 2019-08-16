export default function getPluginData() {
  return (global['kolibriPluginData'] || {})[__kolibriModuleName] || {};
}
