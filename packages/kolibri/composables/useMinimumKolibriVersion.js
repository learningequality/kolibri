import { useMemoize } from '@vueuse/core';
import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

/**
 * Defaults to returning true if version is 0.15+.
 *
 * If values are not provided for revisionVersion, then any values are allowed. This means that if
 * no value is provided for revisionVersion then alpha and beta versions will be permitted. Just
 * providing 0 as majorVersion and 15 as minorVersion would allow any version greater than or equal
 * to 0.15 (including any alphas or betas).
 * @param {number} majorVersion - Inclusive lower bound for the major version component.
 * @param {number} minorVersion - Inclusive lower bound for the minor version component.
 * @param {?number} revisionVersion - Inclusive lower bound for the revision component, or
 * null to permit any revision (including alphas and betas).
 * @returns {{isMinimumKolibriVersion: (version: string) => boolean}} An object exposing a
 * memoised predicate that reports whether a given version string meets the minimum.
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
