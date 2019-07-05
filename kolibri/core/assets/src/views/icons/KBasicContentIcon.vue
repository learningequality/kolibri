<template>

  <KIcon slot="icon" :icon="kind" />

</template>


<script>

  import KIcon from './KIcon';

  export default {
    name: 'KBasicContentIcon',
    components: {
      KIcon,
    },
    props: {
      kind: {
        type: String,
        required: false,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
