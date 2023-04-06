<template>

  <KSelect
    class="selector"
    :style="selectorStyle"
    :inline="windowIsLarge"
    :label="coreString('activityType')"
    :options="activityTypes"
    :value="selected"
    @change="handleActivityTypeChange($event.value)"
  >
    <template #display>
      <KLabeledIcon
        :label="selected.label"
        :icon="selected.icon"
      />
    </template>
    <template #option="{ option }">
      <KLabeledIcon
        :label="option.label"
        :icon="option.icon"
        :style="{ padding: '8px' }"
      />
    </template>
  </KSelect>

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import useLearningActivities from '../../../composables/useLearningActivities';

  export default {
    name: 'ActivityFilter',
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const { getLearningActivityLabel, getLearningActivityIcon } = useLearningActivities();

      return {
        getLearningActivityLabel,
        getLearningActivityIcon,
      };
    },
    data() {
      return {
        activityTypes: [
          {
            label: this.coreString('all'),
            value: 'all',
            icon: 'allActivities',
          },
          ...[
            LearningActivities.WATCH,
            LearningActivities.READ,
            LearningActivities.PRACTICE,
            LearningActivities.REFLECT,
            LearningActivities.LISTEN,
            LearningActivities.CREATE,
            LearningActivities.EXPLORE,
          ].map(activity => ({
            label: this.getLearningActivityLabel(activity),
            value: activity,
            icon: this.getLearningActivityIcon(activity),
          })),
        ],
      };
    },
    computed: {
      selectorStyle() {
        return {
          color: this.$themeTokens.text,
          backgroundColor: this.$themePalette.grey.v_200,
          borderRadius: '2px',
          marginTop: '16px',
          marginBottom: 0,
          width: this.windowIsLarge
            ? 'calc(50% - 16px)' // 16px is the margin of the select
            : '100%',
        };
      },
      selected() {
        return this.activityTypes.find(
          activityType => activityType.value === this.activityTypeSelected
        );
      },
      activityTypeSelected: {
        get() {
          return this.$route.query.activity || 'all';
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              activity: value,
            }),
          });
        },
      },
    },
    methods: {
      handleActivityTypeChange(value) {
        this.activityTypeSelected = value;
      },
    },
  };

</script>
