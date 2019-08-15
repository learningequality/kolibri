export default function getPluginData() {
  return (global[__kolibriPluginDataName] || {})[__kolibriModuleName] || {};
}
