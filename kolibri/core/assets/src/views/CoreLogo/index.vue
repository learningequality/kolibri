<template>

  <img v-if="src" :src="src">
  <img v-else src="./kolibri-logo.svg">

</template>


<script type="text/javascript">

  export default {
    name: 'CoreLogo',
    props: {
      src: {
        type: String,
        required: false,
      },
    },
  };

</script>
