<template>

  <li>
    <button
      class="tab"
      :class="{ 'tab-has-icon-and-title': type === 'icon-and-title', 'tab-selected': selected }"
      @click="handleClick"
      ref="tab"
    >

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
    name: 'k-navbar-button',
    props: {
      /**
        * The type of tab. title, icon, or icon-and-title.
        */
      type: {
        type: String,
        validator(type) {
          return ['title', 'icon', 'icon-and-title'].includes(type);
        },
        required: true,
      },
      /**
        * The text
        */
      title: {
        type: String,
        required: false,
      },
      /**
        * A material icon name.
        */
      icon: {
        type: String,
        required: false,
      },
      /**
        * Whether or not to display as selected
        */
      selected: {
        type: Boolean,
        default: false,
      },
    },
    components: { uiIcon },
    methods: {
      handleClick() {
        this.$emit('click');
        this.$refs.tab.blur();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '../items.styl'

</style>
