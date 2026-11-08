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
          :class="{ inert: isInert(key) }"
          :appearanceOverrides="
            isKeyActive(key) ? { ...activityStyles, ...activityActiveStyles } : activityStyles
          "
          :aria-disabled="isInert(key)"
          @click="!isInert(key) && $emit('input', key)"
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
      return {
        availableLearningActivities,
        searchableLabels,
        activeSearchTerms,
        searchLoading,
        getLearningActivityIcon,
      };
    },
    computed: {
      activityStyles() {
        return {
          color: 'var(--tokens-text)',
          width: '80px',
          height: '80px',
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
      isInert(key) {
        return (
          this.searchLoading ||
          (this.availableActivities && !this.availableActivities[key] && !this.isKeyActive(key))
        );
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
    margin: auto;
    margin-top: -12px;
  }

  .inert {
    pointer-events: none;
    opacity: 0.5;
  }

  .wrapper {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  }

</style>
