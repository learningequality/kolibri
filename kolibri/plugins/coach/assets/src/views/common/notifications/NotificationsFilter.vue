<template>

  <div>
    <KSelect
      :label="$tr('resourceTypeLabel')"
      :options="resourceTypeOptions"
      :inline="true"
      :value="resourceType"
    />
    <KSelect
      :label="$tr('progressTypeLabel')"
      :options="progressTypeOptions"
      :inline="true"
      :value="progressType"
    />
  </div>

</template>


<script>

  import commonCoach from '../../common';

  export default {
    name: 'NotificationsFilter',
    components: {},
    mixins: [commonCoach],
    $trs: {
      allLabel: 'All',
      appsLabel: 'Apps',
      audioLabel: 'Audio',
      bookLabel: 'Book',
      eventTypeLabel: 'Event type',
      dateLabel: 'Date',
      documentsLabel: 'Documents',
      exercisesLabel: 'Exercises',
      needsHelpOnlyToggle: "Show only 'Needs help'",
      progressTypeLabel: 'Progress type',
      resourceTypeLabel: 'Resource type',
      typeLabel: 'Type',
      videosLabel: 'Videos',
    },
    data() {
      return {
        progressType: null,
        resourceType: null,
      };
    },
    computed: {
      progressTypeOptions() {
        return [
          {
            label: this.$tr('allLabel'),
            value: 'all',
          },
          {
            label: this.coachStrings.$tr('helpNeededLabel'),
            value: 'needsHelp',
          },
          {
            label: this.coachStrings.$tr('startedLabel'),
            value: 'started',
          },
          {
            label: this.coachStrings.$tr('completedLabel'),
            value: 'completed',
          },
        ];
      },
      resourceTypeOptions() {
        return [
          {
            label: this.$tr('allLabel'),
            value: 'all',
          },
          {
            label: this.coachStrings.$tr('lessonsLabel'),
            value: 'lessons',
          },
          {
            label: this.coachStrings.$tr('quizzesLabel'),
            value: 'quizzes',
          },
          {
            label: this.$tr('exercisesLabel'),
            value: 'exercises',
          },
          {
            label: this.$tr('videosLabel'),
            value: 'videos',
          },
          {
            label: this.$tr('audioLabel'),
            value: 'audio',
          },
          {
            label: this.$tr('documentsLabel'),
            value: 'documents',
          },
          {
            label: this.$tr('appsLabel'),
            value: 'apps',
          },
        ];
      },
    },
    beforeMount() {
      this.progressType = this.progressTypeOptions[0];
      this.resourceType = this.resourceTypeOptions[0];
    },
  };

</script>


<style lang="scss" scoped></style>
