import { currentLanguage } from 'kolibri.utils.i18n';
import findKey from 'lodash/findKey';
import { permissionPresets } from './constants';
import * as formsActions from './actions/forms';
import * as mainActions from './actions/main';
import mutations from './mutations';

export default {
  state: {
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
  },
  actions: {
    ...formsActions,
    ...mainActions,
  },
  mutations,
};
