<template>

  <core-table>
    <thead slot="thead">
      <tr>
        <th class="visuallyhidden core-table-icon-col">
          {{ $tr('resourceReorderColumnHeaderForTable') }}
        </th>
        <td class="core-table-icon-col">
          <!-- include header? -->
        </td>

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
    <transition-group
      name="resource-reorder"
      slot="tbody"
      tag="tbody"
    >
      <tr
        v-if="!removals.includes(resourceId)"
        :key="resourceId"
        v-for="(resourceId, index) in workingResources"
      >
        <!-- TODO add content type icon -->
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
        <td class="core-table-icon-col">
          <content-icon :kind="resourceKind(resourceId)" />
        </td>
        <td>
          <k-router-link
            :to="resourceUserSummaryLink(resourceId)"
            :text="resourceTitle(resourceId)"
          />
          <p class="channel-title">
            <dfn class="visuallyhidden"> {$tr('parentChannelLabel')} </dfn>
            {{ resourceChannelTitle(resourceId) }}
          </p>
        </td>
        <td>
          <progress-bar
            v-if="resourceProgress(resourceId)!==null"
            class="resource-progress-bar"
            :progress="resourceProgress(resourceId)"
            :showPercentage="false"
          />
          <!-- could just use progress bar's? -->
          <span class="progress-message">
            {{ resourceProgressMessage(resourceId) }}
          </span>
        </td>
        <td>
          <k-button
            :text="$tr('resourceRemovalButtonLabel')"
            @click="stageRemoval(index, resourceId)"
            appearance="flat-button"
          />
        </td>
      </tr>
    </transition-group>
  </core-table>

</template>


<script>

  import uiIconButton from 'keen-ui/src/UiIconButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { resourceUserSummaryLink } from '../lessonsRouterUtils';
  import { createSnackbar, clearSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { saveLessonResources } from '../../../state/actions/lessons';
  import debounce from 'lodash/debounce';

  const removalSnackbarTime = 5000;

  const saveDebounceTime = 6000;

  // debounced function, pulling out of direct binding to preserve cancel() function
  const commitRemovals = debounce(function() {
    const remainingResources = this.workingResources.filter(
      resourceId => !this.removals.includes(resourceId)
    );
    this.removals = [];
    this.setWorkingResources(remainingResources);
    this.autoSave();
  }, removalSnackbarTime);

  export default {
    name: 'lessonResourceListTable',
    components: {
      uiIconButton,
      kButton,
      kRouterLink,
      progressBar,
      CoreTable,
      contentIcon,
    },
    data() {
      return {
        removals: [],
      };
    },
    computed: {
      removalMessage() {
        const numberOfRemovals = this.removals.length;

        if (!numberOfRemovals) {
          return '';
        } else if (numberOfRemovals === 1) {
          return this.$tr('singleResourceRemovalConfirmationMessage', {
            resourceTitle: this.resourceTitle(this.removals[0]),
          });
        }

        return this.$tr('multipleResourceRemovalsConfirmationMessage', {
          numberOfRemovals,
        });
      },
    },
    methods: {
      resourceUserSummaryLink,
      resourceTitle(resourceId) {
        return this.resourceContentNodes[resourceId].title;
      },
      resourceChannelTitle(resourceId) {
        return this.resourceContentNodes[resourceId].channelTitle;
      },
      resourceKind(resourceId) {
        return this.resourceContentNodes[resourceId].kind;
      },
      resourceProgress(resourceId) {
        if (this.totalLearners === 0) {
          return null;
        }
        return this.numLearnersCompleted(resourceId) / this.totalLearners;
      },
      resourceProgressMessage(resourceId) {
        return this.$tr('resourceProgressMessage', {
          completed: this.numLearnersCompleted(resourceId),
          total: this.totalLearners,
        });
      },
      stageRemoval(index, resourceId) {
        this.removals.push(resourceId);

        this.createSnackbar({
          text: this.removalMessage,
          duration: removalSnackbarTime,
          autoDismiss: true,
          actionText: this.$tr('undoActionPrompt'),
          actionCallback: () => {
            this.removals = [];
            this.clearSnackbar();
          },
        });

        // cancel any pending calls to reset timer
        this.cancelCommitRemovals();
        this.commitRemovals();
      },
      commitRemovals,
      cancelCommitRemovals: commitRemovals.cancel,
      autoSave() {
        const modelResources = this.workingResources.map(resourceId => {
          const node = this.resourceContentNodes[resourceId];
          return {
            contentnode_id: node.id,
            channel_id: node.channel_id,
            content_id: node.content_id,
          };
        });
        return this.debouncedSaveLessonResources(this.lessonId, modelResources);
      },
      moveUpOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex - 1);
      },
      moveDownOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex + 1);
      },
      shiftOne(oldIndex, newIndex) {
        // TODO measure performance, see if worth keeping over generalized shiftMany
        const resources = [...this.workingResources];
        const oldResourceId = resources[newIndex];
        resources[newIndex] = resources[oldIndex];
        resources[oldIndex] = oldResourceId;

        this.setWorkingResources(resources);
        this.autoSave();

        this.createSnackbar({
          text: this.$tr('resourceReorderConfirmationMessage'),
          autoDismiss: true,
        });
      },
      shiftMany(oldIndex, newIndex) {
        // unused, to be used w/ drag and drop if we do this
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
        lessonId: state => state.pageState.currentLesson.id,
        workingResources: state => state.pageState.workingResources,
        // consider loading this async?
        resourceContentNodes: state => state.pageState.resourceContentNodes,
        totalLearners: state => state.pageState.lessonReport.total_learners,
        numLearnersCompleted(state) {
          return function counter(contentNodeId) {
            const report =
              state.pageState.lessonReport.progress.find(p => p.contentnode_id === contentNodeId) ||
              {};
            // If progress couldn't be found, assume 0 learners completed
            return report.num_learners_completed || 0;
          };
        },
      },
      actions: {
        debouncedSaveLessonResources: debounce(saveLessonResources, saveDebounceTime),
        createSnackbar,
        clearSnackbar,
        removeFromWorkingResources(store, resourceId) {
          store.dispatch('REMOVE_FROM_WORKING_RESOURCES', resourceId);
        },
        setWorkingResources(store, resourceArray) {
          store.dispatch('SET_WORKING_RESOURCES', resourceArray);
        },
      },
    },
    $trs: {
      resourceReorderConfirmationMessage: 'New lesson order saved',
      undoActionPrompt: 'Undo',
      resourceProgressMessage: '{completed, number}/{total, number} completed',
      resourceReorderColumnHeaderForTable: 'Reorder buttons',
      nameColumnHeaderForTable: 'Name',
      resourceProgressColumnHeaderForTable: 'Resource progress',
      resourceRemovalColumnHeaderForTable: 'Removal button',
      resourceRemovalButtonLabel: 'Remove',
      singleResourceRemovalConfirmationMessage: 'Removed { resourceTitle }',
      multipleResourceRemovalsConfirmationMessage: 'Removed { numberOfRemovals } resources',
      moveResourceUpButtonDescription: 'Move this resource one position up in this lesson',
      moveResourceDownButtonDescription: 'Move this resource one position down in this lesson',
      parentChannelLabel: 'Parent channel:',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .position-adjustment-button
    display: block
    margin: 0

  .resource-reorder-move
    transition: transform 0.5s
    background-color: $core-bg-canvas // duping color set in core-table for selected

  .lesson-summary
    margin-bottom: 30px

  .progress-message
    margin-left: 8px
    white-space: nowrap

  .channel-title
    color: $core-text-annotation
    margin-top: 8px
    margin-left: 0
    margin-right: 0
    margin-bottom: 0

</style>
