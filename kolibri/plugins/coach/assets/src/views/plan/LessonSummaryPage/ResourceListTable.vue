<template>

  <DragContainer
    :items="workingResources"
    @sort="handleDrag"
  >
    <transition-group tag="div" name="list" class="wrapper">
      <Draggable
        v-for="(resourceId, index) in workingResources"
        :key="resourceId"
      >
        <DragHandle>
          <KFixedGrid
            class="row"
            :style="{ backgroundColor: $themeTokens.surface }"
            numCols="8"
          >
            <KFixedGridItem span="1" class="relative">
              <div class="move-handle">
                <DragSortWidget
                  :moveUpText="$tr('moveResourceUpButtonDescription')"
                  :moveDownText="$tr('moveResourceDownButtonDescription')"
                  :isFirst="index === 0"
                  :isLast="index === workingResources.length - 1"
                  @moveUp="moveUpOne(index)"
                  @moveDown="moveDownOne(index)"
                />
              </div>
            </KFixedGridItem>
            <KFixedGridItem span="4">
              <div class="resource-title">
                <ContentIcon :kind="resourceKind(resourceId)" />
                <KRouterLink
                  :text="resourceTitle(resourceId)"
                  :to="$router.getRoute('RESOURCE_CONTENT_PREVIEW', { contentId: resourceId })"
                />
                <p dir="auto" class="channel-title" :style="{ color: $themeTokens.annotation }">
                  <dfn class="visuallyhidden"> {{ $tr('parentChannelLabel') }} </dfn>
                  {{ resourceChannelTitle(resourceId) }}
                </p>
              </div>
              <CoachContentLabel
                class="coach-content-label"
                :value="getCachedResource(resourceId).num_coach_contents"
                :isTopic="false"
              />
            </KFixedGridItem>
            <KFixedGridItem span="3" alignment="right">
              <KButton
                :text="coreString('removeAction')"
                appearance="flat-button"
                @click="removeResource(resourceId)"
              />
            </KFixedGridItem>
          </KFixedGrid>
        </DragHandle>
      </Draggable>
    </transition-group>
  </DragContainer>

</template>


<script>

  import { mapActions, mapState, mapMutations } from 'vuex';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  const removalSnackbarTime = 5000;

  export default {
    name: 'ResourceListTable',
    components: {
      Draggable,
      DragContainer,
      DragHandle,
      DragSortWidget,
      CoachContentLabel,
      ContentIcon,
    },
    mixins: [commonCoreStrings],
    data() {
      const workingResourcesIds = this.$store.state.lessonSummary.workingResources;
      const resourceContentNodes = this.$store.state.lessonSummary.resourceCache;
      const filteredContents = workingResourcesIds.filter(
        resourceId => resourceContentNodes[resourceId]
      );
      return {
        workingResourcesBackup: filteredContents,
        firstRemovalTitle: '',
        contentMightBeDeleted: filteredContents.length < workingResourcesIds.length,
      };
    },
    computed: {
      ...mapState('lessonSummary', {
        lessonId: state => state.currentLesson.id,
        workingResourcesIds: state => state.workingResources,
        // consider loading this async?
        resourceContentNodes: state => state.resourceCache,
        getCachedResource(state) {
          return function getter(resourceId) {
            return state.resourceCache[resourceId] || {};
          };
        },
      }),
      // HACK for broken lessons: Prior to 0.12, lessons can hold resources that have
      // been deleted. We need to filter them out here. As a remedy for users
      // with 'broken' lessons, they can visit the lesson and the 'mounted' hook
      // will save the fixed lesson.
      workingResources() {
        return this.workingResourcesIds.filter(resourceId => this.resourceContentNodes[resourceId]);
      },
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
    mounted() {
      // HACK for broken lessons: Automatically save the lesson if we
      // infer that is has missing items at first render.
      if (this.contentMightBeDeleted) {
        this.autoSave(this.lessonId, this.workingResources);
      }
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

        this.$store.commit('CORE_CREATE_SNACKBAR', {
          text: this.removalMessage,
          autoDismiss: true,
          duration: removalSnackbarTime,
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

        this.createSnackbar(this.$tr('resourceReorderConfirmationMessage'));
      },
      handleDrag({ newArray }) {
        this.setWorkingResources(newArray);
        this.autoSave(this.lessonId, newArray);
        this.createSnackbar(this.$tr('resourceReorderConfirmationMessage'));
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

  .list-move {
    transition: transform $core-time ease;
  }

</style>
