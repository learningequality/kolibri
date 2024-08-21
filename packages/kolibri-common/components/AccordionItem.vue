<template>

  <div class="item-border">
    <div>
      <slot
        name="heading"
        :title="title"
      >
      </slot>
    </div>

    <div>
      <slot
        :id="id"
        name="content"
      >
      </slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'AccordionItem',
    props: {
      title: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .item-border {
    border-top: 1px solid #dedede;
    border-bottom: 1px solid #dedede;
  }

</style>
