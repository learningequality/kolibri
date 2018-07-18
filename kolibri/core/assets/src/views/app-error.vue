<template>

  <div class="error-box-wrapper" :class="{ hidden: isHidden }">

    <button class="close-button" @click="hideErrorbox" :aria-label="$tr('errorButtonLabel')">
      <mat-svg category="navigation" name="close" />
    </button>

    <h1>
      {{ $tr('errorHeader') }}
    </h1>
    <p>
      {{ $tr('explanation') }}
    </p>

    <!-- divs don't take labels?  -->
    <label for="error-box" aria-live="polite">
      {{ $tr('errorLabel') }}
    </label>

    <br>

    <div id="error-box" class="error-box">
      {{ error }}
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { authMessage } from './auth-message';

  export default {
    name: 'error',
    $trs: {
      errorHeader: 'Error',
      errorButtonLabel: 'Hide error',
      explanation: `Sorry, something went wrong. Please try refreshing the page`,
      errorLabel: `Error details:`,
    },
    components: {
      authMessage,
    },
    data() {
      return {
        isHidden: false,
      };
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
    },
    methods: {
      hideErrorbox() {
        this.isHidden = true;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .error-box-wrapper {
    position: relative;
    padding: 10px;
    margin-top: 50px;
    color: $core-text-error;
    background-color: $core-bg-error;
    border: 1px solid $core-text-error;
  }

  .hidden {
    display: none;
  }

  .close-button {
    position: absolute;
    top: 5px;
    right: 5px;
    border: 0;
  }

  .error-box {
    max-height: 300px;
    padding: 5px;
    margin-top: 10px;
    overflow: auto;
    font-family: monospace;
    font-size: 10px;
    color: $core-text-default;
    background-color: white;
    border: 1px solid black;
  }

</style>
