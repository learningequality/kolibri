<template>

  <div class="interstitial">
    <div
      class="icon-wrapper"
      :style="{ backgroundColor: $themePalette.green.v_100 }"
    >
      <KIcon
        icon="pointsActive"
        :color="$themePalette.green.v_500"
        class="icon"
      />
    </div>
    <strong>
      {{ title }}
    </strong>
    <p>
      {{ description }}
    </p>
  </div>

</template>


<script>

  export default {
    name: 'CourseInterstitial',
    setup() {},
    props: {
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .interstitial {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;

    .icon-wrapper {
      padding: 24px;
      border-radius: 50%;

      .icon {
        top: 4px;
        left: 2px;
        width: 52px;
        height: 52px;
        font-size: 52px;
      }
    }

    p {
      margin: 0;
    }
  }

</style>
