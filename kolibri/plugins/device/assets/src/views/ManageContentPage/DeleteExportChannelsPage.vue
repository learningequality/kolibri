<template>

  <div>


    <SelectDriveModal v-if="exportMode && showModal" />
    <DeleteChannelModal v-if="deleteMode && showModal" />
    <SelectionBottomBar />
  </div>

</template>


<script>

  import SelectionBottomBar from './SelectionBottomBar';
  import DeleteChannelModal from './DeleteChannelModal';

  // Data requirements
  // List of channels on device
  export default {
    name: 'DeleteExportChannelsPage',
    components: {
      SelectionBottomBar,
      DeleteChannelModal,
    },
    props: {
      actionType: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showModal: false,
      }
    },
    computed: {

    },
    methods: {

    },
    $trs: {
      deleteAppBarTitle: 'Delete channels',
      exportAppBarTitle: 'Export channels',
    }
  };

</script>


<style lang="scss" scoped></style>
