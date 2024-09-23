<template>

  <div>
    <h2 class="title">
      {{ $tr('activities') }}
    </h2>
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
        :disabled="availableActivities && !availableActivities[key] && !isKeyActive(key)"
        @click="$emit('input', key)"
      >
        <KIcon
          :icon="activityIcon(activity)"
          class="activity-icon"
        />
        <p class="activity-button-text">
          {{ coreString(camelCase(activity)) }}
        </p>
      </KButton>
    </span>
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';

  export default {
    name: 'ActivityButtonsGroup',
    mixins: [commonCoreStrings],
    setup() {
      const { availableLearningActivities, searchableLabels, activeSearchTerms } =
        injectBaseSearch();
      return {
        availableLearningActivities,
        searchableLabels,
        activeSearchTerms,
      };
    },
    computed: {
      activityStyles() {
        return {
          color: this.$themeTokens.text,
          width: '50%',
          height: '100px',
          border: '2px solid transparent',
          textTransform: 'capitalize',
          fontWeight: 'normal',
          transition: 'none',
          ':hover': this.activityActiveStyles,
        };
      },
      activityActiveStyles() {
        return {
          backgroundColor: this.$themeBrand.primary.v_200,
          border: '2px',
          borderColor: this.$themeTokens.primary,
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
      activityIcon(activity) {
        if (activity == 'EXPLORE') {
          return 'interactShaded';
        } else {
          return `${camelCase(activity) + 'Shaded'}`;
        }
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
    margin: auto;
    margin-top: -12px;
  }

</style>
