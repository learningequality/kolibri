<template>

  <div>
    <router-link 
      v-if="!pendingPrerequisites.length"
      :to="link"
      :class="{ 'mobile-card': isMobile }"
      class="card"
    >
      <slot></slot>
    </router-link>
    <div 
      v-if="pendingPrerequisites.length"
      class="prereqs-not-done"
      :class="{ 'mobile-card': isMobile }"
      @click="showModal()"
    >
      <slot></slot>
      <div class="lock">
        <mat-svg category="action" name="lock" />
      </div>
    </div>
  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';

  export default {
    name: 'ToggledRouterLink',
    props: {
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
      pendingPrerequisites: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    methods: {
      showModal() {
        this.$store.commit('topicsTree/SET_PREREQUISITES', [this.link, this.pendingPrerequisites]);
        this.$store.commit('topicsTree/SET_PREREQUISITES_MODAL', true);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import 'ContentCard/card';

  $margin: 16px;

  .coach-content-label {
    display: inline-block;
  }

  .card {
    text-decoration: none;
  }

  .text {
    position: relative;
    height: 92px;
    padding: $margin;
  }

  .title,
  .subtitle {
    margin: 0;
  }

  .subtitle {
    position: absolute;
    top: 38px;
    right: $margin;
    left: $margin;
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .footer {
    position: absolute;
    right: $margin;
    bottom: $margin;
    left: $margin;
    font-size: 12px;
  }

  .subtitle.no-footer {
    top: unset;
    bottom: $margin;
  }

  .copies {
    display: inline-block;
    float: right;
  }

  .mobile-card.card {
    width: calc(100% - 16px);
    height: $thumb-height-mobile;
  }

  .mobile-card {
    .thumbnail {
      position: absolute;
    }
    .text {
      height: 84px;
      margin-left: $thumb-width-mobile;
    }
    .subtitle {
      top: 36px;
    }
  }

  .prereqs-not-done {
    opacity: 0.3;
  }

  .lock {
    position: absolute;
    right: 4px;
    bottom: 4px;
  }

</style>
