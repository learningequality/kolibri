<template>

  <DragContainer
    :items="workingResources"
    @sort="handleDrag"
  >
    <transition-group
      tag="div"
      name="list"
      class="wrapper"
    >
      <Draggable
        v-for="(resource, index) in workingResources"
        :key="resource.contentnode_id"
      >
        <DragHandle>
          <!-- replaced KFixedGrid with normal div to prevent text overlap error  -->
          <div
            class="row"
            :style="{ backgroundColor: $themeTokens.surface }"
          >
            <!-- replaced KFixedGridItem with normal div to prevent text overlap error  -->

            <div class="relative">
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
            </div>
            <div class="relative">
              <div v-if="getCachedResource(resource.contentnode_id)">
                <div class="resource-title">
                  <div class="content-icon">
                    <ContentIcon :kind="resourceKind(resource.contentnode_id)" />
                  </div>
                  <div class="content-link">
                    <KRouterLink
                      :text="resourceTitle(resource.contentnode_id)"
                      :to="
                        $router.getRoute('RESOURCE_CONTENT_PREVIEW', {
                          contentId: resource.contentnode_id,
                        })
                      "
                    />
                  </div>
                  <p
                    v-if="resourceChannelTitle(resource.contentnode_id).length"
                    dir="auto"
                    class="channel-title"
                    :style="{ color: $themeTokens.annotation }"
                  >
                    <dfn class="visuallyhidden"> {{ $tr('parentChannelLabel') }} </dfn>
                    {{ resourceChannelTitle(resource.contentnode_id) }}
                  </p>
                </div>
                <CoachContentLabel
                  class="coach-content-label"
                  :value="getCachedResource(resource.contentnode_id).num_coach_contents"
                  :isTopic="false"
                />
              </div>
              <div
                v-else
                class="child"
              >
                {{ resourceMissingText }}
              </div>
            </div>

            <div class="relative">
              <KIcon
                v-if="
                  !getCachedResource(resource.contentnode_id) ||
                    !getCachedResource(resource.contentnode_id).available
                "
                icon="warning"
                :style="{ fill: $themePalette.yellow.v_1100 }"
              />
            </div>

            <div class="relative">
              <KButton
                :text="coreString('removeAction')"
                appearance="flat-button"
                @click="removeResource(resource)"
              />
            </div>
          </div>
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
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';

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
    setup() {
      const { clearSnackbar } = useSnackbar();
      return { clearSnackbar };
    },
    data() {
      return {
        workingResourcesBackup: [...this.$store.state.lessonSummary.workingResources],
      };
    },
    computed: {
      ...mapState('lessonSummary', {
        classId: state => state.currentLesson.classroom.id,
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
        return this.coreString('resourceNotFoundOnDevice');
      },
    },
    methods: {
      ...mapActions('lessonSummary', [
        'saveLessonResources',
        'updateCurrentLesson',
        'fetchLessonsSizes',
      ]),
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
        this.removeFromWorkingResources([resource]);

        this.autoSave(this.lessonId, this.workingResources, this.classId);

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
                this.autoSave(this.lessonId, this.workingResources, this.classId);
                this.clearSnackbar();
              },
              hideCallback: () => {
                if (this.workingResourcesBackup) {
                  // snackbar might carryover to another page (like select)
                  this.workingResourcesBackup = [...this.workingResources];
                }
              },
            },
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
      autoSave(id, resources, classID) {
        this.saveLessonResources({ lessonId: id, resources: resources })
          .then(() => {
            this.updateCurrentLesson(id);
          })
          .then(() => {
            this.fetchLessonsSizes({ classId: classID });
          })
          .catch(() => {
            this.updateCurrentLesson(id).then(currentLesson => {
              this.fetchLessonsSizes({ classId: currentLesson.classroom.id });
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

  // updated the styles of resources row to prevent the overlap issue
  // using flex we are able to rectify the issue
  .row {
    display: flex;
    flex-direction: row;
    padding: 8px;
    cursor: grab;
    user-select: none;

    .relative:nth-child(1) {
      flex-shrink: 0;
      width: 3rem;
    }

    .relative:nth-child(2) {
      flex-grow: 1;
      flex-shrink: 1;
      padding-right: 2rem;
    }

    .relative:nth-child(3) {
      flex-shrink: 1;
    }

    .relative:last-child {
      flex-shrink: 0;
    }
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

  // updated the class coach-content-label
  .coach-content-label {
    position: absolute;
    display: inline-block;
    width: fit-content;
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
    left: 16px;
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

  .parent {
    position: relative;
  }

  .child {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

</style>
