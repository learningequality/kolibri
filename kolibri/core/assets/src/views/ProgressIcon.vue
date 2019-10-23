<template>

  <span>
    <span ref="icon">
      <UiIcon
        v-if="isInProgress"
        :ariaLabel="$tr('inProgress')"
        class="icon"
        :style="iconStyle($themeTokens.progress)"
      >
        <mat-svg name="schedule" category="action" />
      </UiIcon>
      <UiIcon
        v-else-if="isCompleted"
        :ariaLabel="coreString('completedLabel')"
        class="icon"
        :style="iconStyle($themeTokens.mastered)"
      >
        <mat-svg name="star" category="toggle" />
      </UiIcon>
    </span>
    <KTooltip
      reference="icon"
      :refs="$refs"
    >
      {{ isInProgress ? $tr('inProgress') : coreString('completedLabel') }}
    </KTooltip>
  </span>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'ProgressIcon',
    components: {
      UiIcon,
    },
    mixins: [commonCoreStrings],
    props: {
      progress: {
        type: Number,
        required: false,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
    },
    computed: {
      isInProgress() {
        return this.progress !== null && this.progress >= 0 && this.progress < 1;
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
    $trs: {
      inProgress: 'In progress',
    },
  };

</script>


<style lang="scss" scoped>

  .icon {
    cursor: default;
    border-radius: 50%;
  }

</style>
