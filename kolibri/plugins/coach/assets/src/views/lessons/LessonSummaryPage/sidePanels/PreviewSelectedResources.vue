<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="() => $router.go(-1)"
    @shouldFocusFirstEl="() => null"
  >
    <h1>PreviewSelectedResources</h1>
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';

  export default {
    name: 'PreviewSelectedResources',
    components: {
      SidePanelModal,
    },
  };

</script>
