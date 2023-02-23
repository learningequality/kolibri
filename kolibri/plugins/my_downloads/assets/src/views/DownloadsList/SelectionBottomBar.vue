<template>

  <BottomAppBar>
    <span class="message">
      {{ $tr('resourcesSelectedMessage', { count: count, size: size }) }}
    </span>
    <KButton
      :disabled="buttonsDisabled"
      :text="$tr('remove')"
      @click="$emit('click-remove')"
    />
  </BottomAppBar>

</template>


<script>

  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';

  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    props: {
      count: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
        required: true,
      },
    },
    computed: {
      buttonsDisabled() {
        return this.count === 0;
      },
    },
    $trs: {
      resourcesSelectedMessage: {
        message:
          'Selected: {count, number} {count, plural, one {resource} other {resources}} ({size})',
        context: 'Indicates how many resources have been selected to be deleted.\n',
      },
      remove: {
        message: 'Remove selected',
        context: 'Action to remove selected resources',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .message {
    display: inline-block;
    margin-right: 16px;
  }

</style>
