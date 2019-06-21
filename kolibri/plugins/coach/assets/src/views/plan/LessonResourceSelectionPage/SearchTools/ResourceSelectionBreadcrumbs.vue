<template>

  <KBreadcrumbs :items="selectionCrumbs" />

</template>


<script>

  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'ResourceSelectionBreadcrumbs',
    components: {
      KBreadcrumbs,
    },
    mixins: [coreStringsMixin],
    props: {
      ancestors: {
        type: Array,
        default: () => [],
      },
      channelsLink: {
        type: Object,
        required: true,
      },
      topicsLink: {
        type: Function,
        required: true,
      },
    },
    computed: {
      selectionCrumbs() {
        return [
          // The "Channels" breadcrumb
          { text: this.coreCommon$tr('channelsLabel'), link: this.channelsLink },
          // Ancestors breadcrumbs
          // NOTE: The current topic is injected into `ancestors` in the showPage action
          ...this.ancestors.map(a => ({
            text: a.title,
            link: this.topicsLink(a.id),
          })),
        ];
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
