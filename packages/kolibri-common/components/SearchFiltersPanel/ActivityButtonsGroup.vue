<template>

  <div>
    <h2
      v-if="Object.keys(availableLearningActivities).length > 0"
      class="title"
    >
      {{ $tr('activities') }}
    </h2>
    <div class="wrapper">
      <span
        v-for="(key, activity) in availableLearningActivities"
        :key="key"
        alignment="center"
      >
        <KButton
          appearance="flat-button"
          :appearanceOverrides="
            isKeyActive(key) ? { ...activityStyles, ...activityActiveStyles } : activityStyles
          "
          :disabled="
            searchLoading || (availableActivities && !availableActivities[key] && !isKeyActive(key))
          "
          @click="$emit('input', key)"
        >
          <KIcon
            :icon="getLearningActivityIcon(key, true)"
            class="activity-icon"
          />
          <p class="activity-button-text">
            {{ coreString(camelCase(activity)) }}
          </p>
        </KButton>
      </span>
    </div>
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { computed } from 'vue';
  import useKResponsiveElement from 'kolibri-design-system/lib/composables/useKResponsiveElement';

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import useLearningActivities from 'kolibri-common/composables/useLearningActivities';

  export default {
    name: 'ActivityButtonsGroup',
    mixins: [commonCoreStrings],
    setup() {
      const { availableLearningActivities, searchableLabels, activeSearchTerms, searchLoading } =
        injectBaseSearch();
      const { getLearningActivityIcon } = useLearningActivities();
      const { elementWidth } = useKResponsiveElement();

      // Narrower buttons can't fit longer translated labels (e.g. "Упражняване") on one line
      const minButtonWidth = 96;
      const columns = computed(() =>
        Math.min(4, Math.max(2, Math.floor(elementWidth.value / minButtonWidth))),
      );

      return {
        availableLearningActivities,
        searchableLabels,
        activeSearchTerms,
        searchLoading,
        getLearningActivityIcon,
        columns,
      };
    },
    computed: {
      activityStyles() {
        return {
          color: 'var(--tokens-text)',
          width: '100%',
          minHeight: '80px',
          padding: '8px 4px',
          whiteSpace: 'normal',
          lineHeight: 'normal',
          border: '2px solid transparent',
          textTransform: 'capitalize',
          fontWeight: 'normal',
          transition: 'none',
          ':hover': this.activityActiveStyles,
        };
      },
      activityActiveStyles() {
        return {
          backgroundColor: 'var(--brand-primary-v100)',
          border: '2px',
          borderColor: 'var(--tokens-primary)',
          borderStyle: 'solid',
          borderRadius: '4px',
        };
      },
      availableActivities() {
        if (this.searchableLabels) {
          const activities = {};
          for (const key of this.searchableLabels.learning_activities) {
            activities[key] = true;
          }
          return activities;
        }
        return null;
      },
      activeKeys() {
        return Object.keys(
          (this.activeSearchTerms && this.activeSearchTerms.learning_activities) || {},
        );
      },
    },
    methods: {
      camelCase(id) {
        return camelCase(id);
      },
      isKeyActive(key) {
        return key !== null && !!this.activeKeys.filter(k => k.includes(key)).length;
      },
    },
    $trs: {
      activities: {
        message: 'Activities',
        context: 'Section header label in the Library page sidebar.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .activity-icon {
    width: 34px;
    height: 34px;
  }

  .activity-button-text {
    margin: 0;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .wrapper {
    display: grid;
    grid-template-columns: repeat(v-bind(columns), minmax(0, 1fr));
  }

</style>
