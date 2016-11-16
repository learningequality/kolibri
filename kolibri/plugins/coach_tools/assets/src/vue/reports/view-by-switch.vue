<template>

  <div>
    <label>
      {{ $tr('viewbylabel') }}
      <div class="toggle-switch">
        <a v-link="contentLinkTarget" :class="contentLinkClass">{{ $tr('contents') }}</a>
        |
        <a v-link="userLinkTarget" :class="userLinkClass">{{ $tr('learners') }}</a>
      </div>
    </label>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'view-by-switch',
    $trs: {
      viewbylabel: 'View by:',
      contents: 'Contents',
      learners: 'Learners',
    },
    props: {
      iscontent: {
        type: Boolean,
        required: true,
      },
      vlink: {
        type: Object,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      contentLinkTarget() {
        return this.iscontent ? undefined : this.vlink;
      },
      contentLinkClass() {
        if (this.iscontent) {
          return 'current';
        } else if (this.disabled) {
          return 'disabled';
        }
      },
      userLinkTarget() {
        return this.iscontent ? this.vlink : undefined;
      },
      userLinkClass() {
        if (!this.iscontent) {
          return 'current';
        } else if (this.disabled) {
          return 'disabled';
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .toggle-switch
    display: inline-block
    border: 1px solid $core-text-annotation
    border-radius: $radius
    padding: 5px
    margin: 5px

  .current
    color: $core-text-default
    cursor: default

  .disabled
    color: $core-text-disabled
    cursor: not-allowed


</style>
