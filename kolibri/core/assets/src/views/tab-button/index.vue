<template>

  <li>
    <button
      class="tab"
      :class="{ 'tab-has-icon-and-title': type === 'icon-and-title', 'tab-selected': selected }"
      @click="handleClick"
      ref="tab">

      <div v-if="type === 'icon' || type === 'icon-and-title'" class="tab-icon">
        <ui-icon :icon="icon" :ariaLabel="title" class="icon"/>
      </div>

      <div v-if="type === 'title' || type === 'icon-and-title'" class="tab-title">
        {{ title }}
      </div>

    </button>
  </li>

</template>


<script>

  import uiIcon from 'keen-ui/src/UiIcon';
  export default {
    props: {
      type: {
        type: String,
        validator(type) {
          return [
            'title',
            'icon',
            'icon-and-title'
          ].includes(type);
        },
        required: true
      },
      title: {
        type: String,
        required: false
      },
      icon: {
        type: String,
        required: false
      },
      selected: {
        type: Boolean,
        default: false
      }
    },
    components: { uiIcon },
    methods: {
      handleClick() {
        this.$emit('click');
        this.$refs.tab.blur();
      }
    }
  };

</script>


<style lang="stylus" scoped>

  @require '../tab-items.styl'

</style>
