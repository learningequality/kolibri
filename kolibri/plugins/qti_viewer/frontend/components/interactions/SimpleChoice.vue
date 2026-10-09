<template>

  <li
    class="qti-simple-choice"
    role="option"
    tabindex="0"
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
  import { BooleanProp, QTIIdentifierProp } from '../../utils/props';

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
            backgroundColor: 'var(--brand-primary-v50)',
            borderColor: 'var(--tokens-primary)',
            color: 'var(--tokens-primary)',
            fontWeight: 600,
          };
        }

        return {
          backgroundColor: 'var(--tokens-surface)',
          borderColor: 'var(--tokens-fineLine)',
        };
      });

      return {
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

    &:focus {
      outline: 3px solid var(--tokens-focusOutline);
      outline-offset: 4px;
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
      color: var(--palette-grey-v400);
      background-color: var(--tokens-surface);
      border: 2px solid var(--tokens-annotation);
      border-radius: 50%;
      transform: translateY(-50%);
    }

    &[aria-selected='true']::before {
      color: var(--tokens-textInverted);
      background-color: var(--tokens-primary);
      border-color: var(--tokens-textInverted);
    }
  }

</style>
