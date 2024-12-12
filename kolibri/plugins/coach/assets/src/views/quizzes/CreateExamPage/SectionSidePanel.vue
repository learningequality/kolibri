<template>

  <SidePanelModal
    v-if="showSidePanel"
    ref="resourcePanel"
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="handleClosePanel"
    @shouldFocusFirstEl="findFirstEl()"
  >
    <template #header>
      <KIconButton
        v-if="canGoBack"
        icon="back"
        @click="$router.go(-1)"
      />
    </template>
    <router-view @closePanel="handleClosePanel" />
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { ref, watch, computed, getCurrentInstance } from 'vue';
  import { PageNames } from '../../../constants';

  export default {
    name: 'SectionSidePanel',
    components: {
      SidePanelModal,
    },
    setup() {
      const store = getCurrentInstance().proxy.$store;
      const router = getCurrentInstance().proxy.$router;
      const route = computed(() => store.state.route);

      const canGoBack = ref(false);
      const showSidePanel = computed(() => route.value?.name !== PageNames.EXAM_CREATION_ROOT);

      function handleClosePanel() {
        router.push({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: route.value.params.classId,
            quizId: route.value.params.quizId,
            sectionIndex: route.value.params.sectionIndex,
          },
          query: { ...route.value.query },
        });
      }

      watch(route, (newRoute, oldRoute) => {
        // Here we basically handle all of the edge cases around when we do and don't show the back
        // button in the heading of the side panel -- basically, we're going for:
        //  - If we just loaded, no back arrow (ie, refresh the page w/ the panel open)
        //  - If we're viewing bookmarks or have gone into a topic show the back arrow
        //  - If we're still not on the same route as before, then show it
        canGoBack.value =
          oldRoute.name !== PageNames.EXAM_CREATION_ROOT && // We didn't just get here
          newRoute.name !== PageNames.QUIZ_SECTION_EDITOR && // The new route isn't section editor // One of these is also true...
          (Boolean(newRoute.query.showBookmarks) || // We're viewing bookmarks
            Boolean(newRoute.params.topic_id) || // We're viewing a topic
            oldRoute.name !== newRoute.name); // We're just not on the same page within the panel
      });

      return {
        canGoBack,
        showSidePanel,
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
