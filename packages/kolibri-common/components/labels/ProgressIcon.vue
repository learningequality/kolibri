<template>

  <span>
    <span ref="icon">
      <UiIcon
        v-if="isInProgress"
        :ariaLabel="coreString('inProgressLabel')"
      >
        <KIcon
          icon="schedule"
          :style="iconStyle($themeTokens.progress)"
          class="icon"
          :color="$themeTokens.textInverted"
        />
      </UiIcon>
      <UiIcon
        v-else-if="isCompleted"
        :ariaLabel="coreString('completedLabel')"
      >
        <KIcon
          icon="star"
          :style="iconStyle($themeTokens.mastered)"
          class="icon"
          :color="$themeTokens.textInverted"
        />
      </UiIcon>
    </span>
    <KTooltip
      reference="icon"
      :refs="$refs"
    >
      {{ isInProgress ? coreString('inProgressLabel') : coreString('completedLabel') }}
    </KTooltip>
  </span>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import UiIcon from 'kolibri-design-system/lib/keen/UiIcon';

  export default {
    name: 'ProgressIcon',
    components: {
      UiIcon,
    },
    mixins: [commonCoreStrings],
    props: {
      progress: {
        type: Number,
        default: null,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
    },
    computed: {
      isInProgress() {
        // this logic is updated to be consistent with the logic in CardThumbnail
        return this.progress !== null && this.progress > 0 && this.progress < 1;
      },
      isCompleted() {
        return this.progress >= 1;
      },
    },
    methods: {
      iconStyle(bgColor) {
        return {
          backgroundColor: bgColor,
          color: this.$themeTokens.textInverted,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .icon {
    width: 24px;
    height: 24px;
    cursor: default;
    border-radius: 50%;
  }

</style>
