<template>

  <div class="fake-modal" @keyup.esc="cancel" @keyup.enter="submit">
    <div>
      <button class="back-btn" @click="back" v-if="showback">Back</button>
      <button class="close-btn" @click="cancel" :disabled="noclose">X</button>
    </div>
    <h1 v-if="title">{{ title }}</h1>
    <div>
      <slot name="body"></slot>
    </div>
    <div v-if="error">{{ error }}</div>
    <div class="buttons">
      <slot name="buttons"></slot>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
      },
      showback: {
        type: Boolean,
        default: false,
      },
      error: {
        type: String,
        default: null,
      },
      noclose: {
        type: Boolean,
        default: false,
      },
    },
    components: {
      'icon-button': require('kolibri/coreVue/components/iconButton'),
    },
    data: () => ({
    }),
    methods: {
      cancel() {
        if (!this.noclose) {
          this.$emit('cancel');
        }
      },
      submit() {
        if (!this.noclose) {
          this.$emit('submit');
        }
      },
      back() {
        if (!this.noclose) {
          this.$emit('back');
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .back-btn
    float: left

  .close-btn
    float: right

  .fake-modal
    border: 2px solid black
    margin: 10px
    padding: 10px

  .buttons
    margin: 10px
    text-align: center

</style>
