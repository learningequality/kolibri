<template>

  <div>
    <label>
      {{ $tr('viewbylabel') }}
      <div class="toggle-switch">
        <a v-link="contentLinkTarget">
          <div class="toggle-switch-item" :class="contentLinkClass">{{ $tr('contents') }}</div>
        </a>
        <a v-link="userLinkTarget">
          <div class="toggle-switch-item" :class="userLinkClass">{{ $tr('learners') }}</div>
        </a>
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
        return '';
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
        return '';
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .toggle-switch
    display: inline-table
    margin: 0.5em

  a
    display: inline-block
    text-decoration: none

  .toggle-switch-item
    padding: 0.4em
    background-color: white
    color: $core-action-normal
    border: 2px solid $core-action-normal

  .current
    padding: 0.6em
    background-color: $core-action-normal
    color: white
    cursor: default

  .disabled
    color: $core-text-disabled
    border-color: $core-text-disabled
    cursor: not-allowed

</style>
