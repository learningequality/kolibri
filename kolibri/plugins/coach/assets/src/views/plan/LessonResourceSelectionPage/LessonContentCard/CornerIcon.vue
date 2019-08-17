<template>

  <div class="corner-icon">
    <svg
      class="background"
      :style="backgroundStyle"
    >
      <polygon
        stroke-width="0"
        :points="cornerCoordinates"
      />
    </svg>

    <ContentIcon
      :kind="kind"
      :showTooltip="true"
      class="icon"
      :style="{ color: $themeTokens.textInverted }"
    />

  </div>

</template>


<script>

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { validateContentNodeKind } from 'kolibri.utils.validators';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'CornerIcon',
    components: {
      ContentIcon,
    },
    props: {
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
    },
    computed: {
      cornerCoordinates() {
        return this.isRtl ? '0,0 48,0 48,48' : '0,0 48,0 0,48';
      },
      backgroundStyle() {
        switch (this.kind) {
          case ContentNodeKinds.EXERCISE:
            return { fill: this.$themeTokens.exercise };
          case ContentNodeKinds.VIDEO:
            return { fill: this.$themeTokens.video };
          case ContentNodeKinds.AUDIO:
            return { fill: this.$themeTokens.audio };
          case ContentNodeKinds.DOCUMENT:
            return { fill: this.$themeTokens.document };
          case ContentNodeKinds.HTML5:
            return { fill: this.$themeTokens.html5 };
          default:
            return { fill: this.$themeTokens.topic };
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .corner-icon {
    position: relative;
    width: 48px;
    height: 48px;
  }

  .icon {
    position: absolute;
    font-size: 18px;
    transform: translate(25%, 0);
  }

  .background {
    position: absolute;
    width: 100%;
    height: 100%;
    fill-opacity: 0.9;
  }

</style>
