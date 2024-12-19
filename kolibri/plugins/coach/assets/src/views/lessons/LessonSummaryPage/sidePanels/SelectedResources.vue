<template>

  <div
    v-if="loading"
    class="resource-list-style"
  >
    <KCircularLoader />
  </div>
  <div
    v-else
    class="resource-list-style"
  >
    <p>{{ coreString('lessonsLabel') }} : {{ currentLesson.title }}</p>
    <p>{{ $tr('sizeLabel') }} : {{ bytesForHumans(currentLesson.size) }}</p>

    <DragContainer
      :items="resourceList"
      @sort="$emit('sortedResources', $event)"
    >
      <transition-group
        tag="div"
        name="list"
      >
        <Draggable
          v-for="(lesson, index) in resourceList"
          :key="lesson.id"
          :style="lessonOrderListButtonBorder"
        >
          <KGrid :style="{ paddingTop: '1em' }">
            <KGridItem
              :layout12="{ span: 10 }"
              :layout8="{ span: 5 }"
              :layout4="{ span: 3 }"
            >
              <div :style="{ display: 'flex' }">
                <DragHandle>
                  <DragSortWidget
                    :moveUpText="upLabel$"
                    :moveDownText="downLabel$"
                    :noDrag="true"
                    :isFirst="index === 0"
                    :isLast="index === resourceList.length - 1"
                    @moveUp="() => {}"
                    @moveDown="() => {}"
                  />
                </DragHandle>
                <div style="padding: 0 10px">
                  <span style="flex: 1">
                    <LearningActivityIcon
                      :kind="lesson.learning_activities[0]"
                      class="icon-style"
                    />
                  </span>
                </div>
                <div>
                  <span class="arrange-item-block">
                    <span>
                      <KRouterLink
                        v-if="lesson.link"
                        :text="lesson.title"
                        :to="lesson.link"
                        style="font-size: 14px"
                      />
                    </span>
                    <p style="font-size: 12px">{{ bytesForHumans(lesson.files[0].file_size) }}</p>
                  </span>
                </div>
              </div>
            </KGridItem>

            <KGridItem
              :layout12="{ span: 2 }"
              :layout8="{ span: 3 }"
              :layout4="{ span: 1 }"
            >
              <span class="add-minus-button">
                <KIconButton
                  icon="emptyTopic"
                  @click="$emit('navigateToParent', lesson.id)"
                />

                <KIconButton
                  icon="minus"
                  @click="$emit('removeResource', lesson.id)"
                />
              </span>
            </KGridItem>
          </KGrid>
        </Draggable>
      </transition-group>
    </DragContainer>
  </div>

</template>


<script>

  import DragSortWidget from 'kolibri-common/components/sortable/DragSortWidget';
  import DragContainer from 'kolibri-common/components/sortable/DragContainer';
  import DragHandle from 'kolibri-common/components/sortable/DragHandle';
  import Draggable from 'kolibri-common/components/sortable/Draggable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';

  export default {
    name: 'SelectedResources',
    components: {
      DragSortWidget,
      DragContainer,
      DragHandle,
      Draggable,
      LearningActivityIcon,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { upLabel$, downLabel$ } = searchAndFilterStrings;
      return {
        upLabel$,
        downLabel$,
      };
    },
    props: {
      resourceList: {
        type: Array,
        required: true,
      },
      currentLesson: {
        type: Object,
        required: true,
      },
      loading: {
        type: Boolean,
        required: true,
      },
    },

    computed: {
      lessonOrderListButtonBorder() {
        return {
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          height: `auto`,
          width: `100%`,
        };
      },
    },

    methods: {
      bytesForHumans,
    },
    $trs: {
      sizeLabel: {
        message: 'Size',
        context: 'Size of the lesson',
      },
    },
  };

</script>


<style scoped>

  .add-minus-button {
    float: right;
  }

  .arrange-item-block {
    display: block;
  }

  .icon-style {
    font-size: 24px;
  }

  .resource-list-style {
    margin-top: 2em;
    margin-bottom: 3.5em;
  }

</style>
