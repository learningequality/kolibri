<template>

  <div
    class="selectable-list"
    :style="{
      borderColor: $themeTokens.fineLine,
    }"
  >
    <div
      v-if="searchable"
      class="searchbox-container"
      :style="{
        borderBottom: `1px solid ${$themeTokens.fineLine}`,
      }"
    >
      <FilterTextbox
        v-model.trim="filterText"
        :throttleInput="300"
        :showBorder="false"
        :placeholder="searchLabel"
        :ariaControls="listboxId"
        :style="{
          width: '100%',
        }"
      />
    </div>
    <div
      class="select-all-checkbox-container"
      :class="$computedClass(rowStyles)"
      @click.self="changeSelectAll(!selectAllChecked)"
    >
      <KCheckbox
        :label="selectAllLabel"
        :checked="selectAllChecked"
        :indeterminate="selectAllIndeterminate"
        :disabled="!filteredOptions.length"
        :aria-controls="listboxId"
        @change="changeSelectAll"
      >
        <slot name="selectAllLabel"></slot>
      </KCheckbox>
    </div>
    <p
      :id="ariaDescribedById"
      class="visuallyhidden"
    >
      {{ clickableOptionsDescription$() }}
    </p>
    <ul
      v-show="filteredOptions.length"
      :id="listboxId"
      class="list-options"
      tabindex="0"
      role="listbox"
      data-focus="true"
      aria-multiselectable="true"
      :style="{ outline: 'none', maxHeight: maxHeight }"
      :aria-labelledby="ariaLabelledby"
      :aria-describedby="ariaDescribedById"
      :aria-activedescendant="getElementOptionId(focusedOption)"
      @focus="onListFocus"
      @blur="onListBlur"
      @keydown="handleKeydown"
    >
      <li
        v-for="option in filteredOptions"
        :id="getElementOptionId(option)"
        :key="option.id"
        role="option"
        :class="
          $computedClass({
            ...rowStyles,
            ...(isOptionFocused(option) ? { ...$coreOutline, outlineOffset: '-2px' } : {}),
          })
        "
        :aria-selected="isOptionSelected(option).toString()"
        @click="toggleOption(option)"
      >
        <KCheckbox
          presentational
          :checked="isOptionSelected(option)"
          :label="option.label"
        >
          <slot
            :option="option"
            name="option"
          ></slot>
        </KCheckbox>
      </li>
    </ul>
    <p
      v-if="!filteredOptions.length"
      role="status"
      class="list-no-options"
    >
      {{ noResultsLabel$() }}
    </p>
  </div>

</template>


<script>

  import Fuse from 'fuse.js';
  import uniq from 'lodash/uniq';
  import { validateObject } from 'kolibri/utils/objectSpecs';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { ref, computed, toRefs, getCurrentInstance, watch } from 'vue';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';

  export default {
    name: 'SelectableList',
    components: {
      FilterTextbox,
    },
    setup(props, { emit }) {
      const { value, options } = toRefs(props);
      const filterText = ref('');
      const focusedIndex = ref(null);

      const instance = getCurrentInstance();
      const uid = instance.proxy._uid;

      const listboxId = computed(() => `selectable-listbox-${uid}`);
      const ariaDescribedById = computed(() => `selectable-listbox-description-${uid}`);

      const selectedOptions = computed({
        get() {
          return value.value;
        },
        set(newValue) {
          emit('input', newValue);
        },
      });

      const fuse = computed(() => {
        return new Fuse(options.value, {
          threshold: 0.1,
          keys: ['label'],
          ignoreLocation: true,
        });
      });

      const filteredOptions = computed(() => {
        if (!filterText.value) {
          return options.value;
        }
        return fuse.value.search(filterText.value).map(result => result.item);
      });

      const focusedOption = computed(() => {
        if (focusedIndex.value === null || !filteredOptions.value.length) {
          return null;
        }
        return filteredOptions.value[focusedIndex.value];
      });

      function setFocusedIndex(index) {
        focusedIndex.value = index;

        if (instance.proxy.$inputModality === 'keyboard') {
          const optionElement = document.getElementById(getElementOptionId(focusedOption.value));
          if (optionElement) {
            optionElement.scrollIntoView({
              block: 'nearest',
              inline: 'nearest',
            });
          }
        }
      }

      function isOptionSelected(option) {
        return selectedOptions.value.includes(option.id);
      }

      function isOptionFocused(option) {
        return focusedOption.value?.id === option.id;
      }

      function toggleOption(option) {
        if (!option) {
          return;
        }

        const { deselectedLabel$ } = coreStrings;

        if (isOptionSelected(option)) {
          selectedOptions.value = value.value.filter(id => id !== option.id);
          sendPoliteMessage(deselectedLabel$());
        } else {
          selectedOptions.value = [...value.value, option.id];
        }

        if (focusedOption.value?.id !== option.id) {
          setFocusedIndex(filteredOptions.value.findIndex(opt => opt.id === option.id));
        }
      }

      function getElementOptionId(option) {
        if (!option?.id) {
          return null;
        }

        return `sl-option-${uid}-${option.id}`;
      }

      const selectAllChecked = computed(() => {
        return (
          filteredOptions.value.length > 0 &&
          filteredOptions.value.every(option => isOptionSelected(option))
        );
      });

      const selectAllIndeterminate = computed(() => {
        return (
          !selectAllChecked.value && filteredOptions.value.some(option => isOptionSelected(option))
        );
      });

      function changeSelectAll(checked) {
        const { allNOptionsSelectedLabel$, noOptionsSelectedLabel$ } = coreStrings;
        if (checked) {
          selectedOptions.value = uniq([
            ...selectedOptions.value,
            ...filteredOptions.value.map(option => option.id),
          ]);
          sendPoliteMessage(allNOptionsSelectedLabel$({ count: filteredOptions.value.length }));
        } else {
          selectedOptions.value = selectedOptions.value.filter(
            id => !filteredOptions.value.some(option => option.id === id),
          );
          sendPoliteMessage(noOptionsSelectedLabel$());
        }
      }

      function onListFocus() {
        if (!filteredOptions.value.length) {
          return;
        }
        setFocusedIndex(0);
      }

      function onListBlur() {
        focusedIndex.value = null;
      }

      function handleFocusNavigation(key) {
        const diff = key === 'ArrowDown' ? 1 : -1;
        // adding options.length and using modulo to wrap around
        // enables circular navigation
        const newFocusedIndex =
          (focusedIndex.value + diff + filteredOptions.value.length) % filteredOptions.value.length;
        setFocusedIndex(newFocusedIndex);
      }

      function handleKeydown(event) {
        if (!filteredOptions.value.length) {
          return;
        }

        const { key } = event;

        switch (key) {
          case 'ArrowDown':
          case 'ArrowUp':
            handleFocusNavigation(key);
            break;
          case 'Home':
            setFocusedIndex(0);
            break;
          case 'End':
            setFocusedIndex(filteredOptions.value.length - 1);
            break;
          case ' ':
            toggleOption(focusedOption.value);
            break;
          // Cntrl + A for select all
          case 'a':
          case 'A':
            if (!event.ctrlKey && !event.metaKey) {
              return;
            }
            if (!selectAllChecked.value) {
              changeSelectAll(true);
            }
            break;
          default:
            // Early return for unsupported keys so that we don't prevent default behavior
            return;
        }

        event.preventDefault();
      }

      const { sendPoliteMessage } = useKLiveRegion();
      const { resultsCount$ } = searchAndFilterStrings;

      watch(filteredOptions, newOptions => {
        sendPoliteMessage(resultsCount$({ count: newOptions.length }));
      });

      const rowStyles = computed(() => ({
        ':hover': {
          backgroundColor: filteredOptions.value.length ? themePalette().grey.v_100 : 'transparent',
        },
        ':not(:last-child)': {
          borderBottom: `1px solid ${themeTokens().fineLine}`,
        },
        padding: '0 10px',
        cursor: filteredOptions.value.length ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
      }));

      const { noResultsLabel$, clickableOptionsDescription$ } = coreStrings;

      return {
        rowStyles,
        listboxId,
        onListBlur,
        filterText,
        onListFocus,
        toggleOption,
        focusedOption,
        filteredOptions,
        selectAllChecked,
        ariaDescribedById,
        selectAllIndeterminate,
        changeSelectAll,
        isOptionFocused,
        isOptionSelected,
        getElementOptionId,
        handleKeydown,
        noResultsLabel$,
        clickableOptionsDescription$,
      };
    },
    props: {
      value: {
        type: Array,
        required: true,
      },
      options: {
        type: Array,
        required: true,
        validator: options =>
          validateObject(
            { options },
            {
              options: {
                type: Array,
                required: true,
                spec: {
                  id: { type: String, required: true },
                  label: { type: String, required: true },
                },
              },
            },
          ),
      },
      ariaLabelledby: {
        type: String,
        required: true,
      },
      selectAllLabel: {
        type: String,
        required: false,
        default: null,
      },
      searchable: {
        type: Boolean,
        default: true,
      },
      searchLabel: {
        type: String,
        required: true,
      },
      maxHeight: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .selectable-list {
    border: 1px solid;
    border-radius: 4px;
  }

  .list-options {
    padding: 0;
    margin: 0;
    overflow: auto;
    list-style: none;
  }

  .list-no-options {
    padding: 12px;
    margin: 0;
    text-align: center;
  }

</style>
