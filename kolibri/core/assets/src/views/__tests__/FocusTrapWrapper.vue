<!-- This is a wrapper around the FocusTrap component 
    to test it's exported public "reset" method -->
<template>

  <FocusTrap ref="focusTrap" data-testid="focusTrap" :disabled="false">
    <button @click="reset">
      Reset
    </button>
  </FocusTrap>

</template>

<script>

  import FocusTrap from '../FocusTrap.vue';

  export default {
    name: 'FocusTrapWrapper',
    components: {
      FocusTrap,
    },
    methods: {
      reset() {
        this.$refs.focusTrap.reset();
      },
    },
  };

</script>
