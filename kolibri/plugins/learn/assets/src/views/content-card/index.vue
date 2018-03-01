<template>

  <span ref="complete-title">

    <router-link :to="link" class="card" :class="{ 'mobile-card': isMobile }">
      <card-thumbnail
        class="thumbnail"
        :thumbnail="thumbnail"
        :kind="kind"
        :progress="progress"
        :isMobile="isMobile"
      />
      <h3 class="text" dir="auto" v-shave>{{ title }}</h3>
    </router-link>
    
    <ui-tooltip v-if="hasTooltip" trigger="complete-title">
      {{ title }}
    </ui-tooltip>

  </span>

</template>


<script>

  import values from 'lodash/values';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import cardThumbnail from './card-thumbnail';
  import Vue from 'kolibri.lib.vue';
  import VueShave from 'vue-shave';
  import uiTooltip from 'keen-ui/src/UiTooltip';

  Vue.use(VueShave, {
    throttle: 300,
    height: 35,
    spaces: true,
  });

  export default {
    components: {
      cardThumbnail,
      uiTooltip,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          return values(ContentNodeKinds).includes(value);
        },
      },
      progress: {
        type: Number,
        required: true,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        hasTooltip: false,
      };
    },
    updated() {
      this.$nextTick(() => {
        this.hasTooltip = this.$el.querySelector('h3 .js-shave') !== null;
      });
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require './card.styl'

  .card
    text-decoration: none
    display: inline-block
    width: $thumb-width-desktop
    border-radius: 2px
    background-color: $core-bg-light
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14),
                0 3px 1px -2px rgba(0, 0, 0, 0.2),
                0 1px 5px 0 rgba(0, 0, 0, 0.12)
    transition: box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)
    &:hover, &:focus
      box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12),
                  0 5px 5px -3px rgba(0, 0, 0, 0.2)

  .text
    color: $core-text-default
    overflow: hidden
    margin: 16px
    height: 54px

  .mobile-card.card
    width: 100%
    height: $thumb-height-mobile

  .mobile-card
    .thumbnail
      position: absolute
    .text
      margin-left: $thumb-width-mobile + 16

</style>
