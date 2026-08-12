<template>

  <div
    role="presentation"
    class="sort-widget"
    :class="[
      hasFocus ? 'focused' : 'not-focused',
      horizontal ? 'sort-widget-horizontal' : 'sort-widget-vertical',
    ]"
    @mousedown="e => $emit('mousedown', e)"
  >
    <KIconButton
      v-show="!isFirst"
      ref="upBtn"
      :icon="horizontal ? 'chevronLeft' : 'chevronUp'"
      class="btn up"
      size="mini"
      :ariaLabel="moveUpAriaLabel"
      :class="{ visuallyhidden: !hasFocus && !horizontal }"
      @click="clickUp"
      @keyup.space="clickUp"
    />
    <!--
      Currently missing from material icon repo.
      See https://github.com/google/material-design-icons/issues/786
     -->
    <KIcon
      v-if="!horizontal"
      icon="dragHorizontal"
      class="grip"
      style="top: 0; width: 24px; height: 24px"
    />
    <KIconButton
      v-show="!isLast"
      ref="dnBtn"
      :icon="horizontal ? 'chevronRight' : 'chevronDown'"
      class="btn dn"
      size="mini"
      :ariaLabel="moveDownAriaLabel"
      :class="{ visuallyhidden: !hasFocus && !horizontal }"
      @click="clickDown"
      @keyup.space="clickDown"
    />
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { currentLanguage, isRtl } from 'kolibri/utils/i18n';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { dragSortStrings } from '../dragSortStrings';

  export default {
    name: 'DragSortWidget',
    inject: {
      registerSortItem: { default: null },
      unregisterSortItem: { default: null },
    },
    setup(props) {
      const { moveUpLabel$, moveDownLabel$, moveLeftLabel$, moveRightLabel$ } = coreStrings;
      const {
        moveItemUpLabel$,
        moveItemDownLabel$,
        moveItemLeftLabel$,
        moveItemRightLabel$,
        itemMovedToPosition$,
      } = dragSortStrings;
      const { sendPoliteMessage } = useKLiveRegion();

      const isRtlValue = isRtl(currentLanguage);

      const moveForward$ = computed(() => {
        if (!props.horizontal) {
          return moveUpLabel$;
        }

        return isRtlValue ? moveRightLabel$ : moveLeftLabel$;
      });

      const moveBackward$ = computed(() => {
        if (!props.horizontal) {
          return moveDownLabel$;
        }

        return isRtlValue ? moveLeftLabel$ : moveRightLabel$;
      });

      // Item-specific labels, Direction-aware
      const moveUpAriaLabel = computed(() => {
        if (!props.itemLabel) {
          return moveForward$.value();
        }
        if (!props.horizontal) {
          return moveItemUpLabel$({ item: props.itemLabel });
        }
        return isRtlValue
          ? moveItemRightLabel$({ item: props.itemLabel })
          : moveItemLeftLabel$({ item: props.itemLabel });
      });

      const moveDownAriaLabel = computed(() => {
        if (!props.itemLabel) {
          return moveBackward$.value();
        }
        if (!props.horizontal) {
          return moveItemDownLabel$({ item: props.itemLabel });
        }
        return isRtlValue
          ? moveItemLeftLabel$({ item: props.itemLabel })
          : moveItemRightLabel$({ item: props.itemLabel });
      });

      return { moveUpAriaLabel, moveDownAriaLabel, itemMovedToPosition$, sendPoliteMessage };
    },
    props: {
      isFirst: {
        type: Boolean,
        required: true,
      },
      isLast: {
        type: Boolean,
        required: true,
      },
      // When true, renders left/right chevrons instead of up/down
      horizontal: {
        type: Boolean,
        default: false,
      },
      // Human-readable name of this item
      itemLabel: {
        type: String,
        default: null,
      },
      // indexed current position of this item in the list
      // 1-based
      position: {
        type: Number,
        default: null,
      },
      total: {
        type: Number,
        default: null,
      },
    },
    data() {
      return {
        hasFocus: false,
      };
    },
    watch: {
      itemLabel() {
        this.syncRegistration();
      },
      position() {
        this.syncRegistration();
      },
    },
    mounted() {
      // no need to track focus for horizontal mode, since the buttons are always visible
      if (!this.horizontal) {
        window.addEventListener('focus', this.updateFocus, true);
      }
      this.syncRegistration();
    },
    destroyed() {
      if (!this.horizontal) {
        window.removeEventListener('focus', this.updateFocus, true);
      }
      if (this.unregisterSortItem) {
        this.unregisterSortItem(this._uid);
      }
    },
    methods: {
      // Registers this item's label/position
      syncRegistration() {
        if (this.registerSortItem && this.itemLabel != null && this.position != null) {
          this.registerSortItem(this._uid, this.itemLabel, this.position);
        }
      },
      updateFocus() {
        this.hasFocus = [this.$refs.dnBtn.$el, this.$refs.upBtn.$el].includes(
          document.activeElement,
        );
      },
      announceMove(newPosition) {
        if (!this.itemLabel || this.total == null) {
          return;
        }
        this.sendPoliteMessage(
          this.itemMovedToPosition$({
            item: this.itemLabel,
            position: newPosition,
            total: this.total,
          }),
        );
      },
      clickDown() {
        this.$emit('moveDown');
        this.announceMove(this.position + 1);
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
        this.announceMove(this.position - 1);
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
    width: 24px;
    height: 24px;
  }

  .grip {
    width: 24px;
    height: 24px;
    transition: opacity $core-time ease;
    transform: rotate(90deg);
  }

  .btn {
    position: absolute;
    z-index: 2;
    transition: opacity $core-time ease;
  }

  .sort-widget-vertical {
    .up {
      inset-inline-start: 0;
      top: -16px;
    }

    .dn {
      inset-inline-start: 0;
      top: 4px;
    }
  }

  // .up = "move toward start" = left in LTR, right in RTL.
  // .dn = "move toward end"   = right in LTR, left in RTL.
  .sort-widget-horizontal {
    width: 28px;

    .up {
      inset-inline-start: -12px;
      top: 0;
    }

    .dn {
      inset-inline-end: -12px;
      top: 0;
    }
  }

  .focused .grip {
    opacity: 0.08;
  }

  .sort-widget-vertical.not-focused .btn {
    opacity: 0;
  }

</style>
