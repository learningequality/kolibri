<template>

  <li
    class="qti-simple-choice"
    role="option"
    tabindex="0"
    :class="[
      $computedClass({
        '::before': {
          border: `2px solid ${selected ? $themeTokens.textInverted : $themeTokens.annotation}`,
          backgroundColor: selected ? $themeTokens.primary : $themeTokens.surface,
          color: selected ? $themeTokens.textInverted : $themePalette.grey.v_400,
        },
        ':focus': coreOutline,
      }),
    ]"
    :aria-selected="String(selected)"
    :style="[extraStyles]"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <slot></slot>
  </li>

</template>


<script>

  import { computed, inject } from 'vue';
  import {
    themeTokens,
    themeBrand,
    themePalette,
    themeOutlineStyle,
  } from 'kolibri-design-system/lib/styles/theme';
  import { BooleanProp, QTIIdentifierProp } from '../../utils/props';

  const $themeTokens = themeTokens();
  const $themeBrand = themeBrand();
  const $themePalette = themePalette();
  const coreOutline = themeOutlineStyle();

  export default {
    name: 'SimpleChoice',
    tag: 'qti-simple-choice',

    setup(props) {
      const isSelected = inject('isSelected');
      const toggleSelection = inject('toggleSelection');

      const handleClick = () => {
        toggleSelection(props.identifier);
      };

      const selected = computed(() => isSelected(props.identifier));

      const extraStyles = computed(() => {
        if (selected.value) {
          return {
            backgroundColor: $themeBrand.primary.v_50,
            borderColor: $themeTokens.primary,
            color: $themeTokens.primary,
            fontWeight: 600,
          };
        }

        return {
          backgroundColor: $themeTokens.surface,
          borderColor: $themeTokens.fineLine,
        };
      });

      return {
        $themeTokens,
        $themePalette,
        coreOutline,
        selected,
        handleClick,
        extraStyles,
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
    padding-block: 0.75rem;
    padding-inline-start: 64px;
    padding-inline-end: 1rem;
    margin: 7px 0;
    cursor: pointer;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;

    &::marker {
      content: '';
    }

    &::before {
      position: absolute;
      inset-inline-start: 1rem;
      top: 50%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      transform: translateY(-50%);
    }
  }

</style>
