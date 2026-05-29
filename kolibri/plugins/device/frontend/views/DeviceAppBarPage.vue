<template>

  <AppBarPage
    :title="title"
    :loading="loading"
  >
    <ImpactStoryBanner />
    <DeprecationWarningBanner style="margin-bottom: 1em" />

    <div>
      <slot></slot>
    </div>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import ImpactStoryBanner from 'kolibri-common/components/ImpactStoryBanner';
  import DeprecationWarningBanner from './DeprecationWarningBanner';

  export default {
    name: 'DeviceAppBarPage',
    components: { AppBarPage, ImpactStoryBanner, DeprecationWarningBanner },
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
