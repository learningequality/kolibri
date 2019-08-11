<template>

  <DragContainer
    :items="resources"
    @sort="handleDrag"
  >
    <p v-if="resources.length === 0">
      {{ coachString('noResourcesInLessonLabel') }}
    </p>
    <transition-group
      v-else
      tag="div"
      name="list"
      class="wrapper"
    >
      <Draggable
        v-for="(resource, index) in resourceListItems"
        :key="resource.id"
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
                  :isLast="index === resourceListItems.length - 1"
                  @moveUp="moveUpOne(index)"
                  @moveDown="moveDownOne(index)"
                />
              </div>
            </KFixedGridItem>
            <KFixedGridItem span="4">
              <div class="resource-title">
                <ContentIcon :kind="resource.kind" />
                <KRouterLink
                  :text="resource.title"
                  :to="$router.getRoute('RESOURCE_CONTENT_PREVIEW', {
                    contentId: resource.id
                  }, { last: 'LessonReportEditDetailsPage' })"
                />
                <p dir="auto" class="channel-title" :style="{ color: $themeTokens.annotation }">
                  <dfn class="visuallyhidden"> {{ $tr('parentChannelLabel') }} </dfn>
                  {{ resource.channelTitle }}
                </p>
              </div>
            </KFixedGridItem>
            <KFixedGridItem span="3" alignment="right">
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

  import { mapActions, mapState } from 'vuex';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  // This is a simplified version of ResourceListTable that is supposed to work
  // outside of the LessonSummaryPage workflow.
  export default {
    name: 'EditDetailsResourceListTable',
    components: {
      Draggable,
      DragContainer,
      DragHandle,
      DragSortWidget,
      ContentIcon,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      // Array<{ contentnode_id, content_id, channel_id }>
      resources: {
        type: Array,
      },
    },
    data() {
      return {
        resourcesBackup: [...this.resources],
        firstRemovalTitle: '',
      };
    },
    computed: {
      ...mapState('classSummary', ['contentNodeMap']),
      removalMessage() {
        const numberOfRemovals = this.resourcesBackup.length - this.resources.length;

        if (numberOfRemovals === 0) {
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
      resourceListItems() {
        return this.resources
          .map(resource => {
            const { contentnode_id } = resource;
            const match = this.contentNodeMap[contentnode_id];
            if (match) {
              return {
                id: contentnode_id,
                title: match.title,
                kind: match.kind,
                channelTitle: this.resourceChannelTitle(contentnode_id),
              };
            } else {
              // Need to filter out objects not in the contentNodeMap.
              // Hopefully the contentNodeMap is always updated.
              return null;
            }
          })
          .filter(Boolean);
      },
    },
    methods: {
      ...mapActions(['clearSnackbar']),
      emitUpdatedResources(resources) {
        this.$emit('update:resources', resources);
      },
      resourceChannelTitle(id) {
        const match = this.$store.getters['getChannelObject'](this.contentNodeMap[id].channel_id);
        return match ? match.title : '';
      },
      removeResource(resource) {
        const { id, title } = resource;
        const newResources = this.resources.filter(({ contentnode_id }) => contentnode_id !== id);
        this.emitUpdatedResources(newResources);
        // Need to wait for the parent to update the resources prop
        this.$nextTick(() => {
          this.firstRemovalTitle = title;
          this.$store.commit('CORE_CREATE_SNACKBAR', {
            text: this.removalMessage,
            autoDismiss: true,
            duration: 5000,
            actionText: this.$tr('undoActionPrompt'),
            actionCallback: () => {
              this.emitUpdatedResources(this.resourcesBackup);
              this.clearSnackbar();
            },
            hideCallback: () => {
              this.resourcesBackup = [...this.resources];
            },
          });
        });
      },
      moveUpOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex - 1);
      },
      moveDownOne(oldIndex) {
        this.shiftOne(oldIndex, oldIndex + 1);
      },
      shiftOne(oldIndex, newIndex) {
        const resources = [...this.resources];
        const oldResourceId = resources[newIndex];
        resources[newIndex] = resources[oldIndex];
        resources[oldIndex] = oldResourceId;
        this.emitUpdatedResources(resources);
      },
      handleDrag({ newArray }) {
        this.emitUpdatedResources(newArray);
      },
    },
    $trs: {
      undoActionPrompt: 'Undo',
      singleResourceRemovalConfirmationMessage: `Removed '{resourceTitle}'`,
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
