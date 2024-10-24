<template>

  <div>
    <KRadioButton
      v-for="(item, idx) in items"
      :key="idx"
      :buttonValue="itemValue(item)"
      :currentValue="currentValue"
      :label="itemLabel(item)"
      :description="description(item)"
      v-bind="$attrs"
      @input="$emit('update:currentValue', $event)"
    >
      <slot
        v-if="showUnderButtonSlot(item)"
        name="underbutton"
        v-bind="{ selected }"
      ></slot>
    </KRadioButton>
  </div>

</template>


<script>

  export default {
    name: 'RadioButtonGroup',
    props: {
      items: {
        type: Array,
        required: true,
      },
      // The value of the currently selected radio button
      // Must be .sync-ed with parent
      currentValue: {
        type: [String, Number, Boolean],
        required: true,
      },
      // A function that takes an item and returns something to be used as the value
      itemValue: {
        type: Function,
        required: true,
      },
      // A function that takes an item and returns a string to be used as the label
      itemLabel: {
        type: Function,
        required: true,
      },
      itemDescription: {
        type: Function,
        default: () => '',
      },
    },
    computed: {
      selected() {
        return this.items.find(f => this.itemValue(f) === this.currentValue);
      },
    },
    methods: {
      // For now assume only show under slot if the item is selected.
      // Could be made more general by passing in another predicate as prop to decide this.
      showUnderButtonSlot(item) {
        return this.itemValue(item) === this.currentValue;
      },
      description(item) {
        if (!this.itemDescription) {
          return '';
        }
        return this.itemDescription(item);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
