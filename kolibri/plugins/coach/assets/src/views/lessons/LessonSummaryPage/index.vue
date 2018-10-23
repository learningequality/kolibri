<template>

  <div class="lesson-summary">

    <assignment-summary
      :kind="lessonKind"
      :title="lessonTitle"
      :active="lessonActive"
      :description="lessonDescription"
      :recipients="lessonAssignments"
      :groups="learnerGroups"
      @changeStatus="setLessonsModal(AssignmentActions.CHANGE_STATUS)"
    >
      <k-dropdown-menu
        slot="optionsDropdown"
        :text="$tr('options')"
        :options="lessonOptions"
        @select="handleSelectOption"
      />
    </assignment-summary>

    <div>
      <div class="resource-list">
        <div class="resource-list-header">
          <div class="resource-list-header-title-block">
            <h2 class="resource-list-header-title">{{ $tr('resources') }}</h2>
          </div>
          <div class="resource-list-header-add-resource-button">
            <k-router-link
              :to="lessonSelectionRootPage"
              :text="$tr('addResourcesButtonPrompt')"
              :primary="true"
              appearance="raised-button"
            />
          </div>
        </div>
      </div>

      <resource-list-table v-if="workingResources.length" />

      <p v-else class="no-resources-message">
        {{ $tr('noResourcesInLesson') }}
      </p>

      <manage-lesson-modals />
    </div>

  </div>

</template>


<script>

  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import map from 'lodash/map';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { AssignmentActions } from '../../../constants/assignmentsConstants';
  import { selectionRootLink } from '../lessonsRouterUtils';
  import AssignmentSummary from '../../assignments/AssignmentSummary';
  import { setLessonsModal } from '../../../state/actions/lessons';
  import ManageLessonModals from './ManageLessonModals';
  import ResourceListTable from './ResourceListTable';

  export default {
    name: 'lessonSummaryPage',
    components: {
      kDropdownMenu,
      ResourceListTable,
      ManageLessonModals,
      kRouterLink,
      AssignmentSummary,
    },
    computed: {
      lessonOptions() {
        return map(this.actionsToLabelMap, (label, action) => ({
          label: this.$tr(label),
          action,
        }));
      },
      actionsToLabelMap() {
        return {
          [AssignmentActions.EDIT_DETAILS]: 'editLessonDetails',
          [AssignmentActions.COPY]: 'copyLesson',
          [AssignmentActions.DELETE]: 'deleteLesson',
        };
      },
      AssignmentActions() {
        return AssignmentActions;
      },
      lessonSelectionRootPage() {
        return selectionRootLink({ lessonId: this.lessonId, classId: this.classId });
      },
      lessonKind() {
        return ContentNodeKinds.LESSON;
      },
    },
    methods: {
      handleSelectOption({ action }) {
        this.setLessonsModal(action);
      },
    },
    vuex: {
      actions: {
        setLessonsModal,
      },
      getters: {
        // IDEA refactor, make actions get all this information themselves.
        classId: state => state.classId,
        lessonId: state => state.pageState.currentLesson.id,
        lessonTitle: state => state.pageState.currentLesson.title,
        lessonActive: state => state.pageState.currentLesson.is_active,
        lessonDescription: state => state.pageState.currentLesson.description,
        lessonAssignments: state => state.pageState.currentLesson.lesson_assignments,
        lessonResources: state => state.pageState.currentLesson.resources,
        learnerGroups: state => state.pageState.learnerGroups,
        workingResources: state => state.pageState.workingResources,
      },
    },
    $trs: {
      // TODO make labels more semantic
      copyLesson: 'Copy lesson',
      deleteLesson: 'Delete',
      editLessonDetails: 'Edit details',
      noResourcesInLesson: 'No resources in this lesson',
      options: 'Options',
      resources: 'Resources',
      addResourcesButtonPrompt: 'Add resources',
    },
  };

</script>


<style lang="stylus" scoped>

  .resource-list-header
    // TODO use shared class or mixin
    // maintaining a simple right/left alignment in a single text-line without floats. Simple RTL
    display: table
    width: 100%

    &-title
      display: inline-block
      font-size: 1em

      &-block
        display: table-cell
        text-align: left

    &-add-resource-button
      display: table-cell
      text-align: right

  .no-resources-message
    text-align: center
    padding: 48px 0

</style>
