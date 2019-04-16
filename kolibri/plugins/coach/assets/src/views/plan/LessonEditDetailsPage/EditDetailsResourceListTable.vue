<template>

  <KDragContainer
    :items="resources"
    @sort="handleDrag"
  >
    <p v-if="resources.length === 0">
      {{ $tr('noResources') }}
    </p>
    <transition-group
      v-else
      tag="div"
      name="list"
      class="wrapper"
    >
      <KDraggable
        v-for="(resourceId, index) in resources"
        :key="resourceId.contentnode_id"
      >
        <KDragHandle>
          <KGrid
            class="row"
            :style="{ backgroundColor: $coreBgLight }"
            cols="8"
          >
            <KGridItem size="1" class="relative">
              <div class="move-handle">
                <KDragSortWidget
                  :moveUpText="$tr('moveResourceUpButtonDescription')"
                  :moveDownText="$tr('moveResourceDownButtonDescription')"
                  :isFirst="index === 0"
                  :isLast="index === resources.length - 1"
                  @moveUp="moveUpOne(index)"
                  @moveDown="moveDownOne(index)"
                />
              </div>
            </KGridItem>
            <KGridItem size="4">
              <div class="resource-title">
                <ContentIcon :kind="resourceKind(resourceId.contentnode_id)" />
                {{ resourceTitle(resourceId.contentnode_id) }}
                <p dir="auto" class="channel-title" :style="{ color: $coreTextAnnotation }">
                  <dfn class="visuallyhidden"> {{ $tr('parentChannelLabel') }} </dfn>
                  {{ resourceChannelTitle(resourceId.contentnode_id) }}
                </p>
              </div>
            </KGridItem>
            <KGridItem size="3" alignment="right">
              <KButton
                :text="$tr('resourceRemovalButtonLabel')"
                appearance="flat-button"
                @click="removeResource(resourceId.contentnode_id)"
              />
            </KGridItem>
          </KGrid>
        </KDragHandle>
      </KDraggable>
    </transition-group>
  </KDragContainer>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KDragSortWidget from 'kolibri.coreVue.components.KDragSortWidget';
  import KDragContainer from 'kolibri.coreVue.components.KDragContainer';
  import KDragHandle from 'kolibri.coreVue.components.KDragHandle';
  import KDraggable from 'kolibri.coreVue.components.KDraggable';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';

  // This is a simplified version of ResourceListTable that is supposed to work
  // outside of the LessonSummaryPage workflow.
  export default {
    name: 'EditDetailsResourceListTable',
    components: {
      KDraggable,
      KDragContainer,
      KDragHandle,
      KDragSortWidget,
      KButton,
      KGrid,
      KGridItem,
      ContentIcon,
    },
    mixins: [themeMixin],
    props: {
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
    },
    methods: {
      ...mapActions(['createSnackbar', 'clearSnackbar']),
      resourceTitle(contentId) {
        return this.contentNodeMap[contentId].title;
      },
      resourceChannelTitle(resourceId) {
        return this.$store.getters['getChannelObject'](this.contentNodeMap[resourceId].channel_id)
          .title;
      },
      resourceKind(contentId) {
        return this.contentNodeMap[contentId].kind;
      },
      removeResource(resourceId) {
        this.$emit(
          'update:resources',
          this.resources.filter(({ contentnode_id }) => contentnode_id !== resourceId)
        );
        // Need to wait for the parent to update the resources prop
        this.$nextTick(() => {
          this.firstRemovalTitle = this.resourceTitle(resourceId);
          this.$store.commit('CORE_CREATE_SNACKBAR', {
            text: this.removalMessage,
            autoDismiss: true,
            duration: 5000,
            actionText: this.$tr('undoActionPrompt'),
            actionCallback: () => {
              this.$emit('update:resources', this.resourcesBackup);
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

        this.$emit('update:resources', resources);

        this.createSnackbar(this.$tr('resourceReorderConfirmationMessage'));
      },
      handleDrag({ newArray }) {
        this.$emit('update:resources', newArray);
        this.createSnackbar(this.$tr('resourceReorderConfirmationMessage'));
      },
    },
    $trs: {
      noResources: 'No resources',
      resourceReorderConfirmationMessage: 'Resource moved',
      undoActionPrompt: 'Undo',
      resourceReorderColumnHeaderForTable:
        'Use buttons in this column to re-order resources in the lesson',
      resourceTypeColumnHeaderForTable: 'Resource type',
      lessonTitleColumnHeaderForTable: 'Title',
      resourceRemovalColumnHeaderForTable:
        'Use buttons in this column to remove resources from the lesson',
      resourceRemovalButtonLabel: 'Remove',
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
