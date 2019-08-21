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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    NotificationEvents,
    NotificationObjects,
  } from '../../../constants/notificationsConstants';
  import commonCoach from '../../common';

  export default {
    name: 'NotificationsFilter',
    mixins: [commonCoach, commonCoreStrings],
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
            label: this.coreString('allLabel'),
            value: 'all',
          },
          {
            label: this.coachString('helpNeededLabel'),
            value: NotificationEvents.HELP_NEEDED,
            disabled: this.progressIsDisabled(NotificationEvents.HELP_NEEDED),
          },
          {
            label: this.coachString('startedLabel'),
            value: NotificationEvents.STARTED,
            disabled: this.progressIsDisabled(NotificationEvents.STARTED),
          },
          {
            label: this.coreString('completedLabel'),
            value: NotificationEvents.COMPLETED,
            disabled: this.progressIsDisabled(NotificationEvents.COMPLETED),
          },
        ];
      },
      resourceTypeOptions() {
        return [
          {
            label: this.coreString('allLabel'),
            value: 'all',
          },
          {
            label: this.coreString('lessonsLabel'),
            value: ContentNodeKinds.LESSON,
            disabled: this.resourceIsDisabled(NotificationObjects.LESSON),
          },
          {
            label: this.coreString('quizzesLabel'),
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
      appsLabel: 'Apps',
      audioLabel: 'Audio',
      documentsLabel: 'Documents',
      exercisesLabel: 'Exercises',
      progressTypeLabel: 'Progress type',
      resourceTypeLabel: 'Resource type',
      videosLabel: 'Videos',
    },
  };

</script>


<style lang="scss" scoped></style>
