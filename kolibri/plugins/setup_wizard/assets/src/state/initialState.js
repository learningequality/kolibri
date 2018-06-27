import { currentLanguage } from 'kolibri.utils.i18n';
import findKey from 'lodash/findKey';
import { permissionPresets } from './constants';

export default {
  onboardingData: {
    language_id: currentLanguage,
    facility: {
      name: '',
    },
    superuser: {
      full_name: '',
      username: '',
      password: '',
    },
    preset: findKey(permissionPresets, preset => preset.default) || '',
  },
  loading: false,
  error: false,
  onboardingStep: 1,
};
