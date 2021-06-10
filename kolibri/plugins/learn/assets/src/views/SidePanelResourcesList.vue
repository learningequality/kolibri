<template>

  <section>
    <!-- placeholder for learning activity kind chips TODO update with chip component -->

    <!-- for sibling in tree  -->
    <Item
      v-for="content in contents"
      :key="content.id"
      :title="content.title"
      :progress="content.progress"
      :kind="content.kind"
      :duration="content.duration"
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
    },
    computed: {
      contents() {
        return [
          { id: 1, title: 'One', progress: 1, kind: 'video', duration: '10 minutes' },
          { id: 2, title: 'Two', progress: 0.347, kind: 'video', duration: '8 minutes' },
          { id: 3, title: 'Three', progress: 0.2222, kind: 'video' },
          { id: 4, title: 'Four', progress: 0, kind: 'video', duration: '30 minutes' },
        ];
      },
    },
  };

</script>
