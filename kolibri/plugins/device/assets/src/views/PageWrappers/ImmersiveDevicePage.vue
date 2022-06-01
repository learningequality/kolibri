<template>

  <ImmersivePage
    :appBarTitle="appBarTitle"
    :route="route"
    :icon="icon"
  >
    <!-- Bootstraps everything in a centered KPageContainer -->
    <KPageContainer style="max-width: 1000px; margin: 32px auto;">
      <slot></slot>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';

  export default {
    name: 'ImmersiveDevicePage',
    components: {
      ImmersivePage,
    },
    props: {
      appBarTitle: {
        type: String,
        default: '',
      },
      route: {
        type: Object,
        default: null,
      },
      icon: {
        type: String,
        default: 'close',
      },
    },
  };

</script>
