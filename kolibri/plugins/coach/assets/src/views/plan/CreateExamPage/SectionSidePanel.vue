<template>

  <SidePanelModal
    v-if="showSidePanel"
    ref="resourcePanel"
    alignment="right"
    sidePanelWidth="700px"
    :closeButtonIconType="closeIcon"
    @closePanel="handleClosePanel"
    @shouldFocusFirstEl="findFirstEl()"
  >
    <router-view @closePanel="handleClosePanel" />
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
  import logging from 'kolibri.lib.logging';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import { PageNames } from '../../../constants';

  const logger = logging.getLogger(__filename);

  export default {
    name: 'SectionSidePanel',
    components: {
      SidePanelModal,
    },
    setup() {
      const { activeSection } = injectQuizCreation();
      const store = getCurrentInstance().proxy.$store;
      const router = getCurrentInstance().proxy.$router;
      const route = computed(() => store.state.route);
      const section_id = computed(() => route.value.params.section_id);

      function handleClosePanel() {
        router.push({
          name: PageNames.EXAM_CREATION_ROOT,
          params: { section_id: null },
        });
      }

      /**
       * Avoids flashing the side panel when we're going to just hide it anyway.
       */
      let showSidePanel = false;

      if (section_id.value !== activeSection.value.section_id) {
        logger.warn("Section ID doesn't match active section ID, forcing close of side panel.");
        handleClosePanel();
      } else {
        showSidePanel = true;
      }
      return {
        showSidePanel,
        handleClosePanel,
      };
    },
    data() {
      return {
        prevRoute: { name: PageNames.EXAM_CREATION_ROOT },
      };
    },
    computed: {
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
      $route: function(_, from) {
        this.prevRoute = from;
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
