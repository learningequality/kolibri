import { mapGetters } from 'vuex';
import themeModule, { THEME_MODULE_NAMESPACE } from '../state/modules/theme';

export default {
  computed: {
    ...mapGetters(THEME_MODULE_NAMESPACE, Object.keys(themeModule.getters)),
  },
};
