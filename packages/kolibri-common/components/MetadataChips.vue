<template>

  <div class="metadata-chips">
    <div
      v-for="{ label, key, icon } in tags"
      :key="key"
      :style="{ backgroundColor: $themePalette.grey.v_100 }"
      class="chip"
    >
      <KIcon
        v-if="icon"
        class="icon"
        :icon="icon"
      />
      <span
        class="chip-text"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ label }}
      </span>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'MetadataChips',
    props: {
      /**
       * A list of tags to display
       * @type {Object[Tag]}
       * @property {string} label
       * @property {string} key
       * @property {string} icon
       */
      tags: {
        type: Array,
        required: true,
        validator: tags => tags.every(tag => tag.label && tag.key),
      },
    },
  };

</script>


<style scoped lang="scss">

  .metadata-chips {
    display: flex;
    flex-wrap: wrap;
    row-gap: 4px;
    align-items: center;
    max-height: 48px;
    padding: 0;
    overflow: hidden;
  }

  .chip-text {
    padding: 0 4px;
    font-size: 12px;
  }

  .icon {
    top: 0 !important;
    margin-left: 0.125rem;
  }

  .chip {
    position: relative;
    display: flex;
    padding: 4px;
    margin-right: 4px;
    border-radius: 8px;
  }

</style>
