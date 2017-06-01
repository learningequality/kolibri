<template>

  <li>
    <router-link :to="link" class="tab" :class="{ 'has-icon-and-title': icon && title }">

      <div v-if="icon" class="tab-icon">
        <ui-icon :icon="icon" :ariaLabel="title" class="icon"/>
      </div>

      <div v-if="title" class="tab-title">
        {{ title }}
      </div>
    </router-link>
  </li>

</template>


<script>

  const ValidateLinkObject = require('kolibri.utils.validateLinkObject');

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
      link: {
        type: Object,
        required: true,
        validator: ValidateLinkObject,
      },
    },
    components: {
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require './tab-items.styl'

</style>
