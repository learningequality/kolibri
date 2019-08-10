<template>

  <KBreadcrumbs :items="selectionCrumbs" />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ResourceSelectionBreadcrumbs',
    mixins: [commonCoreStrings],
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
          { text: this.coreString('channelsLabel'), link: this.channelsLink },
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
