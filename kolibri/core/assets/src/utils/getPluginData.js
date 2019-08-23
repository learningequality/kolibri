export default function getPluginData() {
  return (global['kolibriPluginDataGlobal'] || {})[__kolibriModuleName] || {};
}
