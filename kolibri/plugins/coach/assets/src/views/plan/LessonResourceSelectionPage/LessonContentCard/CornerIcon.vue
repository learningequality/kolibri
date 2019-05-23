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
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  const kindToBackgroundColorMap = {
    audio: '#E65997',
    document: '#ED2828',
    exercise: '#0eafaf',
    html5: '#FF8B41',
    topic: '#262626',
    video: '#3938A5',
  };

  export default {
    name: 'CornerIcon',
    components: {
      ContentIcon,
    },
    mixins: [themeMixin],
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
        return { fill: kindToBackgroundColorMap[this.kind] };
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
