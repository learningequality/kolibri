<template>

  <SidePanelModal
    v-if="$route.params.section_id"
    ref="resourcePanel"
    alignment="right"
    sidePanelWidth="700px"
    :closeButtonIconType="closeIcon"
    @closePanel="handleClosePanel"
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
    data() {
      return {
        prevRoute: { name: PageNames.EXAM_CREATION_ROOT },
      };
    },
    computed: {
      panel() {
        return pageNameComponentMap[this.$route.name];
      },
      closePanelRoute() {
        if (this.closeIcon === 'close') {
          return { name: PageNames.EXAM_CREATION_ROOT };
        } else {
          return this.prevRoute;
        }
      },
      /**
       * When the previous route was the root page OR select resources, we want an X icon.
       * Otherwise, we want a back icon.
       * X  means "close this side panel"
       * <- means "go back to last view of this panel" - which we only want when we were selecting
       *           resources.
       */
      closeIcon() {
        return this.prevRoute.name === PageNames.EXAM_CREATION_ROOT ||
          this.prevRoute.name === PageNames.QUIZ_SELECT_RESOURCES
          ? 'close'
          : 'back';
      },
    },
    watch: {
      $route: function(_, o) {
        this.prevRoute = o;
      },
    },
    methods: {
      handleClosePanel() {
        this.$emit('closePanel');
        this.$router.replace(this.closePanelRoute);
      },
      /**
       * Calls the currently displayed ref's focusFirstEl method.
       */
      findFirstEl() {
        this.$refs.resourcePanel.focusFirstEl();
      },
    },
  };

</script>
