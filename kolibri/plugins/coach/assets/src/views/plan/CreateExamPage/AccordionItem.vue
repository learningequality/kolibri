<template>

  <Draggable>
    <div class="">
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
    .icon-size{
        width:24px;
        height:24px;
    }

    .question-row{
        border-top:1px solid #DEDEDE;
        border-bottom: 1px solid  #DEDEDE;
    }

    .left-column-alignment-style{
        display:inline-flex;
        margin-left: 10px;
    }

    .right-alignment-style{
        float:right;
        margin-top:10px;
    }

    #bottom-border{
        line-height: 1.2;
        color: #DEDEDE;
        margin-bottom:10px;
    }

    .option{
        width: Fixed (922px);
        height: Hug (40px);
        padding: 10px;
        border-radius: 2px;
        border: 1px;
        gap: 4px;
    }
    .question{
        border:1px solid #DEDEDE;
        border-radius:5px;
        margin-top:5px;
        margin-bottom:5px;
    }
    .space-content{
        margin:10px;
    }
    .float-item-left-style{
        float:right;
    }

    .choose-question{
        background-color: #FAFAFA;
    }
</style>
