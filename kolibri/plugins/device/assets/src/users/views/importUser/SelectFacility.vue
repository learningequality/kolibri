<template>

  <div id="abc">
    Select facility
    <KButton @click="next">
      Continue
    </KButton>
  </div>

</template>


<script>

  export default {
    name: 'SelectFacility',
    inject: ['importUserService'],
    methods: {
      next() {
        this.importUserService.send({
          type: 'CONTINUE',
          value: {
            selectedFacility: { id: '123123' },
          },
        });
      },
    },
  };

</script>
