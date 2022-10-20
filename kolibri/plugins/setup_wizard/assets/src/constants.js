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

const SoudQueue = 'soud_sync';

export { permissionPresets, Presets, UsePresets, SoudQueue };
