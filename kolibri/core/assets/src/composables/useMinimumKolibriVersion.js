import { computed } from 'kolibri.lib.vueCompositionApi';

export default function useMinimumKolibriVersion() {
  const isMinimumKolibriVersion = computed(() => {
    return function(version, majorVersion = 0, minorVersion = 15, revisionVersion = 0) {
      // defaults to kolibri 0.15.0
      const v = version.split('.');
      if (v.length < 2) return false;
      const mayor = parseInt(v[0]);
      const minor = parseInt(v[1]);
      const revision = parseInt(v[2]);
      if (!(!isNaN(mayor) && !isNaN(minor) && !isNaN(revision))) return false;
      if (mayor > majorVersion) return true;
      if (mayor === majorVersion) {
        if (minor > minorVersion) return true;
        if (minor === minorVersion) {
          if (revision >= revisionVersion) return true;
        }
      }
      return false;
    };
  });

  return {
    isMinimumKolibriVersion,
  };
}
