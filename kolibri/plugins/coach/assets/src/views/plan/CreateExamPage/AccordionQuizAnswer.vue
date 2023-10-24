<template>

  <div :class="isSelected ? 'quiz-answer-row-active' : 'quiz-answer-row' ">
    <KGrid class="row-spacing">
      <KGridItem
        :layout12="{ span: 1 }"
        :layout8="{ span: 1 }"
      >
        <div :class="isSelected ? 'circular-border-active' : 'circular-border'">
          {{ optionIndex }}
        </div>
      </KGridItem>

      <KGridItem
        :layout12="{ span: 11 }"
        :layout8="{ span: 7 }"
      >
        {{ optionValue }}
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  export default {
    name: 'AccordionQuizAnswer',
    props: {
      optionIndex: {
        type: String,
        required: true,
      },
      optionValue: {
        type: String,
        required: true,
      },
      isSelected: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style scoped>
.circular-border{
    border-radius: 100%;
    height:1.5em;
    width:1.5em;
    text-align:center;
    border: 1px solid #616161;
    margin-left:.5em;
}
.circular-border-active{
    border-radius: 100%;
    height:1.5em;
    width:1.5em;
    text-align:center;
    border: 1px solid #388E3C;
    margin-left:.5em;
    background-color: #388E3C;
    color: white;
}
.quiz-answer-row{
    border: 1px solid #DEDEDE;
    border-radius:4px;
    margin-bottom:.5em;
}
.quiz-answer-row-active{
    border: 1px solid#388E3C;
    border-radius:4px;
    margin-bottom:.5em;
}
.row-spacing{
    padding:.5em
}
</style>
