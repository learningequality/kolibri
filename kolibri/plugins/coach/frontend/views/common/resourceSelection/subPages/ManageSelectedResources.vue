<template>

  <div>
    <div
      v-if="target === SelectionTarget.LESSON"
      class="selection-metadata-info"
    >
      <p>{{ lessonLabel$() }}: {{ lessonTitle }}</p>
      <p>{{ sizeLabel$() }}: {{ bytesForHumans(selectedResourcesSize) }}</p>
    </div>
    <div v-if="selectedResources.length > 0">
      <div
        v-for="resource in selectedResources"
        :key="resource.id"
      >
        <div
          class="resource-row"
          :style="rowStyles"
        >
          <div class="row-content">
            <LearningActivityIcon
              :kind="resource.learning_activities[0]"
              class="icon-style"
            />
            <div>
              <span class="arrange-item-block">
                <span>
                  <KRouterLink
                    :text="resource.title"
                    :to="getResourceLink(resource.id)"
                    style="font-size: 14px"
                  />
                </span>
                <p
                  class="resource-size"
                  :style="{
                    color: $themeTokens.annotation,
                  }"
                >
                  {{ bytesForHumans(getResourceSize(resource)) }}
                </p>
              </span>
            </div>
          </div>
          <span class="row-actions">
            <KIconButton
              icon="emptyTopic"
              :ariaLabel="openParentFolderLabel$()"
              :tooltip="openParentFolderLabel$()"
              :disabled="disabled"
              @click="navigateToParent(resource)"
            />

            <KIconButton
              icon="minus"
              :ariaLabel="removeResourceLabel$()"
              :tooltip="removeResourceLabel$()"
              :disabled="disabled"
              @click="removeResource(resource)"
            />
          </span>
        </div>
      </div>
    </div>
    <p v-else>
      {{ emptyResourceList$() }}
    </p>
  </div>

</template>


<script>

  import { watch } from 'vue';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute.js';
  import { coachStrings } from '../../commonCoachStrings.js';
  import { PageNames } from '../../../../constants/index.js';
  import { SelectionTarget } from '../contants.js';

  export default {
    name: 'ManageSelectedResources',
    components: {
      LearningActivityIcon,
    },
    setup(props) {
      const {
        emptyResourceList$,
        removeResourceLabel$,
        openParentFolderLabel$,
        numberOfSelectedResources$,
      } = searchAndFilterStrings;
      const { lessonLabel$, sizeLabel$ } = coachStrings;

      const goBack = useGoBack({
        fallbackRoute: {
          name:
            props.target === SelectionTarget.LESSON
              ? PageNames.LESSON_SELECT_RESOURCES_INDEX
              : PageNames.QUIZ_SELECT_RESOURCES_INDEX,
        },
      });

      props.setTitle(numberOfSelectedResources$({ count: props.selectedResources.length }));
      props.setGoBack(goBack);

      watch(
        () => props.selectedResources,
        () => {
          props.setTitle(numberOfSelectedResources$({ count: props.selectedResources.length }));
        },
      );

      return {
        SelectionTarget,
        sizeLabel$,
        lessonLabel$,
        emptyResourceList$,
        removeResourceLabel$,
        openParentFolderLabel$,
      };
    },
    props: {
      setTitle: {
        type: Function,
        default: () => {},
      },
      setGoBack: {
        type: Function,
        default: () => {},
      },
      selectedResources: {
        type: Array,
        required: true,
      },
      selectedResourcesSize: {
        type: Number,
        required: false,
        default: 0,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * The target entity for the selection.
       * It can be either 'quiz' or 'lesson'.
       */
      target: {
        type: String,
        required: true,
      },
      lessonTitle: {
        type: String,
        required: false,
        default: null,
      },
      /**
       * Function that receives a resourceId and returns a link to the resource.
       */
      getResourceLink: {
        type: Function,
        required: true,
      },
    },

    computed: {
      rowStyles() {
        return {
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          height: `auto`,
          width: `100%`,
        };
      },
    },
    methods: {
      bytesForHumans,
      getResourceSize(resource) {
        return resource.files.reduce((acc, file) => acc + file.file_size, 0);
      },
      removeResource(resource) {
        this.$emit('deselectResources', [resource]);
      },
      navigateToParent(resource) {
        const pageName =
          this.target === SelectionTarget.LESSON
            ? PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE
            : PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE;

        this.$router.push({
          name: pageName,
          query: { topicId: resource.parent },
        });
      },
    },
  };

</script>


<style scoped lang="scss">

  .resource-row {
    display: flex;
    gap: 8px;
    justify-content: space-between;
    padding-top: 16px;

    &:last-of-type {
      border-width: 0 !important;
    }

    .resource-size {
      margin-top: 10px;
      margin-bottom: 16px;
      font-size: 12px;
    }

    .row-content {
      display: flex;
      gap: 16px;
    }

    .row-actions {
      flex-shrink: 0;
    }
  }

  .arrange-item-block {
    display: block;
  }

  .icon-style {
    font-size: 21px;
  }

  .selection-metadata-info p {
    margin-top: 0;
    margin-bottom: 24px;
  }

</style>
