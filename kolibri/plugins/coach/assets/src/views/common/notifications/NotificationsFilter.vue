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

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { NotificationEvents } from '../../../constants/notificationsConstants';
  import commonCoach from '../../common';

  export default {
    name: 'NotificationsFilter',
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
            value: NotificationEvents.HELP_NEEDED,
          },
          {
            label: this.coachStrings.$tr('startedLabel'),
            value: NotificationEvents.STARTED,
          },
          {
            label: this.coachStrings.$tr('completedLabel'),
            value: NotificationEvents.COMPLETED,
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
            value: ContentNodeKinds.LESSON,
          },
          {
            label: this.coachStrings.$tr('quizzesLabel'),
            value: 'quiz',
          },
          {
            label: this.$tr('exercisesLabel'),
            value: ContentNodeKinds.EXERCISE,
          },
          {
            label: this.$tr('videosLabel'),
            value: ContentNodeKinds.VIDEO,
          },
          {
            label: this.$tr('audioLabel'),
            value: ContentNodeKinds.AUDIO,
          },
          {
            label: this.$tr('documentsLabel'),
            value: ContentNodeKinds.DOCUMENT,
          },
          {
            label: this.$tr('appsLabel'),
            value: ContentNodeKinds.HTML5,
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
