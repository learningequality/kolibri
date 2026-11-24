<template>

  <AppBarPage
    :title="title"
    :loading="loading"
  >
    <LocalNotificationBanner />
    <DeprecationWarningBanner style="margin-bottom: 1em" />

    <div>
      <slot></slot>
    </div>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import LocalNotificationBanner from 'kolibri-common/components/LocalNotificationBanner';
  import DeprecationWarningBanner from './DeprecationWarningBanner';

  export default {
    name: 'DeviceAppBarPage',
    components: { AppBarPage, LocalNotificationBanner, DeprecationWarningBanner },
    props: {
      title: {
        type: String,
        required: true,
      },
      loading: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>
