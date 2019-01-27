<template>

  <div
    class="sort-widget"
    :class="{focused: hasFocus, 'not-focused': !hasFocus}"
  >
    <UiIconButton
      ref="upBtn"
      class="btn up"
      type="flat"
      :ariaLabel="moveUpText"
      :class="{visuallyhidden: !hasFocus}"
    >
      <mat-svg name="keyboard_arrow_up" category="hardware" />
    </UiIconButton>
    <!--
      Currently missing from material icon repo.
      See https://github.com/google/material-design-icons/issues/786
     -->
    <file-svg src="./drag_indicator.svg" class="grip" />
    <UiIconButton
      ref="dnBtn"
      class="btn dn"
      type="flat"
      :ariaLabel="moveDownText"
      :class="{visuallyhidden: !hasFocus}"
    >
      <mat-svg name="keyboard_arrow_down" category="hardware" />
    </UiIconButton>
  </div>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'KDragSortWidget',
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
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

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
    transition: opacity $core-time ease;
  }

  // only dim the grip when the keyboard is being used
  body[modality='keyboard'] .focused .grip {
    opacity: 0.15;
  }

  // also hide the buttons when the keyboard is not being used
  .not-focused .btn,
  body:not([modality='keyboard']) .btn {
    opacity: 0;
  }

  .up {
    top: -20px;
  }

  .dn {
    top: 8px;
  }

</style>
