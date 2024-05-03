<template>

  <component :is="component" altText="" :src="image" />

</template>


<script type="text/javascript">

  export default {
    name: 'CoreLogo',
    props: {
      src: {
        type: String,
        default: '',
      },
    },
    computed: {
      image() {
        return this.src && this.src.length ? this.src : null;
      },
      component() {
        return this.image ? 'img' : 'KLogo';
      },
    },
  };

</script>
