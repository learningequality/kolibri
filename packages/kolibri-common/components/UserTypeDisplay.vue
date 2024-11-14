<template>

  <span
    v-if="typeDisplay"
    class="user-type-display"
  >
    {{ typeDisplay }}
  </span>

</template>


<script>

  import translatedUserKinds from 'kolibri-common/uiText/userKinds';

  export default {
    name: 'UserTypeDisplay',
    mixins: [translatedUserKinds],
    props: {
      userType: {
        type: String,
        default: null,
      },
    },
    computed: {
      typeDisplay() {
        if (this.userType) {
          return this.typeDisplayMap[this.userType];
        }
        return '';
      },
    },
  };

</script>


<style lang="scss" scoped></style>
