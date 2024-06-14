<template>

  <div>
    Import with credentials
    <KButton @click="next">
      import as admin
    </KButton>
  </div>

</template>


<script>

  export default {
    name: 'ImportUserWithCredentials',
    inject: ['importUserService'],
    methods: {
      next() {
        this.importUserService.send({
          type: 'CONTINUEADMIN',
          value: {
            id: 'bla bla',
            adminUsername: 'admin',
            adminPassword: 'admin',
            users: [{ id: 1 }],
          },
        });
      },
    },
  };

</script>
