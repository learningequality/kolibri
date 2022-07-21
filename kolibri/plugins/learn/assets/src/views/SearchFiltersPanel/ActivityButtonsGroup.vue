<template>

  <div>
    <h2 class="title">
      {{ $tr('activities') }}
    </h2>
    <KButton
      appearance="flat-button"
      :appearanceOverrides="activityStyles"
      :disabled="activeKeys.length === 0"
      @click="$emit('input', null)"
    >
      <KIcon icon="allActivities" class="activity-icon" />
      <p class="activity-button-text">
        {{ coreString('all') }}
      </p>
    </KButton>
    <span
      v-for="(key, activity) in learningActivitiesList"
      :key="key"
      alignment="center"
    >
      <KButton
        appearance="flat-button"
        :appearanceOverrides="isKeyActive(key)
          ? { ...activityStyles, ...activityActiveStyles }
          : activityStyles"
        :disabled="availableActivities &&
          !availableActivities[key] &&
          !isKeyActive(key)"
        @click="$emit('input', key)"
      >
        <KIcon :icon="activityIcon(activity)" class="activity-icon" />
        <p class="activity-button-text">
          {{ coreString(camelCase(activity)) }}
        </p>
      </KButton>
    </span>
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import invert from 'lodash/invert';
  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import plugin_data from 'plugin_data';

  const activitiesLookup = invert(LearningActivities);

  const learningActivitiesShown = {};

  if (process.env.NODE_ENV !== 'production') {
    // TODO rtibbles: remove this condition
    Object.assign(learningActivitiesShown, LearningActivities);
  } else {
    plugin_data.learningActivities.map(id => {
      const key = activitiesLookup[id];
      learningActivitiesShown[key] = id;
    });
  }

  export default {
    name: 'ActivityButtonsGroup',
    mixins: [commonCoreStrings],
    props: {
      availableLabels: {
        type: Object,
        required: false,
        default: null,
      },
      activeButtons: {
        type: Object,
        required: false,
        default: null,
      },
    },
    computed: {
      learningActivitiesList() {
        return learningActivitiesShown;
      },
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
          backgroundColor: this.$themeBrand.primary.v_50,
          border: '2px',
          borderColor: this.$themeTokens.primary,
          borderStyle: 'solid',
          borderRadius: '4px',
        };
      },
      availableActivities() {
        if (this.availableLabels) {
          const activities = {};
          for (let key of this.availableLabels.learning_activities) {
            activities[key] = true;
          }
          return activities;
        }
        return null;
      },
      activeKeys() {
        return Object.keys(this.activeButtons);
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


<style  lang="scss" scoped>

  .activity-icon {
    width: 34px;
    height: 34px;
  }

  .activity-button-text {
    margin: auto;
    margin-top: -12px;
  }

</style>
