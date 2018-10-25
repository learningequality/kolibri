<template>

  <CoreTable>
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
          {{ $tr('lessonTitleColumnHeaderForTable') }}
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
      slot="tbody"
      name="resource-reorder"
      tag="tbody"
    >
      <tr
        v-for="(resourceId, index) in workingResources"
        :key="resourceId"
      >
        <td class="core-table-icon-col">
          <UiIconButton
            type="flat"
            :ariaLabel="$tr('moveResourceUpButtonDescription')"
            :disabled="index === 0"
            class="position-adjustment-button"
            @click="moveUpOne(index)"
          >
            <mat-svg name="keyboard_arrow_up" category="hardware" />
          </UiIconButton>
          <UiIconButton
            type="flat"
            :ariaLabel="$tr('moveResourceDownButtonDescription')"
            :disabled="index === (workingResources.length - 1)"
            class="position-adjustment-button"
            @click="moveDownOne(index)"
          >
            <mat-svg name="keyboard_arrow_down" category="hardware" />
          </UiIconButton>
        </td>
        <td class="core-table-icon-col">
          <ContentIcon :kind="resourceKind(resourceId)" />
        </td>
        <td>
          <div class="resource-title">
            <KRouterLink
              :to="resourceUserSummaryLink(resourceId)"
              :text="resourceTitle(resourceId)"
            />
            <p dir="auto" class="channel-title">
              <dfn class="visuallyhidden"> {{ $tr('parentChannelLabel') }} </dfn>
              {{ resourceChannelTitle(resourceId) }}
            </p>
          </div>
          <CoachContentLabel
            class="coach-content-label"
            :value="getCachedResource(resourceId).num_coach_contents"
            :isTopic="false"
          />
        </td>
        <td>
          <ProgressBar
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
          <KButton
            :text="$tr('resourceRemovalButtonLabel')"
            appearance="flat-button"
            @click="removeResource(resourceId)"
          />
        </td>
      </tr>
    </transition-group>
  </CoreTable>

</template>


<script>

  import { mapActions, mapState, mapMutations } from 'vuex';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import ProgressBar from 'kolibri.coreVue.components.ProgressBar';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import { resourceUserSummaryLink } from '../lessonsRouterUtils';

  const removalSnackbarTime = 5000;

  export default {
    name: 'ResourceListTable',
    components: {
      CoachContentLabel,
      UiIconButton,
      KButton,
      KRouterLink,
      ProgressBar,
      CoreTable,
      ContentIcon,
    },
    data() {
      return {
        workingResourcesBackup: this.$store.state.lessonSummary.workingResources,
        firstRemovalTitle: '',
      };
    },
    computed: {
      ...mapState('lessonSummary', {
        lessonId: state => state.currentLesson.id,
        workingResources: state => state.workingResources,
        // consider loading this async?
        resourceContentNodes: state => state.resourceCache,
        totalLearners: state => state.lessonReport.total_learners,
        getCachedResource(state) {
          return function getter(resourceId) {
            return state.resourceCache[resourceId] || {};
          };
        },
        numLearnersCompleted(state) {
          return function counter(contentNodeId) {
            const report =
              state.lessonReport.progress.find(p => p.contentnode_id === contentNodeId) || {};
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
      ...mapActions(['createSnackbar', 'clearSnackbar']),
      ...mapActions('lessonSummary', ['saveLessonResources', 'updateCurrentLesson']),
      ...mapMutations('lessonSummary', {
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
      lessonTitleColumnHeaderForTable: 'Title',
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
