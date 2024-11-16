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
  import { LearningActivities } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useLearningActivities from '../../../composables/useLearningActivities';

  export default {
    name: 'ActivityFilter',
    mixins: [commonCoreStrings],
    setup() {
      const { getLearningActivityLabel, getLearningActivityIcon } = useLearningActivities();
      const { windowIsLarge } = useKResponsiveWindow();
      return {
        getLearningActivityLabel,
        getLearningActivityIcon,
        windowIsLarge,
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
          activityType => activityType.value === this.activityTypeSelected,
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
              page: 1,
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
