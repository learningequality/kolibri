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
          <info-icon
            :iconAriaLabel="$tr('lessonStatusDescription')"
            :tooltipText="$tr('statusTooltipText')"
            tooltipPosition="bottom left"
          />
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
          <template v-if="!lessonAssignments.length">
            {{ this.$tr('noOne') }}
          </template>
          <template v-else-if="lessonIsAssignedToClass(lessonAssignments)">
            {{ this.$tr('entireClass') }}
          </template>
          <ul
            v-else
            class="group-list"
          >
            <li
              class="group-list-item"
              v-for="assignment in lessonAssignments"
              :key="assignment.id"
            >
              <span>{{ getGroupName(assignment) }}</span>
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

      <core-table>
        <thead slot="thead">
          <tr>
            <th class="visuallyhidden core-table-icon-col">
              {{ $tr('resourceReorderColumnHeaderForTable') }}
            </th>
            <th class="core-table-main-col">
              {{ $tr('nameColumnHeaderForTable') }}
            </th>
            <th>
              {{ $tr('resourceProgressColumnHeaderForTable') }}
            </th>
            <th class="visuallyhidden">
              {{ $tr('resourceRemovalColumnHeaderForTable') }}
            </th>
          </tr>
        </thead>
        <!-- TODO simple transitions -->
        <transition-group
          name="resource-reorder"
          slot="tbody"
          class="core-table-rows-selectable"
          tag="tbody"
        >
          <!-- IDEA incorporate row selected? -->
          <tr
            v-if="!removals.includes(resourceId)"
            :key="resourceId"
            v-for="(resourceId, index) in workingResources"
          >
            <td class="core-table-icon-col">
              <ui-icon-button
                type="flat"
                icon="keyboard_arrow_up"
                :ariaLabel="$tr('moveResourceUpButtonDescription')"
                :disabled="index === 0"
                @click="moveUpOne(index)"
                class="position-adjustment-button"
              />
              <ui-icon-button
                type="flat"
                icon="keyboard_arrow_down"
                :ariaLabel="$tr('moveResourceDownButtonDescription')"
                :disabled="index === (workingResources.length - 1)"
                @click="moveDownOne(index)"
                class="position-adjustment-button"
              />
            </td>
            <td>
              {{ resourceTitle(resourceId) }}
            </td>
            <td>
              <!-- stubbed. Need progress endpoint that scopes by user -->
              <progress-bar
                class="resource-progress-bar"
                :progress="resourceProgress(resourceId)"
                :showPercentage="false"
              />
            </td>
            <td>
              <k-button
                :text="$tr('resourceRemovalButtonLabel')"
                @click="removeResource(resourceId)"
                appearance="flat-button"
              />
            </td>
          </tr>
        </transition-group>
      </core-table>

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
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  // why PascalCase?
  import coreTable from 'kolibri.coreVue.components.CoreTable';
  import map from 'lodash/map';
  import ManageLessonModals from '../ManageLessonModals';
  import { LessonActions, CollectionTypes } from '../../../lessonsConstants';
  import StatusIcon from '../StatusIcon';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import InfoIcon from '../InfoIcon';
  import { selectionRootLink } from '../lessonsRouterUtils';
  import { createSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { saveLessonResources, updateCurrentLesson } from '../../../state/actions/lessons';

  export default {
    name: 'lessonSummaryPage',
    components: {
      dropdownMenu,
      ManageLessonModals,
      StatusIcon,
      contentIcon,
      kButton,
      uiIconButton,
      kRouterLink,
      InfoIcon,
      coreTable,
      progressBar,
    },
    data() {
      return {
        currentAction: null,
        resourceBackup: [...this.lessonResources],
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
        return selectionRootLink({ lessonId: this.lessonId, classId: this.classId });
      },
    },
    methods: {
      handleSelectOption({ action }) {
        this.currentAction = action;
      },
      lessonIsAssignedToClass(assignments) {
        return (
          assignments.length === 1 && assignments[0].collection_kind === CollectionTypes.CLASSROOM
        );
      },
      getGroupName(assignment) {
        return this.learnerGroups.find(lg => lg.id === assignment.collection).name;
      },
      resourceTitle(resourceId) {
        return this.resourceContentNodes[resourceId].title;
      },
      resourceProgress(resourceId) {
        return this.resourceContentNodes[resourceId].progress;
      },
      removeResource(resourceId) {
        // IDEA update resourceContentNodes?
        const removalMessage = this.$tr('resourceRemovalConfirmationMessage', {
          resourceTitle: this.resourceTitle(resourceId),
        });

        this.removeFromWorkingResources(resourceId);
        this.autoSave(removalMessage);
      },
      autoSave(notification) {
        // TODO debounce - talk to design about what this looks like?

        // set a new backup point before making these changes
        this.resourceBackup = [...this.lessonResources];

        const modelResources = this.workingResources.map(resourceId => ({
          contentnode_id: resourceId,
        }));
        return this.saveLessonResources(this.lessonId, modelResources).then(() => {
          this.createSnackbar({
            text: notification,
            autoDismiss: true,
          });
          // TODO undo - allow custom snackbar
          // QUESTION how to track if undo was clicked?
          this.updateCurrentLesson(this.lessonId);
        });
      },
      moveUpOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex - 1);
      },
      moveDownOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex + 1);
      },
      shiftOne(oldIndex, newIndex) {
        // TODO measure performance to see if this is worth it
        const resources = [...this.workingResources];
        const oldResourceId = resources[newIndex];
        resources[newIndex] = resources[oldIndex];
        resources[oldIndex] = oldResourceId;

        this.setWorkingResources(resources);
        this.autoSave(this.$tr('resourceReorderConfirmationMessage'));
      },
      shiftMany(oldIndex, newIndex) {
        // to be used w/ drag and drop if we do this
        const resources = [...this.workingResources];
        // remove the resourceId from the array, store here
        const [resourceId] = resources.splice(oldIndex, 1);
        // re-add resourceId at the new index
        resources.splice(newIndex, 0, resourceId);

        this.setWorkingResources(resources);
        this.autoSave();
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
        workingResources: state => state.pageState.workingResources,
        // consider loading this async?
        resourceContentNodes: state => state.pageState.resourceContentNodes,
        learnerGroups: state => state.pageState.learnerGroups,
      },
      actions: {
        createSnackbar,
        saveLessonResources,
        updateCurrentLesson,
        removeFromWorkingResources(store, resourceId) {
          store.dispatch('REMOVE_FROM_WORKING_RESOURCES', resourceId);
        },
        setWorkingResources(store, resourceArray) {
          store.dispatch('SET_WORKING_RESOURCES', resourceArray);
        },
      },
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
      numberOfGroups: '{count, number, integer} {count, plural, one {group} other {groups}}',
      noOne: 'No one',
      inactive: 'Inactive',
      lessonStatusDescription: 'Lesson status description',
      noDescription: 'No description',
      options: 'Options',
      resources: 'Resources',
      status: 'Status',
      statusTooltipText: 'Active: learners can see lesson. Inactive: hidden from learners.',
      visibleTo: 'Visible to',
      addResourcesButtonPrompt: 'Add resources',
      resourceReorderColumnHeaderForTable: 'Reorder buttons',
      nameColumnHeaderForTable: 'Name',
      resourceProgressColumnHeaderForTable: 'Resource progress',
      resourceRemovalColumnHeaderForTable: 'Removal button',
      resourceRemovalButtonLabel: 'Remove',
      resourceReorderConfirmationMessage: 'New lesson order saved',
      resourceRemovalConfirmationMessage: 'Removed { resourceTitle }',
      moveResourceUpButtonDescription: 'Move this resource one position up in this lesson',
      moveResourceDownButtonDescription: 'Move this resource one position down in this lesson',
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

  .position-adjustment-button
    display: block
    margin: 0

  .resource-reorder-move
    transition: transform 0.5s
    background-color: $core-bg-canvas // duping color set in core-table for selected
</style>
