<template>

  <div>
    <h2 class="title">
      {{ $tr('activities') }}
    </h2>
    <KButton
      appearance="flat-button"
      :appearanceOverrides="customActivityStyles"
    >
      <KIcon icon="allActivities" class="activity-icon" />
      <p class="activity-button-text">
        {{ learnString('all') }}
      </p>
    </KButton>
    <span
      v-for="(value, activity) in learningActivitiesList"
      :key="activity"
      alignment="center"
    >
      <KButton
        appearance="flat-button"
        :appearanceOverrides="customActivityStyles"
      >
        <KIcon :icon="`${value + 'Shaded'}`" class="activity-icon" />
        <p class="activity-button-text">
          {{ learnString(value) }}
        </p>
      </KButton>
    </span>
  </div>

</template>


<script>

  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';

  import commonLearnStrings from '../commonLearnStrings';

  export default {
    name: 'ActivityButtonsGroup',
    mixins: [commonLearnStrings],

    computed: {
      learningActivitiesList() {
        let learningActivites = {};
        Object.keys(LearningActivities)
          // remove topic folder, since it is not actually an activity itself
          .filter(key => key !== 'TOPIC')
          .map(key => {
            // map 'interact' KDS icon to new 'explore' wording
            if (LearningActivities[key] === 'explore') {
              LearningActivities[key] = 'interact';
            }
            learningActivites[key] = LearningActivities[key];
          });
        return learningActivites;
      },
      customActivityStyles() {
        return {
          color: this.$themeTokens.text,
          width: '50%',
          height: '100px',
          border: '2px solid transparent',
          'text-transform': 'capitalize',
          'text-align': 'center',
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
    padding: 0;
    margin: 0;
  }

</style>
