<template>

  <li
    class="qti-simple-choice"
    role="option"
    :tabindex="isFocused ? 0 : -1"
    :class="
      $computedClass({
        '::before': {
          border: `2px solid ${selected ? $themeTokens.textInverted : $themeTokens.annotation}`,
        },
        ':focus': coreOutline,
      })
    "
    :aria-selected="selected"
    :style="extraStyles"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
    @focus="handleFocus"
  >
    <slot></slot>
  </li>

</template>


<script>

  import { computed, inject } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { BooleanProp, QTIIdentifierProp } from '../../utils/props';

  const $themeTokens = themeTokens();

  export default {
    name: 'SimpleChoice',
    tag: 'qti-simple-choice',

    setup(props) {
      const isSelected = inject('isSelected');
      const toggleSelection = inject('toggleSelection');
      const isFocusTargetFn = inject('isFocusTarget');
      const setFocusedIndex = inject('setFocusedIndex');

      const handleClick = () => {
        toggleSelection(props.identifier);
      };

      // When this option receives focus (e.g. via mouse click or keyboard),
      // sync the parent's focusedIndex to stay consistent.
      const handleFocus = () => {
        if (setFocusedIndex) {
          setFocusedIndex(props.identifier);
        }
      };

      const selected = computed(() => isSelected(props.identifier));

      const isFocused = computed(() => {
        return isFocusTargetFn ? isFocusTargetFn(props.identifier) : true;
      });

      const extraStyles = computed(() => {
        if (!selected.value) {
          return {};
        }
        return {
          backgroundColor: $themeTokens.primary,
          color: $themeTokens.textInverted,
          borderColor: $themeTokens.primary,
        };
      });

      // Define focus outline that matches Kolibri's standard
      const coreOutline = {
        outline: '3px solid rgb(51, 172, 245)',
        outlineOffset: '2px'
      };

      return {
        selected,
        isFocused,
        handleClick,
        handleFocus,
        extraStyles,
        coreOutline,
      };
    },
    props: {
      identifier: QTIIdentifierProp(true),
      // eslint-disable-next-line vue/no-unused-properties
      fixed: BooleanProp(false, false),
    },
  };

</script>


<style lang="scss" scoped>

  .qti-simple-choice {
    position: relative;
    padding: 8px 8px 8px 52px;
    margin: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 8px;
    transition: all 0.3s ease;

    &::marker {
      content: '';
    }

    &::before {
      position: absolute;
      top: 50%;
      left: 8px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 50%;
      transform: translateY(-50%);
    }
  }

</style>
