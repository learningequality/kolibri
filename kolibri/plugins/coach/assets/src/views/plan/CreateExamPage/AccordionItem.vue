<template>

  <Draggable>
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
          :answers="title"
        >
        </slot>
      </div>
    </div>
  </Draggable>

</template>


<script>

  import Draggable from 'kolibri.coreVue.components.Draggable';

  export default {
    name: 'AccordionItem',
    components: {
      Draggable,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      id: {
        type: Number,
        required: true,
      },
    },
  };

</script>


<style scoped>
.item-border{
    border-bottom:1px solid #DEDEDE ;
    border-top:1px solid #DEDEDE ;
  }
</style>
