<template>

  <li>
    <button
      class="tab"
      :class="{ 'tab-has-icon-and-title': icon && title, 'tab-selected': selected }"
      @click="handleClick"
      ref="tab">

      <div v-if="icon" class="tab-icon">
        <ui-icon :icon="icon" :ariaLabel="title" class="icon"/>
      </div>

      <div v-if="title" class="tab-title">
        {{ title }}
      </div>

    </button>
  </li>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: false,
      },
      icon: {
        type: String,
        required: false,
      },
      selected: {
        type: Boolean,
        default: false,
      },
    },
    components: {
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
    methods: {
      handleClick() {
        this.$emit('click');
        this.$refs.tab.blur();
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '../tab-items.styl'

</style>
