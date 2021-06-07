<template>

  <section class="metadata">
    <!-- placeholder for learning activity type chips TODO update with chip component -->
    <h2>
      {{ $tr('topicHeader') }}
      <span>
        <KIconButton
          icon="close"
          @click="$emit('navIconClick')"
        /></span>
    </h2>

    <!-- for sibling in tree  -->
    <Item
      v-for="content in contents"
      :key="content.id"
      :title="content.title"
    />



  </section>

</template>


<script>

  // import { mapState, mapGetters } from 'vuex';
  import Item from './Item';

  export default {
    name: 'SidePanelResourcesList',
    components: {
      Item,
      //   Backdrop,
      //   DownloadButton,
    },
    $trs: {
      topicHeader: 'Also in this topic',
      // lessonHeader: 'Also in this lesson',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .side-panel-wrapper {
    overflow-x: hidden;
  }

  .side-panel {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 16;
    font-size: 14px;
  }

  .side-panel-resource-description {
    left: 0;
    width: 372px;
    height: 171px;
  }

  .license-details-name {
    font-weight: bold;
  }

  .license-toggle {
    padding-top: 8px;
  }

  .download-button {
    margin-top: 16px;
  }

  .metadata {
    margin: 32px;
  }

</style>
