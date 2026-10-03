<template>

  <!-- role="status" is a live region, so the notice is announced as well as
       shown — a screen reader user gets no springing-back chip to notice. It is
       rendered even while empty, since a live region only announces changes. -->
  <p
    class="qti-placement-notice"
    role="status"
    :style="noticeStyles"
  >
    <template v-if="message">
      <KIcon icon="infoOutline" />
      {{ message }}
    </template>
  </p>

</template>


<script>

  import { computed } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  const $themeTokens = themeTokens();
  const $themePalette = themePalette();

  export default {
    name: 'PlacementNotice',
    setup() {
      const noticeStyles = computed(() => ({
        color: $themeTokens.text,
        backgroundColor: $themePalette.grey.v_100,
        borderColor: $themeTokens.fineLine,
      }));

      return {
        noticeStyles,
      };
    },
    props: {
      message: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .qti-placement-notice:not(:empty) {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0.75rem 1.125rem;
    margin: 1rem 0 0;
    border-style: solid;
    border-width: 1px;
    border-radius: 8px;
  }

</style>
