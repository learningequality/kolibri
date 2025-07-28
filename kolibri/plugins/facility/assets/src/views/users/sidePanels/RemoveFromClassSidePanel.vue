<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    @closePanel="$router.back()"
  >
    <template #header>
      <h1>{{ coreString('classesLabel') }}</h1>
    </template>
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'RemoveFromClassSidePanel',
    components: {
      SidePanelModal,
    },
    mixins: [commonCoreStrings],
    props: {
      /* eslint-disable vue/no-unused-properties */
      selectedUsers: {
        type: Set,
        default: () => new Set(),
      },
      classes: {
        type: Array,
        default: () => [],
      },
    },
  };

</script>
