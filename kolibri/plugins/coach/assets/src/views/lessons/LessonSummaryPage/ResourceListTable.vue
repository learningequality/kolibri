<template>

  <KDragContainer
    :items="workingResources"
    @sort="handleDrag"
  >
    <div class="wrapper">
      <KDraggable
        v-for="(resourceId) in workingResources"
        :key="resourceId"
      >
        <KDragHandle>
          <KGrid
            class="row"
            :style="{ backgroundColor: $coreBgLight }"
            cols="8"
          >
            <KGridItem size="1" class="relative">
              <!--
               <UiIconButton
                v-if="index !== 0"
                type="flat"
                :ariaLabel="$tr('moveResourceUpButtonDescription')"
                class="move-button up"
                @click="moveUpOne(index)"
              >
                <mat-svg name="keyboard_arrow_up" category="hardware" />
              </UiIconButton>
               -->
              <div class="move-handle">
                <KDragIcon />
              </div>
              <!--
              <UiIconButton
                v-if="index !== (workingResources.length - 1)"
                type="flat"
                :ariaLabel="$tr('moveResourceDownButtonDescription')"
                class="move-button down"
                @click="moveDownOne(index)"
              >
                <mat-svg name="keyboard_arrow_down" category="hardware" />
              </UiIconButton>
               -->
            </KGridItem>
            <KGridItem size="4">
              <div class="resource-title">
                <ContentIcon :kind="resourceKind(resourceId)" />
                {{ resourceTitle(resourceId) }}
                <p dir="auto" class="channel-title" :style="{ color: $coreTextAnnotation }">
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
            <KGridItem size="3" alignment="right">
              <KButton
                :text="$tr('resourceRemovalButtonLabel')"
                appearance="flat-button"
                @click="removeResource(resourceId)"
              />
            </KGridItem>
          </KGrid>
        </KDragHandle>
      </KDraggable>
    </div>
  </KDragContainer>

</template>


<script>

  import { mapActions, mapState, mapMutations, mapGetters } from 'vuex';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import KDragIcon from 'kolibri.coreVue.components.KDragIcon';
  import KDragContainer from 'kolibri.coreVue.components.KDragContainer';
  import KDragHandle from 'kolibri.coreVue.components.KDragHandle';
  import KDraggable from 'kolibri.coreVue.components.KDraggable';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';

  const removalSnackbarTime = 5000;

  export default {
    name: 'ResourceListTable',
    components: {
      KDraggable,
      KDragContainer,
      KDragHandle,
      KDragIcon,
      CoachContentLabel,
      UiIconButton,
      KButton,
      KGrid,
      KGridItem,
      ContentIcon,
    },
    data() {
      return {
        workingResourcesBackup: this.$store.state.lessonSummary.workingResources,
        firstRemovalTitle: '',
        enableTransitions: false,
      };
    },
    computed: {
      ...mapGetters(['$coreTextAnnotation', '$coreBgLight']),
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
      resourceReorderMoveStyle() {
        if (this.enableTransitions) {
          return {
            backgroundColor: this.$coreBgCanvas, // duping color set in core-table for selected
            transition: 'transform 0.5s',
          };
        }
        return {};
      },
    },
    methods: {
      ...mapActions(['createSnackbar', 'clearSnackbar']),
      ...mapActions('lessonSummary', ['saveLessonResources', 'updateCurrentLesson']),
      ...mapMutations('lessonSummary', {
        removeFromWorkingResources: 'REMOVE_FROM_WORKING_RESOURCES',
        setWorkingResources: 'SET_WORKING_RESOURCES',
      }),
      resourceTitle(resourceId) {
        return this.resourceContentNodes[resourceId].title;
      },
      resourceChannelTitle(resourceId) {
        return this.resourceContentNodes[resourceId].channelTitle;
      },
      resourceKind(resourceId) {
        return this.resourceContentNodes[resourceId].kind;
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
        this.enableTransitions = true;
        this.shiftOne(oldIndex, oldIndex - 1);
        setTimeout(() => (this.enableTransitions = false), 500);
      },
      moveDownOne(oldIndex) {
        this.enableTransitions = true;
        this.shiftOne(oldIndex, oldIndex + 1);
        setTimeout(() => (this.enableTransitions = false), 500);
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
      handleDrag({ newArray }) {
        this.setWorkingResources(newArray);
        this.autoSave(this.lessonId, newArray);
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
      resourceReorderColumnHeaderForTable:
        'Use buttons in this column to re-order resources in the lesson',
      resourceTypeColumnHeaderForTable: 'Resource type',
      lessonTitleColumnHeaderForTable: 'Title',
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

  .wrapper {
    margin-top: 16px;
  }

  .relative {
    position: relative;
  }

  .link {
    margin-left: 8px;
  }

  .row {
    padding: 8px;
    cursor: grab;
    user-select: none;
  }

  .headers {
    margin-top: 16px;
    margin-bottom: 16px;
    font-size: smaller;
    font-weight: bold;
  }

  .resource-title {
    display: inline-block;
    margin-right: 8px;
  }

  .coach-content-label {
    display: inline-block;
    vertical-align: top;
  }

  .move-button {
    position: absolute;
  }

  .move-button.up {
    top: -8px;
  }

  .move-handle {
    position: absolute;
    top: 16px;
    left: 18px;
  }

  .move-button.down {
    top: 30px;
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
  }

  .sortable-ghost {
    visibility: hidden;
  }

</style>
