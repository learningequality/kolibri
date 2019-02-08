<template>

  <KIcon
    slot="icon"
    :exercise="kind === 'exercise'"
    :video="kind === 'video'"
    :app="kind === 'html5'"
    :audio="kind === 'audio'"
    :doc="kind === 'document'"
  />

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
