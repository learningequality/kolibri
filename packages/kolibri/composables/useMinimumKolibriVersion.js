import { useMemoize } from '@vueuse/core';
import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

/**
 * Defaults to returning true if version is 0.15+
 *
 * If values are not provided for revisionVersion, then any values are allowed. This means that if
 * no value is provided for revisionVersion then alpha and beta versions will be permitted. Just
 * providing 0 as majorVersion and 15 as minorVersion would allow any version greater than or equal
 * to 0.15 (including any alphas or betas)
 *
 * @param majorVersion
 * @param minorVersion
 * @param revisionVersion
 * @return {{isMinimumKolibriVersion: (function(version: string): boolean)}}
 */
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
