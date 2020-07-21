import permissionPresets from '../../../../core/auth/constants/facility_configuration_presets.json';

// aliasing 'informal' to 'personal' since it's how we talk about it
const Presets = Object.freeze({
  PERSONAL: 'informal',
  FORMAL: 'formal',
  NONFORMAL: 'nonformal',
});

export { permissionPresets, Presets };
