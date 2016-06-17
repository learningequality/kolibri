<template>

  <div>
    <block v-for="(title, block) in contents"
      :titleid="title"
      :block="block"
    ></block>
    <input @click="clicked"></input>
  </div>

</template>


<script>

  module.exports = {
    components: {
      block: require('./block'),
    },
    vuex: {
      getters: {
        // better practice would be to define vuex getter functions globally
        contents: state => state.recommended,
      },
    },
    methods: {
      clicked() {
        alert('hi');
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
