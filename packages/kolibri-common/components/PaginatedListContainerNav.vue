<template>

  <nav class="pagination-nav">
    <span
      dir="auto"
      class="pagination-label"
    >
      {{ label }}
    </span>
    <KButtonGroup>
      <KIconButton
        :ariaLabel="previousAriaLabel"
        :disabled="previousButtonDisabled"
        size="small"
        icon="back"
        @click="$emit('changePage', -1)"
      />
      <KIconButton
        :ariaLabel="nextAriaLabel"
        :disabled="nextButtonDisabled"
        size="small"
        icon="forward"
        @click="$emit('changePage', +1)"
      />
    </KButtonGroup>
  </nav>

</template>


<script>

  export default {
    name: 'PaginatedListContainerNav',
    props: {
      label: {
        type: String,
        required: true,
      },
      previousAriaLabel: {
        type: String,
        required: true,
      },
      nextAriaLabel: {
        type: String,
        required: true,
      },
      previousButtonDisabled: {
        type: Boolean,
        required: true,
      },
      nextButtonDisabled: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .pagination-nav {
    margin-bottom: 8px;
    text-align: right;
  }

  .pagination-label {
    position: relative;
    top: -2px;
    display: inline;
  }

</style>
