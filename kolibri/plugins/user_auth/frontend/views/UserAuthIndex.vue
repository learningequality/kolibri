<template>

  <div>
    <UserAuthLayout>
      <router-view />
    </UserAuthLayout>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import UserAuthLayout from './UserAuthLayout';

  export default {
    name: 'UserAuthIndex',
    components: { UserAuthLayout },
    mixins: [commonCoreStrings],
  };

</script>


<style lang="scss" scoped></style>
