<template>

  <div>
    <KGrid class="headers">
      <KGridItem size="1">
        <span class="visuallyhidden">
          {{ $tr('resourceReorderColumnHeaderForTable') }}
        </span>
      </KGridItem>
      <KGridItem size="6">
        {{ $tr('lessonTitleColumnHeaderForTable') }}
      </KGridItem>
      <KGridItem size="3">
        {{ $tr('resourceProgressColumnHeaderForTable') }}
      </KGridItem>
      <KGridItem size="2">
        <span class="visuallyhidden">
          {{ $tr('resourceRemovalColumnHeaderForTable') }}
        </span>
      </KGridItem>
    </KGrid>
    <Draggable
      :value="workingResources"
      :options="{animation:150}"
      :noTransitionOnDrag="true"
      @input="handleDrag($event)"
    >
      <transition-group name="resource-reorder">
        <KGrid
          v-for="(resourceId, index) in workingResources"
          :key="resourceId"
          class="row"
        >
          <KGridItem size="1" class="relative">
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
            <ContentIcon :kind="resourceKind(resourceId)" class="type-icon" />
          </KGridItem>
          <KGridItem size="6">
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
          </KGridItem>
          <KGridItem size="3">
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

          </KGridItem>
          <KGridItem size="2" alignment="right">
            <KButton
              :text="$tr('resourceRemovalButtonLabel')"
              appearance="flat-button"
              @click="removeResource(resourceId)"
            />
          </KGridItem>
        </KGrid>
      </transition-group>
    </Draggable>
  </div>

</template>


<script>

  import { mapActions, mapState, mapMutations } from 'vuex';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import Draggable from 'vuedraggable';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import ProgressBar from 'kolibri.coreVue.components.ProgressBar';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import { resourceUserSummaryLink } from '../lessonsRouterUtils';

  const removalSnackbarTime = 5000;

  export default {
    name: 'ResourceListTable',
    components: {
      Draggable,
      CoachContentLabel,
      UiIconButton,
      KButton,
      KGrid,
      KGridItem,
      KRouterLink,
      ProgressBar,
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
      handleDrag(resources) {
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

  .relative {
    position: relative;
  }

  .type-icon {
    position: absolute;
    top: 25px;
    right: 10px;
  }

  .headers {
    margin-top: 16px;
    margin-bottom: 16px;
    font-size: smaller;
    font-weight: bold;
    color: $core-text-annotation;
  }

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

  .sortable-ghost {
    border: 1px solid $core-text-annotation;
  }

  .sortable-ghost * {
    visibility: hidden;
  }

</style>
