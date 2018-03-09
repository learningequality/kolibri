<template>

  <div class="lesson-summary">

    <assignment-summary
      :kind="lessonKind"
      :title="lessonTitle"
      :active="lessonActive"
      :description="lessonDescription"
      :recipients="lessonAssignments"
      :groups="learnerGroups"
      @changeStatus="currentAction = LessonActions.CHANGE_STATUS"
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

      <resource-list-table v-if="lessonResources.length" />

      <p v-else class="no-resources-message">
        {{ $tr('noResourcesInLesson') }}
      </p>

      <manage-lesson-modals
        :currentAction="currentAction"
        @cancel="currentAction=null"
      />
    </div>

  </div>

</template>


<script>

  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import ResourceListTable from './ResourceListTable';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import map from 'lodash/map';
  import ManageLessonModals from '../ManageLessonModals';
  import { LessonActions } from '../../../lessonsConstants';
  import { selectionRootLink } from '../lessonsRouterUtils';
  import AssignmentSummary from '../../assignments/AssignmentSummary';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'lessonSummaryPage',
    components: {
      kDropdownMenu,
      ResourceListTable,
      ManageLessonModals,
      kRouterLink,
      AssignmentSummary,
    },
    data() {
      return {
        currentAction: null,
      };
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
          [LessonActions.EDIT_DETAILS]: 'editLessonDetails',
          [LessonActions.COPY]: 'copyLesson',
          [LessonActions.DELETE]: 'deleteLesson',
        };
      },
      LessonActions() {
        return LessonActions;
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
        this.currentAction = action;
      },
    },
    vuex: {
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
