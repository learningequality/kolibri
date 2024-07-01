<template>

  <div class="selected-language">
    <KIconButton
      icon="language"
      aria-hidden="true"
      tabindex="-1"
      class="globe px-8"
      @click="$emit('click')"
    />
    <span
      class="no-shrink px-8"
      :title="selectedLanguage.english_name"
    >
      {{ selectedLanguage.lang_name }}
    </span>
  </div>

</template>


<script>

  export default {
    name: 'SelectedLanguage',
    props: {
      selectedLanguage: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .selected-language {
    display: flex;
    align-items: center;
  }

  .no-shrink {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .px-8 {
    padding-right: 8px;
    padding-left: 8px;
  }

</style>
