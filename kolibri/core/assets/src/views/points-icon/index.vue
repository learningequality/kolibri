<template>

  <div :style="dimensions">
    <file-svg v-if="active" src="./icons/leaf.svg"/>
    <file-svg v-else src="./icons/grey-leaf.svg"/>
  </div>

</template>


<script>

  function widthHeightValidate(units) {
    return units.search(/[0-9]+(em|px|%)/) > -1;
  }

  module.exports = {
    props: {
      active: {
        type: Boolean,
        required: true,
      },
      height: {
        type: String,
        required: true,
        validator: widthHeightValidate,
      },
      width: {
        type: String,
        required: true,
        validator: widthHeightValidate,
      },
    },
    computed: {
      dimensions() {
        return {
          height: this.height,
          width: this.width,
        };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
