<template>

  <SidePanelModal
    v-if="$route.params.section_id"
    ref="resourcePanel"
    alignment="right"
    sidePanelWidth="700px"
    :closeButtonIconType="closeIcon"
    sidePanelWidth="600px"
    @closePanel="$router.back()"
    @shouldFocusFirstEl="findFirstEl()"
  >
    <component :is="panel" :ref="$route.name" />
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { PageNames } from '../../../constants';
  import SectionEditor from './SectionEditor';
  import ReplaceQuestions from './ReplaceQuestions';
  import ResourceSelection from './ResourceSelection';

  const pageNameComponentMap = {
    [PageNames.QUIZ_SECTION_EDITOR]: SectionEditor,
    [PageNames.QUIZ_REPLACE_QUESTIONS]: ReplaceQuestions,
    [PageNames.QUIZ_SELECT_RESOURCES]: ResourceSelection,
  };

  export default {
    name: 'SectionSidePanel',
    components: { SidePanelModal, SectionEditor, ReplaceQuestions, ResourceSelection },
    computed: {
      panel() {
        return pageNameComponentMap[this.$route.name];
      },
      closeIcon() {
        return this.$route.name === PageNames.QUIZ_SELECT_RESOURCES ? 'back' : 'close';
      },
    },
    methods: {
      /**
       * Calls the currently displayed ref's focusFirstEl method.
       */
      findFirstEl() {
        this.$refs.resourcePanel.focusFirstEl();
      },
    },
  };

</script>
