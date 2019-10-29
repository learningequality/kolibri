<template>

  <div>
    <BottomAppBar>
      <div></div>
    </BottomAppBar>
  </div>

</template>


<script>

  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';

  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    props: {
      numObjects: {
        type: String,
      },
      objectType: {
        type: String,
      },
      fileSize: {
        type: Number,
      },
      actionType: {
        type: String,
      }
    },
    computed: {

    },
    methods: {

    },
    $trs: {
      zeroChannelsSelected: '0 channels selected',
      someChannelsSelected: '{count} {count, plural, one {channel} other {channels}} selected, {bytesText}',
      zeroResourcesSelected: '0 resources selected',
      someResourcesSelected: '{count} {count, plural, one {resource} other {resources}} selected, {bytesText}',
    }
  };

</script>


<style lang="scss" scoped></style>
