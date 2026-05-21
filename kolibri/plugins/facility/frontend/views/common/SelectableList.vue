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
    <KListbox
      :id="listboxId"
      :value="value"
      :ariaLabelledBy="ariaLabelledby"
      :messages="messages"
      :style="maxHeight ? { maxHeight } : {}"
      @input="$emit('input', $event)"
    >
      <template #selectAll="{ allSelected, someSelected, setAllSelected }">
        <div
          class="select-all"
          :style="{ borderColor: $themeTokens.fineLine }"
        >
          <KCheckbox
            :label="selectAllLabel"
            class="select-all-checkbox"
            :checked="allSelected"
            :indeterminate="someSelected"
            :disabled="!filteredOptions.length"
            :aria-controls="listboxId"
            @change="setAllSelected"
          >
            <slot name="selectAllLabel"></slot>
          </KCheckbox>
        </div>
      </template>
      <KListboxOption
        v-for="option in filteredOptions"
        :key="option.id"
        :value="option.id"
        :label="option.label"
        :style="{ borderColor: $themeTokens.fineLine }"
        class="option"
      >
        <slot
          name="option"
          :option="option"
        ></slot>
      </KListboxOption>
    </KListbox>
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
  import { validateObject } from 'kolibri/utils/objectSpecs';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { ref, computed, watch, toRefs } from 'vue';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';

  let _uid = 0;

  export default {
    name: 'SelectableList',
    components: {
      FilterTextbox,
    },
    setup(props) {
      const { options } = toRefs(props);
      const filterText = ref('');

      const listboxId = `listbox-${_uid++}`;

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
        return (
          fuse.value
            .search(filterText.value)
            // Sort by Fuse's built-in original index reference to prevent re-sorting by score
            .sort((a, b) => a.refIndex - b.refIndex)
            .map(result => result.item)
        );
      });

      const { sendPoliteMessage } = useKLiveRegion();
      const { resultsCount$ } = searchAndFilterStrings;

      watch(filteredOptions, newOptions => {
        sendPoliteMessage(resultsCount$({ count: newOptions.length }));
      });

      const {
        noResultsLabel$,
        clickableOptionsDescription$,
        deselectedLabel$,
        allNOptionsSelectedLabel$,
        noOptionsSelectedLabel$,
      } = coreStrings;

      const messages = {
        clickable: clickableOptionsDescription$(),
        allOptionsSelected: allNOptionsSelectedLabel$(),
        allOptionsDeselected: noOptionsSelectedLabel$(),
        optionDeselected: deselectedLabel$(),
      };

      return {
        messages,
        listboxId,
        filterText,
        filteredOptions,
        noResultsLabel$,
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

  .select-all,
  .select-all-checkbox {
    width: 100%;
  }

  .option,
  .select-all {
    padding-right: 10px;
    padding-left: 10px;
    border-bottom: 1px solid;
  }

  .option {
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .option:last-child {
    border-bottom: 0;
  }

  .list-no-options {
    padding: 12px;
    margin: 0;
    text-align: center;
  }

</style>
