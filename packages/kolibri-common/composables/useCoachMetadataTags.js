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

    const getLevelTags = () => {
        if (!contentNode.grade_levels) return [];
        return contentNode.grade_levels.map
        (grade_levels => commonCoreStringsMixin.methods.coreString(grade_levels));
    };

    const getLanguageTag = () => {
        if (!contentNode.lang) return [];
        return contentNode.lang.length > 1 ? ['Multiple languages'] : [contentNode.lang.lang_name];
    };

    const getActivityTag = () => {
        if (!contentNode.learning_activities) return [];
    
        return contentNode.learning_activities.length > 1 ? ['Multiple learning activities'] :
            contentNode.learning_activities.map(activity =>
              commonCoreStringsMixin.methods.coreString(activity)
            );
    };
    

    return {
        tags
    }
}