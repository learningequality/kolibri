<template>
<div>
    <KGrid>
        <KGridItem
            :layout12="{ span : 6}"
        >
            <div class="display-flex">
                <p class="rounded-circle">A</p>
                <p class="option-text-size">Option 1</p>
            </div>
        </KGridItem>
        <KGridItem
            :layout12="{ span :6 }"
        >
            <div class="float-item-left-style">
                <KGrid>
                    <KGridItem
                        :layout12="{ span : 3}"
                    >
                        <KIcon class="icon-size"  icon="edit"/>
                    </KGridItem>

                    <KGridItem
                        :layout12="{ span : 3}"
                    >
                        <KIcon class="icon-size" icon="chevronDown"/>
                    </KGridItem>
                    <KGridItem
                        :layout12="{ span : 3}"
                    >
                        <KIcon class="icon-size" icon="chevronUp"/>
                    </KGridItem>

                    <KGridItem
                        :layout12="{ span : 3}"
                    >
                        <KIcon class="icon-size" icon="clear"/>
                    </KGridItem>
                </KGrid>
            </div>
        </KGridItem>
    </KGrid>
</div>
</template>

<script>
export default {
    name:"AnswerOption",
}
</script>

<style scoped>
.icon-size{
    width:24px;
    height:24px;
}
.rounded-circle{
    border:1px solid #616161;
    border-radius:24px;
    width:24px;
    height:24px;
    text-align: center;
    margin-right:10px;
    margin-left: 10px;
}
.display-flex{
    display: inline-flex;
}

.option-text-size{
    font-size:14px;
    margin-top: 16px;
}

.float-item-left-style{
    float:right;
    margin-top:10px;
    margin-right:10px;
}
</style>