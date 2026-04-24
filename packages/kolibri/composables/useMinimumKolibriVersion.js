import { useMemoize } from '@vueuse/core';
import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

export default function useMinimumKolibriVersion(
  majorVersion = 0,
  minorVersion = 15,
  revisionVersion = null,
) {
  const isMinimumKolibriVersion = useMemoize(version => {
    if (!version) {
      logging.error('A version is required');
      return false;
    }
    const v = version.split('.');
    if (v.length < 3) {
      logging.error('The full version format (e.g. 0.15.0) is required');
      return false;
    }
    const major = parseInt(v[0]);
    const minor = parseInt(v[1]);
    let revision = parseInt(v[2]);
    if (version.includes('-')) revision--;
    if (!(!isNaN(major) && !isNaN(minor) && !isNaN(revision))) return false;
    if (major > majorVersion) return true;
    if (major === majorVersion) {
      if (minor > minorVersion) return true;
      if (minor === minorVersion) {
        if (revisionVersion === null || revision >= revisionVersion) return true;
      }
    }
    return false;
  });

  return {
    isMinimumKolibriVersion,
  };
}
