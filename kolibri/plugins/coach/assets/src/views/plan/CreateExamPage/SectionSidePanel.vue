<template>

  <div>
    <SidePanelModal
      v-if="$route.params.section_id"
      ref="resourcePanel"
      alignment="right"
      sidePanelWidth="700px"
      :closeButtonIconType="closeIcon"
      @closePanel="handleClosePanel"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <component :is="panel" :ref="$route.name" :closePanelRoute="closePanelRoute" />
    </SidePanelModal>
    <ConfirmCancellationModal
      v-if="showConfirmationModal"
      :closePanelRoute="closePanelRoute"
      @cancel="showConfirmationModal = false"
    />
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { PageNames } from '../../../constants';

  export default {
    name: 'SectionSidePanel',
    components: {
      SidePanelModal,
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
      handleClosePanel() {
        this.$router.push({ name: PageNames.EXAM_CREATION_ROOT });
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
