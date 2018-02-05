<template>

  <div>
    <div class="lesson-summary-header">
      <div class="lesson-summary-header-title-block">
        <content-icon
          kind="lesson"
          class="title-lesson-icon"
        />
        <h1 class="lesson-summary-header-title">
          {{ lessonTitle }}
        </h1>
      </div>
      <div class="lesson-summary-header-options">
        <dropdown-menu
          :name="$tr('options')"
          :options="lessonOptions"
          @select="handleSelectOption"
        />
      </div>
    </div>
    <div>
      <dl>
        <dt>
          {{ $tr('status') }}
          <ui-icon
            ref="info-icon"
            class="info-icon"
            :ariaLabel="$tr('lessonStatusDescription')"
            icon="info_outline"
          />
          <ui-tooltip
            class="info-icon-tooltip"
            position="bottom left"
            trigger="info-icon"
          >
            {{ $tr('statusTooltipText') }}
          </ui-tooltip>
        </dt>
        <dd>
          <status-icon :active="lessonActive" />
          <k-button
            appearance="basic-link"
            class="change-status-button"
            :text="$tr('changeLessonStatus')"
            @click="currentAction=LessonActions.CHANGE_STATUS"
          />
        </dd>

        <dt>
          {{ $tr('description') }}
        </dt>
        <dd>
          {{ lessonDescription || $tr('noDescription') }}
        </dd>

        <dt>
          {{ $tr('visibleTo') }}
        </dt>
        <dd>
          <ul class="group-list">
            <li
              class="group-list-item"
              v-for="assignment in lessonAssignments"
              :key="assignment.id"
            >
              <span>{{ groupName(assignment) }}</span>
            </li>
          </ul>
        </dd>
      </dl>

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
      <table></table>

      <manage-lesson-modals
        :currentAction="currentAction"
        @cancel="currentAction=null"
      />
    </div>

  </div>

</template>


<script>

  import dropdownMenu from 'kolibri.coreVue.components.dropdownMenu';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import map from 'lodash/map';
  import ManageLessonModals from '../ManageLessonModals';
  import { LessonActions, CollectionTypes, LessonsPageNames } from '../../../lessonsConstants';
  import StatusIcon from '../StatusIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import uiTooltip from 'keen-ui/src/UiTooltip';
  import uiIcon from 'keen-ui/src/UiIcon';

  export default {
    components: {
      dropdownMenu,
      ManageLessonModals,
      StatusIcon,
      contentIcon,
      kButton,
      kRouterLink,
      uiIcon,
      uiTooltip,
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
          [LessonActions.COPY]: 'copyLesson',
          [LessonActions.DELETE]: 'deleteLesson',
          [LessonActions.EDIT_DETAILS]: 'editLessonDetails',
        };
      },
      LessonActions() {
        return LessonActions;
      },
      lessonSelectionRootPage() {
        return {
          name: LessonsPageNames.SELECTION_ROOT,
          params: {
            lessonId: this.lessonId,
            classId: this.classId,
          },
        };
      },
    },
    methods: {
      handleSelectOption({ action }) {
        this.currentAction = action;
      },
      groupName(assignment) {
        if (assignment.collection_kind === CollectionTypes.CLASSROOM) {
          return this.$tr('entireClass');
        }
        const match = this.learnerGroups.find(lg => lg.id === assignment.collection);
        return match.name;
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        lessonId: state => state.pageState.currentLesson.id,
        lessonTitle: state => state.pageState.currentLesson.name,
        lessonActive: state => state.pageState.currentLesson.is_active,
        lessonDescription: state => state.pageState.currentLesson.description,
        lessonAssignments: state => state.pageState.currentLesson.assigned_groups,
        lessonResources: state => state.pageState.currentLesson.resources,
        learnerGroups: state => state.pageState.learnerGroups,
      },
      actions: {},
    },
    $trs: {
      // TODO make labels more semantic
      active: 'Active',
      changeLessonStatus: 'Change',
      copyLesson: 'Copy to',
      deleteLesson: 'Delete',
      description: 'Description',
      editLessonDetails: 'Edit details',
      entireClass: 'Entire class',
      inactive: 'Inactive',
      lessonStatusDescription: 'Lesson status description',
      noDescription: 'No description',
      options: 'Options',
      resources: 'Resources',
      status: 'Status',
      statusTooltipText: 'Active: learners can see lesson. Inactive: hidden from learners.',
      visibleTo: 'Visible to',
      addResourcesButtonPrompt: 'Add Resources',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  $table-header-size = 12px


  .lesson-summary-header
    // maintaining a simple right/left alignment in a single text-line without floats. Simple RTL
    // TODO make this a shared class or mixin
    display: table
    width: 100%

    &-title
      display: inline-block

      &-block
        display: table-cell
        text-align: left

    &-options
      display: table-cell
      text-align: right

  // TODO use classes
  dt
    color: $core-text-annotation // same as table header
    font-size: $table-header-size
    // TODO replace with verified values
    margin-top: 1em
    margin-bottom: 1em

  dd
    margin-left: 0
    margin-bottom: 1.5em

  .info-icon
    font-size: $table-header-size + 2 // scaling so that the 'i' fits
    vertical-align: top
    color: $core-accent-color
    cursor: pointer

  .group-list
    margin: 0
    padding: 0
    &-item
      margin: 0
      list-style: none
      display: inline
      &:not(:last-child)::after
        content: ', '

  .title-lesson-icon
    display: inline-block
    font-size: 1.8em
    margin-right: 0.5em
    >>>.ui-icon
      vertical-align: bottom

  .change-status-button
    vertical-align: sub // hack for now
    margin-left: 0.5em


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

</style>
