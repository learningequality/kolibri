<template>

  <SidePanelModal
    v-if="showSidePanel"
    ref="resourcePanel"
    alignment="right"
    sidePanelWidth="700px"
    :closeButtonIconType="closeBackIcon"
    @closePanel="handleClosePanel"
    @shouldFocusFirstEl="findFirstEl()"
  >
    <router-view @closePanel="handleClosePanel" />
  </SidePanelModal>

</template>


<script>

  import { onClickOutside } from '@vueuse/core';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { ref, watch, computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
  import logging from 'kolibri.lib.logging';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import { PageNames } from '../../../constants';

  const logger = logging.getLogger(__filename);

  export default {
    name: 'SectionSidePanel',
    components: {
      SidePanelModal,
    },
    setup(_, context) {
      const { activeSection } = injectQuizCreation();
      const store = getCurrentInstance().proxy.$store;
      const router = getCurrentInstance().proxy.$router;
      const route = computed(() => store.state.route);
      const section_id = computed(() => route.value.params.section_id);

      const routeWhenSidePanelOpened = route.value;
      const prevRoute = ref({ name: PageNames.EXAM_CREATION_ROOT });
      const canCloseSidePanel = ref(true);

      watch(route, (to, from) => {
        // We're on the same route we were on when we started so should be able to close it
        canCloseSidePanel.value =
          to.name === routeWhenSidePanelOpened.name &&
          // I tried using _.isEqual on the params & query objects but it didn't work as I expected
          // so this is hard-coded for now.
          to.params.section_id === routeWhenSidePanelOpened.params.section_id &&
          to.params.topic_id === routeWhenSidePanelOpened.params.topic_id &&
          to.query.showBookmarks === routeWhenSidePanelOpened.query.showBookmarks &&
          to.query.search === routeWhenSidePanelOpened.query.search;

        prevRoute.value = from;
      });

      function handleClosePanel() {
        if (canCloseSidePanel.value) {
          // Avoid redundant navigation error
          if (prevRoute.value.name === PageNames.EXAM_CREATION_ROOT) {
            router.back();
          } else {
            router.push({ name: PageNames.EXAM_CREATION_ROOT });
          }
        } else {
          router.back();
        }
      }

      onClickOutside(context.refs.resourcePanel, () => {
        canCloseSidePanel.value = true;
        handleClosePanel();
      });

      const closeBackIcon = computed(() => {
        if (canCloseSidePanel.value) {
          return 'close';
        } else {
          return 'back';
        }
      });

      /**
       * Avoids flashing the side panel when we're going to just hide it anyway.
       */
      let showSidePanel = false;

      if (section_id.value !== activeSection.value.section_id) {
        logger.warn("Section ID doesn't match active section ID, forcing close of side panel.");
        router.push({ name: PageNames.EXAM_CREATION_ROOT });
      } else {
        showSidePanel = true;
      }

      return {
        showSidePanel,
        canCloseSidePanel,
        closeBackIcon,
        handleClosePanel,
      };
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
