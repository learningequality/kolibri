<template>

  <div>
    <svg
      :title="altText"
      height="32"
      width="32"
      viewbox="0 0 32 32">
      <circle
        style="fill:#d5d5d5"
        :style="{ 'stroke-dasharray': Math.floor(progress * 100) + ' 100' }"
        class="outer-circle"
        cy="16"
        cx="16"
        r="16">
      </circle>
      <circle
        style="fill:#ffffff"
        class="inner-circle"
        cy="16"
        cx="16"
        r="13.5">
      </circle>
      <path
        v-if="thisIs('audio')"
        d="m 24,15.555557 -8.248889,0 C 15.902222,15.13778 16,14.693335 16,14.222224 c 0,-2.213333 -1.786667,-4 -4,-4 -2.213333,0 -4,1.786667 -4,4 0,2.053333 1.555555,3.733333 3.555556,3.955556 l 0,0.04444 9.777777,0 0,3.555556 2.666667,0 0,-6.222222 0,0 z"
        style="fill:#996189">
      </path>
      <path
        v-if="thisIs('document')"
        d="m 24,21.111273 c 0,0.965172 -0.855492,1.754857 -1.901094,1.754857 l -12.197812,0 c -1.045601,0 -1.901093,-0.789685 -1.901093,-1.754857 L 8,10.888726 C 8,9.923555 8.855492,9.13387 9.901094,9.13387 l 12.197812,0 C 23.144507,9.13387 24,9.923556 24,10.888726 l 0,10.222547 z m -9.141264,-9.671722 0,9.141262 2.285316,0 0,-9.141263 -2.285316,0 z m -4.298425,0 0,5.71329 2.013111,0 0,-5.71329 -2.013111,0 z m 8.869057,0 0,9.141262 2.285316,0 0,-9.141263 -2.285316,0 z"
        style="fill:#996189">
      </path>
      <polygon
        v-if="thisIs('exercise')"
        points="15,18.689 19.326,21.3 18.178,16.379 22,13.068 16.967,12.641 15,8 13.033,12.641 8,13.068 11.822,16.379 10.674,21.3 "
        transform="matrix(0,1.1428571,-1.1428571,0,32.742857,-1.142857)"
        style="fill:#996189">
      </polygon>
      <polygon
        v-if="thisIs('video')"
        style="fill:#996189"
        transform="matrix(0,1.1428571,-1.1428571,0,33.142856,-1.0476181)"
        points="12,22 12,22 21.333333,15 12,8 ">
      </polygon>
    </svg>
  </div>

</template>


<script>

  const KINDS = ['audio', 'document', 'video']; // not 'exercise' for now

  module.exports = {
    $trNameSpace: 'learn',
    $trs: {
      complete: 'complete',
      partial: 'partial',
      unstarted: 'unstarted',
      audio: 'audio',
      document: 'document',
      video: 'video',
    },
    props: {
      ispageicon: {
        type: Boolean,
        default: false,
      },
      size: {
        type: Number,
        default: 30,
      },
      progress: {
        type: Number,
        default: 0.0,
        validator(value) {
          return (value >= 0.0) && (value <= 1.0);
        },
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          return KINDS.indexOf(value) !== -1;
        },
      },
    },
    computed: {
      altText() {
        return `${this.progress} - ${this.$tr(this.kind)}`;
      },
    },
    methods: {
      thisIs(kind) {
        return this.kind === kind;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  svg
    width: 100%
    height: 100%
    transform: rotate(-90deg)
    border-radius: 50%

  .outer-circle
    stroke: $core-action-normal
    stroke-width: 32
    stroke-dasharray: 0 100 // 0 = 0 % full

</style>
