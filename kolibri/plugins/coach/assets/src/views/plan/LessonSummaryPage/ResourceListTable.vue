<template>

  <DragContainer
    :items="workingResources"
    @sort="handleDrag"
  >
    <transition-group tag="div" name="list" class="wrapper">
      <Draggable
        v-for="(resource, index) in workingResources"
        :key="resource.contentnode_id"
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
              <template v-if="getCachedResource(resource.contentnode_id)">
                <div class="resource-title">
                  <div class="content-icon">
                    <ContentIcon :kind="resourceKind(resource.contentnode_id)" />
                  </div>
                  <div class="content-link">
                    <KRouterLink
                      :text="resourceTitle(resource.contentnode_id)"
                      :to="$router.getRoute(
                        'RESOURCE_CONTENT_PREVIEW', { contentId: resource.contentnode_id }
                      )"
                    />
                  </div>
                  <p dir="auto" class="channel-title" :style="{ color: $themeTokens.annotation }">
                    <dfn class="visuallyhidden"> {{ $tr('parentChannelLabel') }} </dfn>
                    {{ resourceChannelTitle(resource.contentnode_id) }}
                  </p>
                </div>
                <CoachContentLabel
                  class="coach-content-label"
                  :value="getCachedResource(resource.contentnode_id).num_coach_contents"
                  :isTopic="false"
                />
              </template>
              <template v-else>
                <p>
                  <KIcon icon="warning" :style=" { fill: $themePalette.orange.v_400 }" />
                  {{ resourceMissingText }}
                </p>
              </template>
            </KFixedGridItem>
            <KFixedGridItem :style="{ 'padding-top': '16px' }" span="3" alignment="right">
              <KButton
                :text="coreString('removeAction')"
                appearance="flat-button"
                @click="removeResource(resource)"
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
  import { coachStringsMixin } from '../../common/commonCoachStrings';

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
    mixins: [commonCoreStrings, coachStringsMixin],
    data() {
      return {
        workingResourcesBackup: [...this.$store.state.lessonSummary.workingResources],
        firstRemovalTitle: '',
      };
    },
    computed: {
      ...mapState('lessonSummary', {
        lessonId: state => state.currentLesson.id,
        workingResources: state => state.workingResources,
        // consider loading this async?
        resourceContentNodes: state => state.resourceCache,
        getCachedResource(state) {
          return function getter(resourceId) {
            return state.resourceCache[resourceId];
          };
        },
      }),
      numberOfRemovals() {
        return this.workingResourcesBackup.length - this.workingResources.length;
      },
      resourceMissingText() {
        return this.getMissingContentString('resourceNotFoundOnDevice');
      },
    },
    methods: {
      ...mapActions(['clearSnackbar']),
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
      removeResource(resource) {
        this.firstRemovalTitle = this.resourceTitle(resource.contentnode_id);
        this.removeFromWorkingResources([resource]);

        this.autoSave(this.lessonId, this.workingResources);

        if (this.numberOfRemovals > 0) {
          this.showSnackbarNotification(
            'resourcesRemovedWithCount',
            { count: this.numberOfRemovals },
            {
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
                  this.workingResourcesBackup = [...this.workingResources];
                }
              },
            }
          );
        }
      },
      moveUpOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex - 1);
      },
      moveDownOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex + 1);
      },
      shiftOne(oldIndex, newIndex) {
        const resources = [...this.workingResources];
        const oldResource = resources[newIndex];
        resources[newIndex] = resources[oldIndex];
        resources[oldIndex] = oldResource;

        this.setWorkingResources(resources);
        this.autoSave(this.lessonId, resources);

        this.showSnackbarNotification('resourceOrderSaved');
      },
      handleDrag({ newArray }) {
        this.setWorkingResources(newArray);
        this.autoSave(this.lessonId, newArray);
        this.showSnackbarNotification('resourceOrderSaved');
      },
      autoSave(id, resources) {
        this.saveLessonResources({ lessonId: id, resources: resources })
          .then(() => {
            this.updateCurrentLesson(id);
          })
          .catch(() => {
            this.updateCurrentLesson(id).then(currentLesson => {
              this.setWorkingResources(currentLesson.resources);
            });
          });
      },
    },
    $trs: {
      undoActionPrompt: {
        message: 'Undo',
        context: 'Allows user to undo an action.',
      },
      moveResourceUpButtonDescription: {
        message: 'Move this resource one position up in this lesson',
        context: 'Refers to ordering resources.',
      },
      moveResourceDownButtonDescription: {
        message: 'Move this resource one position down in this lesson',
        context: 'Refers to ordering resources.',
      },
      parentChannelLabel: {
        message: 'Parent channel:',
        context:
          'Describes the name of the main channel which the specific learning resource belongs to.\n',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

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

  .content-icon {
    display: inline-block;
    width: 16px; // match the icon
    vertical-align: top;
  }

  .content-link {
    display: inline-block;
    width: calc(100% - 16px);
  }

</style>
