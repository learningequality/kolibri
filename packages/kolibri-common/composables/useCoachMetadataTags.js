import { ref } from 'kolibri.lib.vueCompositionApi';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import coreStrings from 'kolibri.utils.coreStrings';
import commonCoreStringsMixin from 'kolibri.coreVue.mixins.commonCoreStrings';

export function useCoachMetadataTags(contentNode) {

    const tags = ref([]);

    const getCategoryTags = () => {
        if (!contentNode.categories) return [];
        return contentNode.categories.map(category => 
          commonCoreStringsMixin.methods.coreString(category));
    };

    return {
        tags
    }
}