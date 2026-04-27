<template>

  <div
    class="auth-context-header"
    :class="{ 'with-action': useBackAction }"
  >
    <KIconButton
      v-if="useBackAction"
      icon="back"
      :aria-label="backLabel"
      :title="backLabel"
      @click="backAction"
    />
    <h2>
      {{ title || selectedFacility.name }}
    </h2>
  </div>

</template>


<script>

  import { useRouter } from 'vue-router/composables';
  import useAuthFlow from '../composables/useAuthFlow';

  export default {
    name: 'AuthContextHeading',
    setup(props, { emit }) {
      const router = useRouter();
      const { selectedFacility } = useAuthFlow();

      const backAction = () => {
        emit('back');
        if (props.backTo) {
          router.push(props.backTo);
        }
      };

      return {
        selectedFacility,
        backAction,
      };
    },
    props: {
      useBackAction: {
        type: Boolean,
        required: false,
        default: false,
      },
      backTo: {
        type: Object,
        required: false,
        default: null,
      },
      backLabel: {
        type: String,
        required: false,
        default: null,
      },
      title: {
        type: String,
        required: false,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .auth-context-header {
    display: block;
    width: 100%;
    margin-top: 20px;
    text-align: center;

    &.with-action {
      margin-top: 4px;
      text-align: left;
    }

    button,
    button + h2 {
      display: inline-block;
      vertical-align: middle;
    }

    button {
      // shift it so the edge of the arrow is aligned with edge of the container
      margin-left: -10px;
    }

    h2 {
      margin: 0;
      font-size: 14px;
    }
  }

</style>
