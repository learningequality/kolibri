<template>

  <BottomAppBar>
    <span class="message">
      {{ coreString('resourcesSelectedMessage', { count: count, size: size }) }}
    </span>
    <KButton
      :disabled="buttonsDisabled"
      :text="coreString('removeSelectedMessage')"
      @click="$emit('click-remove')"
    />
  </BottomAppBar>

</template>


<script>

  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'SelectionBottomBar',
    components: {
      BottomAppBar,
    },
    mixins: [commonCoreStrings],
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
  };

</script>


<style lang="scss" scoped>

  .message {
    display: inline-block;
    margin-right: 16px;
  }

</style>
