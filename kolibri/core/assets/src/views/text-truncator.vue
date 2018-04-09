<template>

  <p>
    <!-- eslint-disable -->
    <span :class="truncatedClass">{{ textHead }}<span class="visuallyhidden">{{ textTail }}</span></span>
    <!-- eslint-enable -->
    <k-button
      v-if="textIsTooLong"
      @click.stop.prevent="textExpanded=!textExpanded"
      appearance="basic-link"
      :text="!textExpanded ? $tr('viewMoreButtonPrompt') : $tr('viewLessButtonPrompt')"
    />
  </p>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'textTruncator',
    components: {
      kButton,
    },
    props: {
      text: {
        type: String,
        required: true,
      },
      textCharLimit: {
        type: Number,
        required: false,
        default: 140,
      },
    },
    data() {
      return {
        textExpanded: false,
      };
    },
    computed: {
      textHead() {
        if (this.textExpanded) {
          return this.text;
        }
        return this.text.slice(0, this.textCharLimit);
      },
      textTail() {
        return this.text.slice(this.textCharLimit);
      },
      textIsTooLong() {
        return this.text.length > this.textCharLimit;
      },
      truncatedClass() {
        return {
          truncated: this.textIsTooLong && !this.textExpanded,
        };
      },
    },
    $trs: {
      viewMoreButtonPrompt: 'View more',
      viewLessButtonPrompt: 'View less',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .truncated::after
    content: '\2026\0020'
    display: inline

</style>
