<template>

  <core-table>
    <thead slot="thead">
      <tr>
        <th class="core-table-icon-col">
          <span class="visuallyhidden">
            {{ $tr('resourceReorderColumnHeaderForTable') }}
          </span>
        </th>
        <td class="core-table-icon-col">
          <span class="visuallyhidden">
            {{ $tr('resourceTypeColumnHeaderForTable') }}
          </span>
        </td>

        <th class="core-table-main-col">
          {{ $tr('nameColumnHeaderForTable') }}
        </th>
        <th>
          {{ $tr('resourceProgressColumnHeaderForTable') }}
        </th>
        <th>
          <span class="visuallyhidden">
            {{ $tr('resourceRemovalColumnHeaderForTable') }}
          </span>
        </th>
      </tr>
    </thead>
    <transition-group
      name="resource-reorder"
      slot="tbody"
      tag="tbody"
    >
      <tr
        :key="resourceId"
        v-for="(resourceId, index) in workingResources"
      >
        <td class="core-table-icon-col">
          <ui-icon-button
            type="flat"
            :ariaLabel="$tr('moveResourceUpButtonDescription')"
            :disabled="index === 0"
            @click="moveUpOne(index)"
            class="position-adjustment-button"
          >
            <mat-svg name="keyboard_arrow_up" category="hardware" />
          </ui-icon-button>
          <ui-icon-button
            type="flat"
            :ariaLabel="$tr('moveResourceDownButtonDescription')"
            :disabled="index === (workingResources.length - 1)"
            @click="moveDownOne(index)"
            class="position-adjustment-button"
          >
            <mat-svg name="keyboard_arrow_down" category="hardware" />
          </ui-icon-button>
        </td>
        <td class="core-table-icon-col">
          <content-icon :kind="resourceKind(resourceId)" />
        </td>
        <td>
          <div class="resource-title">
            <k-router-link
              :to="resourceUserSummaryLink(resourceId)"
              :text="resourceTitle(resourceId)"
            />
            <p class="channel-title">
              <dfn class="visuallyhidden"> {{ $tr('parentChannelLabel') }} </dfn>
              {{ resourceChannelTitle(resourceId) }}
            </p>
          </div>
          <coach-content-label
            class="coach-content-label"
            :value="getCachedResource(resourceId).num_coach_contents"
            :isTopic="false"
          />
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
            @click="removeResource(resourceId)"
            appearance="flat-button"
          />
        </td>
      </tr>
    </transition-group>
  </core-table>

</template>


<script>

  import { mapActions, mapState, mapMutations } from 'vuex';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import { resourceUserSummaryLink } from '../lessonsRouterUtils';

  const removalSnackbarTime = 5000;

  function workingResources(state) {
    return state.pageState.workingResources;
  }

  export default {
    name: 'resourceListTable',
    components: {
      coachContentLabel,
      uiIconButton,
      kButton,
      kRouterLink,
      progressBar,
      coreTable,
      contentIcon,
    },
    data() {
      return {
        workingResourcesBackup: Array.from(workingResources(this.$store.state)),
        firstRemovalTitle: '',
      };
    },
    computed: {
      ...mapState({
        lessonId: state => state.pageState.currentLesson.id,
        workingResources,
        // consider loading this async?
        resourceContentNodes: state => state.pageState.resourceCache,
        totalLearners: state => state.pageState.lessonReport.total_learners,
        getCachedResource(state) {
          return function getter(resourceId) {
            return state.pageState.resourceCache[resourceId] || {};
          };
        },
        numLearnersCompleted(state) {
          return function counter(contentNodeId) {
            const report =
              state.pageState.lessonReport.progress.find(p => p.contentnode_id === contentNodeId) ||
              {};
            // If progress couldn't be found, assume 0 learners completed
            return report.num_learners_completed || 0;
          };
        },
      }),
      removalMessage() {
        const numberOfRemovals = this.workingResourcesBackup.length - this.workingResources.length;

        if (!numberOfRemovals) {
          return '';
        } else if (numberOfRemovals === 1) {
          return this.$tr('singleResourceRemovalConfirmationMessage', {
            resourceTitle: this.firstRemovalTitle,
          });
        }

        return this.$tr('multipleResourceRemovalsConfirmationMessage', {
          numberOfRemovals,
        });
      },
    },
    methods: {
      ...mapActions([
        'createSnackbar',
        'clearSnackbar',
        'saveLessonResources',
        'updateCurrentLesson',
      ]),
      ...mapMutations({
        removeFromWorkingResources: 'REMOVE_FROM_WORKING_RESOURCES',
        setWorkingResources: 'SET_WORKING_RESOURCES',
      }),
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
      removeResource(resourceId) {
        this.firstRemovalTitle = this.resourceTitle(resourceId);
        this.removeFromWorkingResources(resourceId);

        this.autoSave(this.lessonId, this.workingResources);

        this.createSnackbar({
          text: this.removalMessage,
          duration: removalSnackbarTime,
          autoDismiss: true,
          actionText: this.$tr('undoActionPrompt'),
          actionCallback: () => {
            this.setWorkingResources(this.workingResourcesBackup);
            this.autoSave(this.lessonId, this.workingResources);
            this.clearSnackbar();
          },
          hideCallback: () => {
            if (this.workingResourcesBackup) {
              // snackbar might carryover to another page (like select)
              this.workingResourcesBackup = this.workingResources;
            }
          },
        });
      },
      moveUpOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex - 1);
      },
      moveDownOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex + 1);
      },
      shiftOne(oldIndex, newIndex) {
        const resources = [...this.workingResources];
        const oldResourceId = resources[newIndex];
        resources[newIndex] = resources[oldIndex];
        resources[oldIndex] = oldResourceId;

        this.setWorkingResources(resources);
        this.autoSave(this.lessonId, resources);

        this.createSnackbar({
          text: this.$tr('resourceReorderConfirmationMessage'),
          autoDismiss: true,
        });
      },
      autoSave(id, resources) {
        this.saveLessonResources({ lessonId: id, resourceIds: resources }).catch(() => {
          this.updateCurrentLesson(id).then(currentLesson => {
            this.setWorkingResources(
              currentLesson.resources.map(resourceObj => resourceObj.contentnode_id)
            );
          });
        });
      },
    },
    $trs: {
      resourceReorderConfirmationMessage: 'New lesson order saved',
      undoActionPrompt: 'Undo',
      resourceProgressMessage: '{completed, number}/{total, number} completed',
      resourceReorderColumnHeaderForTable:
        'Use buttons in this column to re-order resources in the lesson',
      resourceTypeColumnHeaderForTable: 'Resource type',
      nameColumnHeaderForTable: 'Name',
      resourceProgressColumnHeaderForTable: 'Resource progress',
      resourceRemovalColumnHeaderForTable:
        'Use buttons in this column to remove resources from the lesson',
      resourceRemovalButtonLabel: 'Remove',
      singleResourceRemovalConfirmationMessage: 'Removed { resourceTitle }',
      multipleResourceRemovalsConfirmationMessage: 'Removed { numberOfRemovals } resources',
      moveResourceUpButtonDescription: 'Move this resource one position up in this lesson',
      moveResourceDownButtonDescription: 'Move this resource one position down in this lesson',
      parentChannelLabel: 'Parent channel:',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .resource-title {
    display: inline-block;
    max-width: 75%;
    margin-right: 8px;
  }

  .coach-content-label {
    display: inline-block;
    vertical-align: top;
  }

  .position-adjustment-button {
    display: block;
    margin: 0;
  }

  .resource-reorder-move {
    background-color: $core-bg-canvas; // duping color set in core-table for selected
    transition: transform 0.5s;
  }

  .lesson-summary {
    margin-bottom: 30px;
  }

  .progress-message {
    margin-left: 8px;
    white-space: nowrap;
  }

  .channel-title {
    margin-top: 8px;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    color: $core-text-annotation;
  }

</style>
