<template>

  <div>
    <h2 class="title">
      {{ $tr('activities') }}
    </h2>
    <KButton
      appearance="flat-button"
      :appearanceOverrides="customActivityStyles"
      @click="$emit('input', null)"
    >
      <KIcon icon="allActivities" class="activity-icon" />
      <p class="activity-button-text">
        {{ coreString('all') }}
      </p>
    </KButton>
    <span
      v-for="(value, activity) in learningActivitiesList"
      :key="value"
      alignment="center"
    >
      <KButton
        appearance="flat-button"
        :appearanceOverrides="customActivityStyles"
        :disabled="availableActivities &&
          !availableActivities[value] &&
          !activeKeys.filter(k => k.includes(value)).length "
        :class="!!activeKeys.filter(k => k.includes(value)).length ? 'active' : ''"
        @click="$emit('input', value)"
      >
        <KIcon :icon="`${camelCase(activity) + 'Shaded'}`" class="activity-icon" />
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
      customActivityStyles() {
        return {
          color: this.$themeTokens.text,
          width: '50%',
          height: '100px',
          border: '2px solid transparent',
          'text-transform': 'capitalize',
          'font-weight': 'normal',
          transition: 'none',
          ':hover': {
            'background-color': 'rgb(235, 210, 235)',
            border: '2px',
            'border-color': '#996189',
            'border-style': 'solid',
            'border-radius': '4px',
            'line-spacing': '0',
          },
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

  .active {
    background-color: rgb(235, 210, 235);
    border: 2px !important;
    border-color: #996189 !important;
    border-style: solid !important;
    border-radius: 4px !important;
  }

</style>
