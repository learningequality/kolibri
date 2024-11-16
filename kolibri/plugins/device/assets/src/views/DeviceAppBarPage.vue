<template>

  <AppBarPage :title="title">
    <DeprecationWarningBanner style="margin-bottom: 1em" />

    <div>
      <slot></slot>
    </div>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import DeprecationWarningBanner from './DeprecationWarningBanner';

  export default {
    name: 'DeviceAppBarPage',
    components: { AppBarPage, DeprecationWarningBanner },
    props: {
      title: {
        type: String,
        required: true,
      },
    },
  };

</script>
