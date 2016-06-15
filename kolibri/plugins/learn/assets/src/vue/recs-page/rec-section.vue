<template>

  <h1>{{ title }}</h1>
  <content-cards :contentcards="block"></content-cards>


<!--   <template v-for="b in block">
    <h2>{{ b.title }}</h2>
    <ul v-for="(key,val) in b">
      <li v-if="key=='thumbnail'"><img :src="val"></li>
      <li>{{ key }}: {{ val }}</li>
    </ul>
</template> -->

</template>


<script>

  module.exports = {
    props: ['block', 'title'],
    components: {
      // contentcard: require('./content-cards'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
