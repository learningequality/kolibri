<template>

  <div>
    <ui-alert
      type="error"
      v-if="notification===notificationTypes.PAGELOAD_FAILURE"
      @dismiss="dismiss()"
    >
      {{ $tr('pageloadFailure') }}
    </ui-alert>

    <ui-alert
      type="success"
      v-if="notification===notificationTypes.SAVE_SUCCESS"
      @dismiss="dismiss()"
    >
      {{ $tr('saveSuccess') }}
    </ui-alert>

    <ui-alert
      type="success"
      v-if="notification===notificationTypes.SAVE_FAILURE"
      @dismiss="dismiss()"
    >
      {{ $tr('saveFailure') }}
    </ui-alert>
  </div>

</template>


<script>

  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import { notificationTypes } from '../../constants';

  export default {
    name: 'configPageNotifications',
    components: { uiAlert },
    props: {
      notification: {
        type: String,
        required: false,
      },
    },
    computed: { notificationTypes: () => notificationTypes },
    methods: {
      dismiss() {
        this.$emit('dismiss');
      },
    },
    $trs: {
      saveFailure: 'There was a problem saving your settings',
      saveSuccess: 'Facility settings updated',
      pageloadFailure: 'There was a problem loading your settings',
    },
  };

</script>
