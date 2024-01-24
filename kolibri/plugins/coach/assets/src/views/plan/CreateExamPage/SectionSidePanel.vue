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
      <component :is="panel" :ref="$route.name" />
    </SidePanelModal>
    <ConfirmCancellationModal
      v-if="showConfirmationModal"
      :closePanelRoute="closePanelRoute"
    />
  </div>
</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { PageNames } from '../../../constants';
  import ResourceSelectionBreadcrumbs from '../../plan/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import SectionEditor from './SectionEditor';
  import ReplaceQuestions from './ReplaceQuestions';
  import ResourceSelection from './ResourceSelection';
  import ConfirmCancellationModal from './ConfirmCancellationModal.vue';
  //import ShowBookMarkedResources from './ShowBookMarkedResources.vue';
  // import SelectedChannel from './SelectedChannel.vue';

  const pageNameComponentMap = {
    [PageNames.QUIZ_SECTION_EDITOR]: SectionEditor,
    [PageNames.QUIZ_REPLACE_QUESTIONS]: ReplaceQuestions,
    [PageNames.QUIZ_SELECT_RESOURCES]: ResourceSelection,
    //[PageNames.BOOK_MARKED_RESOURCES]: ShowBookMarkedResources,
  };

  export default {
    name: 'SectionSidePanel',
    components: {
    SidePanelModal,
    SectionEditor,
    ReplaceQuestions,
    ResourceSelection,
    // SelectedChannel,
    ResourceSelectionBreadcrumbs,
    ConfirmCancellationModal
},
    setup() {

      const {
        //Computed
        resetWorkingResourcePool,
      } = injectQuizCreation();

      return {
        resetWorkingResourcePool,
      };
    },
    data() {
      return {
        showConfirmationModal: false,
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

        this.showConfirmationModal = true;
        this.resetWorkingResourcePool();

        this.$emit('closePanel');
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
