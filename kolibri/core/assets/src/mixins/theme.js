import { mapGetters } from 'vuex';
import themeModule, { nameSpace } from '../state/modules/theme';

export default {
  computed: {
    ...mapGetters(nameSpace, Object.keys(themeModule.getters)),
  },
};
