<template>

  <div
    class="time-context"
    :style="{ color: $themeTokens.annotation }"
  >
    {{ formattedTime }}
  </div>

</template>


<script>

  import useNow from 'kolibri/composables/useNow';

  const ACTION_TYPES = ['created', 'closed', 'opened', 'madeVisible', 'hidden'];

  export default {
    name: 'StatusElapsedTime',
    setup() {
      const { now } = useNow();
      return { now };
    },
    props: {
      date: {
        type: Date,
        required: false,
        default: null,
      },
      // actionType determines which version of the $trs to use
      // Options are: 'created', 'closed' or 'null'
      actionType: {
        type: String,
        required: false,
        default: null,
        validator: function (value) {
          return ACTION_TYPES.includes(value);
        },
      },
    },
    computed: {
      formattedTime() {
        // No need to do anything if there is no date given.
        if (!this.date) {
          return '';
        }
        // The following is a bit verbose - but our i18n profiling can better process
        // our translation usage when used explicitly rather than by dynamically
        // generating the string identifiers.
        const relativeTimeAgo = this.$formatRelative(this.date, { now: this.now });
        switch (this.actionType) {
          case 'created':
            return this.$tr('created', { relativeTimeAgo });
          case 'closed':
            return this.$tr('closed', { relativeTimeAgo });
          case 'opened':
            return this.$tr('opened', { relativeTimeAgo });
          case 'madeVisible':
            return this.$tr('madeVisible', { relativeTimeAgo });
          case 'hidden':
            return this.$tr('hidden', { relativeTimeAgo });
          default:
            return '';
        }
      },
    },
    $trs: {
      created: {
        message: 'Created  {relativeTimeAgo}',
        context: 'Indicates that a quiz was created a certain amount of time ago.',
      },
      closed: {
        message: 'Ended  {relativeTimeAgo}',
        context: 'Indicates that a quiz was ended a certain amount of time ago.',
      },
      opened: {
        message: 'Started  {relativeTimeAgo}',
        context: 'Indicates that a quiz was started a certain amount of time ago.',
      },
      madeVisible: {
        message: 'Made visible {relativeTimeAgo}',
        context: 'Indicates that a quiz was made visible a certain amount of time ago.',
      },
      hidden: {
        message: 'Hidden {relativeTimeAgo}',
        context:
          'Indicates that a lesson was made not visible to a learner  a certain amount of time ago.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .time-context {
    display: block;
    margin-top: 2px;
    margin-bottom: -1rem;
    font-size: small;
  }

</style>
