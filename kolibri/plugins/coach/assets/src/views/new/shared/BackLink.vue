<template>

  <KRouterLink :to="to" :text="linkText" />

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';

  export default {
    name: 'BackLink',
    $trs: {
      linkText: '{backArrowCharacter} {linkText}',
    },
    components: {
      KRouterLink,
    },
    props: {
      text: {
        type: String,
        required: true,
      },
      to: {
        type: Object,
        required: true,
      },
    },
    computed: {
      arrow() {
        return this.isRtl ? '→' : '←';
      },
      linkText() {
        return this.$tr('linkText', { backArrowCharacter: this.arrow, linkText: this.text });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
