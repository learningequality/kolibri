<template>

  <div>
    <ui-alert
      type="error"
      v-if="notification===notificationTypes.PAGELOAD_FAILURE"
      @dismiss="dismiss()"
    >
      {{ $tr('pageload_failure') }}
    </ui-alert>

    <ui-alert
      type="success"
      v-if="notification===notificationTypes.SAVE_SUCCESS"
      @dismiss="dismiss()"
    >
      {{ $tr('save_success') }}
    </ui-alert>

    <ui-alert
      type="success"
      v-if="notification===notificationTypes.SAVE_FAILURE"
      @dismiss="dismiss()"
    >
      {{ $tr('save_failure') }}
    </ui-alert>
  </div>

</template>


<script>
  const { notificationTypes } = require('../../constants');

  module.exports = {
    components: {
      'ui-alert': require('keen-ui/src/UiAlert'),
    },
    props: {
      notification: {
        type: String,
        required: false,
      },
    },
    computed: {
      notificationTypes: () => notificationTypes,
    },
    methods: {
      dismiss() {
        this.$emit('dismiss');
      }
    },
    $trNameSpace: 'configPageNotifications',
    $trs: {
      save_failure: 'There was a problem saving your settings',
      save_success: 'Facility settings updated!',
      pageload_failure: 'There was a problem loading your settings',
    },
  };

</script>


<style lang="stylus" scoped>

</style>
