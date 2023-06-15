<template>

  <AppBarPage :title="title">

    <template #subNav>
      <DeviceTopNav />
    </template>

    <DeprecationWarningBanner style="margin-bottom: 1em" />

    <div>
      <slot></slot>
    </div>

  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import DeviceTopNav from './DeviceTopNav';
  import DeprecationWarningBanner from './DeprecationWarningBanner';

  export default {
    name: 'DeviceAppBarPage',
    components: { AppBarPage, DeprecationWarningBanner, DeviceTopNav },
    props: {
      title: {
        type: String,
        required: true,
      },
    },
  };

</script>
