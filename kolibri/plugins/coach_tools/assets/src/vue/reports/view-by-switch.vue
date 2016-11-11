<template>

  <div>
    <label>
      {{ $tr('viewbylabel') }}
      <div v-if="iscontent" class="toggle-switch">
        {{ $tr('contents') }} | <a v-link="vlink">{{ $tr('learners') }}</a>
      </div>
      <div v-else class="toggle-switch">
        <a v-link="vlink">{{ $tr('contents') }}</a> | {{ $tr('learners') }}
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

</style>
