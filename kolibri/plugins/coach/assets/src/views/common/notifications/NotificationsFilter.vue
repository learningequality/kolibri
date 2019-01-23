<template>

  <div>
    <KSelect
      :label="$tr('resourceTypeLabel')"
      :options="resourceTypeOptions"
      :inline="true"
      :value="resourceType"
      @change="$emit('update:resourceFilter', $event.value)"
    />
    <KSelect
      :label="$tr('progressTypeLabel')"
      :options="progressTypeOptions"
      :inline="true"
      :value="progressType"
      @change="$emit('update:progressFilter', $event.value)"
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
            value: 'HelpNeeded',
          },
          {
            label: this.coachStrings.$tr('startedLabel'),
            value: 'Started',
          },
          {
            label: this.coachStrings.$tr('completedLabel'),
            value: 'Completed',
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
            value: 'lesson',
          },
          {
            label: this.coachStrings.$tr('quizzesLabel'),
            value: 'quiz',
          },
          {
            label: this.$tr('exercisesLabel'),
            value: 'exercise',
          },
          {
            label: this.$tr('videosLabel'),
            value: 'video',
          },
          {
            label: this.$tr('audioLabel'),
            value: 'audio',
          },
          {
            label: this.$tr('documentsLabel'),
            value: 'document',
          },
          {
            label: this.$tr('appsLabel'),
            value: 'html5',
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
