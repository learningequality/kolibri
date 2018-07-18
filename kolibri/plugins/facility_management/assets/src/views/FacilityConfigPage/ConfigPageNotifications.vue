<template>

  <div>
    <UiAlert
      type="error"
      v-if="notification===notificationTypes.PAGELOAD_FAILURE"
      @dismiss="dismiss()"
    >
      {{ $tr('pageloadFailure') }}
    </UiAlert>

    <UiAlert
      type="success"
      v-if="notification===notificationTypes.SAVE_SUCCESS"
      @dismiss="dismiss()"
    >
      {{ $tr('saveSuccess') }}
    </UiAlert>

    <UiAlert
      type="success"
      v-if="notification===notificationTypes.SAVE_FAILURE"
      @dismiss="dismiss()"
    >
      {{ $tr('saveFailure') }}
    </UiAlert>
  </div>

</template>


<script>

  import UiAlert from 'kolibri.coreVue.components.UiAlert';
  import { notificationTypes } from '../../constants';

  export default {
    name: 'ConfigPageNotifications',
    components: { UiAlert },
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
