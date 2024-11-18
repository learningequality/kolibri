<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="() => $router.go(-1)"
    @shouldFocusFirstEl="() => null"
  >
    <template #header>
      <KIconButton
        v-if="true"
        icon="back"
        @click="$router.go(-1)"
      />
    </template>
    <h1>EditLessonDetails</h1>
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';

  export default {
    name: 'EditLessonDetails',
    components: {
      SidePanelModal,
    },
  };

</script>
