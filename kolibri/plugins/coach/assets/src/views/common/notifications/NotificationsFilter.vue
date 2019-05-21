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
  import {
    NotificationEvents,
    NotificationObjects,
  } from '../../../constants/notificationsConstants';
  import commonCoach from '../../common';

  export default {
    name: 'NotificationsFilter',
    mixins: [commonCoach],
    props: {
      enabledFilters: {
        type: Object,
        required: true,
      },
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
            label: this.common$tr('helpNeededLabel'),
            value: NotificationEvents.HELP_NEEDED,
            disabled: this.progressIsDisabled(NotificationEvents.HELP_NEEDED),
          },
          {
            label: this.common$tr('startedLabel'),
            value: NotificationEvents.STARTED,
            disabled: this.progressIsDisabled(NotificationEvents.STARTED),
          },
          {
            label: this.common$tr('completedLabel'),
            value: NotificationEvents.COMPLETED,
            disabled: this.progressIsDisabled(NotificationEvents.COMPLETED),
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
            label: this.common$tr('lessonsLabel'),
            value: ContentNodeKinds.LESSON,
            disabled: this.resourceIsDisabled(NotificationObjects.LESSON),
          },
          {
            label: this.common$tr('quizzesLabel'),
            value: 'quiz',
            disabled: this.resourceIsDisabled(NotificationObjects.QUIZ),
          },
          {
            label: this.$tr('exercisesLabel'),
            value: ContentNodeKinds.EXERCISE,
            disabled: this.resourceIsDisabled(ContentNodeKinds.EXERCISE),
          },
          {
            label: this.$tr('videosLabel'),
            value: ContentNodeKinds.VIDEO,
            disabled: this.resourceIsDisabled(ContentNodeKinds.VIDEO),
          },
          {
            label: this.$tr('audioLabel'),
            value: ContentNodeKinds.AUDIO,
            disabled: this.resourceIsDisabled(ContentNodeKinds.AUDIO),
          },
          {
            label: this.$tr('documentsLabel'),
            value: ContentNodeKinds.DOCUMENT,
            disabled: this.resourceIsDisabled(ContentNodeKinds.DOCUMENT),
          },
          {
            label: this.$tr('appsLabel'),
            value: ContentNodeKinds.HTML5,
            disabled: this.resourceIsDisabled(ContentNodeKinds.HTML5),
          },
        ];
      },
    },
    beforeMount() {
      this.progressType = this.progressTypeOptions[0];
      this.resourceType = this.resourceTypeOptions[0];
    },
    methods: {
      resourceIsDisabled(value) {
        return !this.enabledFilters.resource.includes(value);
      },
      progressIsDisabled(value) {
        return !this.enabledFilters.progress.includes(value);
      },
    },
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
  };

</script>


<style lang="scss" scoped></style>
