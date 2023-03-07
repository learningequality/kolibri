import permissionPresets from '../../../../core/auth/constants/facility_configuration_presets.json';

// aliasing 'informal' to 'personal' since it's how we talk about it
const Presets = Object.freeze({
  PERSONAL: 'informal',
  FORMAL: 'formal',
  NONFORMAL: 'nonformal',
});

/**
 * enum identifying whether the user has gone to the on my own flow or not
 */
const UsePresets = Object.freeze({
  ON_MY_OWN: 'on my own',
  GROUP: 'group',
});

const FacilityTypePresets = Object.freeze({
  NEW: 'NEW',
  IMPORT: 'IMPORT',
});

const LodTypePresets = Object.freeze({
  JOIN: 'JOIN',
  IMPORT: 'IMPORT',
});

const DeviceTypePresets = Object.freeze({
  FULL: 'FULL',
  LOD: 'LOD',
});

const FooterMessageTypes = Object.freeze({
  NEW_FACILITY: 'NEW_FACILITY',
  IMPORT_FACILITY: 'IMPORT_FACILITY',
  IMPORT_INDIVIDUALS: 'IMPORT_INDIVIDUALS',
  JOIN_FACILITY: 'JOIN_FACILITY',
});

const SoudQueue = 'soud_sync';

export {
  permissionPresets,
  DeviceTypePresets,
  FacilityTypePresets,
  Presets,
  UsePresets,
  SoudQueue,
  LodTypePresets,
  FooterMessageTypes,
};
