<template>

  <div
    class="sort-widget"
    :class="{ focused: hasFocus, 'not-focused': !hasFocus }"
  >
    <UiIconButton
      v-show="!isFirst"
      ref="upBtn"
      class="btn up"
      type="flat"
      :ariaLabel="moveUpText"
      :class="{ visuallyhidden: !hasFocus }"
      @click="clickUp"
      @keyup.space="clickUp"
    >
      <KIcon icon="arrow_up" />
    </UiIconButton>
    <!--
      Currently missing from material icon repo.
      See https://github.com/google/material-design-icons/issues/786
     -->
    <KIcon icon="drag" class="grip" style="top: 0; width: 24px; height: 24px" />
    <UiIconButton
      v-show="!isLast"
      ref="dnBtn"
      class="btn dn"
      type="flat"
      :ariaLabel="moveDownText"
      :class="{ visuallyhidden: !hasFocus }"
      @click="clickDown"
      @keyup.space="clickDown"
    >
      <KIcon icon="arrow_down" />
    </UiIconButton>
  </div>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'DragSortWidget',
    components: {
      UiIconButton,
    },
    props: {
      moveUpText: {
        type: String,
        required: true,
      },
      moveDownText: {
        type: String,
        required: true,
      },
      isFirst: {
        type: Boolean,
        required: true,
      },
      isLast: {
        type: Boolean,
        required: true,
      },
    },
    data() {
      return {
        hasFocus: false,
      };
    },
    mounted() {
      window.addEventListener('focus', this.updateFocus, true);
    },
    destroyed() {
      window.removeEventListener('focus', this.updateFocus, true);
    },
    methods: {
      updateFocus() {
        this.hasFocus = [this.$refs.dnBtn.$el, this.$refs.upBtn.$el].includes(
          document.activeElement
        );
      },
      clickDown() {
        this.$emit('moveDown');
        this.$nextTick(() => {
          if (this.isLast) {
            this.$refs.upBtn.$el.focus();
          } else {
            this.$refs.dnBtn.$el.focus();
          }
        });
      },
      clickUp() {
        this.$emit('moveUp');
        this.$nextTick(() => {
          if (this.isFirst) {
            this.$refs.dnBtn.$el.focus();
          } else {
            this.$refs.upBtn.$el.focus();
          }
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .sort-widget {
    position: relative;
  }

  .grip {
    transition: opacity $core-time ease;
    transform: rotate(90deg);
  }

  .btn {
    position: absolute;
    left: -6px;
    z-index: 2;
    transition: opacity $core-time ease;
  }

  // only dim the grip when the keyboard is being used
  .focused .grip {
    opacity: 0.08;
  }

  // also hide the buttons when the keyboard is not being used
  .not-focused .btn {
    opacity: 0;
  }

  .up {
    top: -16px;
  }

  .dn {
    top: 4px;
  }

</style>
