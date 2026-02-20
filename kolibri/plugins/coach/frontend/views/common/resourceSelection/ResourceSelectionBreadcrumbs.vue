<template>

  <KBreadcrumbs :items="selectionCrumbs" />

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

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
        // NOTE: The current topic is injected into `ancestors` in the parent component
        const breadcrumbs = this.ancestors.map(a => ({
          text: a.title,
          link: this.topicsLink(a.id),
        }));
        if (this.channelsLink) {
          breadcrumbs.unshift({
            text: this.coreString('channelsLabel'),
            link: this.channelsLink,
          });
        }
        return breadcrumbs;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
