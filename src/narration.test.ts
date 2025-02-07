import { sortAudioElements } from "./narration";
import { createDiv, createPara, createSpan } from "./test/testHelper";

test("sortAudioElements with no tabindexes preserves order", () => {
    const input = document.createElement("div");
    const tg1 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup",
        parent: input
    });
    const be1A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The first block</p>",
        tabindex: "3", // should be ignored
        parent: tg1
    });

    const tg2 = createDiv({
        id: "tg2",
        classAttr: "bloom-translationGroup",
        parent: input
    });
    const be2A = createDiv({
        id: "be2A",
        classAttr: "bloom-editable",
        tabindex: "1", // should be ignored
        parent: tg2
    });
    const p2A1 = createPara({ id: "p2A1", classAttr: "", parent: be2A });
    const s2A1A = createSpan({
        id: "s2A1A",
        classAttr: "audio-sentence",
        content: "The first sentence in the second group",
        parent: p2A1
    });
    const s2A1B = createSpan({
        id: "s2A1B",
        classAttr: "audio-sentence",
        content: "The second sentence in the second group",
        parent: p2A1
    });

    const tg3 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup",
        content: "",
        parent: input
    });
    const be3A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The third block</p>",
        tabindex: "0", // should be ignored
        parent: tg3
    });

    const toSort = [be1A, s2A1A, s2A1B, be3A];
    const output = sortAudioElements(toSort);
    expect(output[0]).toEqual(be1A);
    expect(output[1]).toEqual(s2A1A);
    expect(output[2]).toEqual(s2A1B);
    expect(output[3]).toEqual(be3A);
});

test("sortAudioElements with some tabindexes put missing ones last", () => {
    const input = document.createElement("div");
    const tg1 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup", // no tabindex, should be last
        parent: input
    });
    const be1A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The first block</p>",
        tabindex: "3", // should be ignored
        parent: tg1
    });

    const tg2 = createDiv({
        id: "tg2",
        classAttr: "bloom-translationGroup",
        tabindex: "2",
        parent: input
    });
    const be2A = createDiv({
        id: "be2A",
        classAttr: "bloom-editable",
        tabindex: "1", // should be ignored
        parent: tg2
    });
    const p2A1 = createPara({ id: "p2A1", classAttr: "", parent: be2A });
    const s2A1A = createSpan({
        id: "s2A1A",
        classAttr: "audio-sentence",
        content: "The first sentence in the second group",
        parent: p2A1
    });
    const s2A1B = createSpan({
        id: "s2A1B",
        classAttr: "audio-sentence",
        content: "The second sentence in the second group",
        parent: p2A1
    });

    const tg3 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup",
        content: "",
        parent: input
    });
    const be3A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The third block</p>",
        tabindex: "0", // should be ignored
        parent: tg3
    });

    const toSort = [be1A, s2A1A, s2A1B, be3A];
    const output = sortAudioElements(toSort);
    expect(output[0]).toEqual(s2A1A); // first in doc order of item with tabindex.
    expect(output[1]).toEqual(s2A1B);
    expect(output[2]).toEqual(be1A); // no tabindex, sorted to end, first in doc order of those without tabindex
    expect(output[3]).toEqual(be3A); // no tabindex, sorted to end, after be1A in doc order
});

test("sortAudioElements re-orders sentences and blocks", () => {
    const input = document.createElement("div");
    const tg1 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup",
        tabindex: "101",
        parent: input
    });
    const be1A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The first block (read fifth)</p>",
        tabindex: "100", // should be ignored
        parent: tg1
    });

    const tg2 = createDiv({
        id: "tg2",
        classAttr: "bloom-translationGroup",
        tabindex: "100",
        parent: input
    });
    const be2A = createDiv({
        id: "be2A",
        classAttr: "bloom-editable audio-sentence",
        tabindex: "23", // should be ignored
        parent: tg2
    });
    const p2A1 = createPara({ id: "p2A1", classAttr: "", parent: be2A });
    const s2A1A = createSpan({
        id: "s2A1A",
        classAttr: "audio-sentence",
        content: "The first sentence in the second group (read ",
        parent: p2A1
    });
    const s2A1B = createSpan({
        id: "s2A1B",
        classAttr: "audio-sentence",
        content: "The second sentence in the second group",
        parent: p2A1
    });

    const tg3 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup",
        tabindex: "11",
        parent: input
    });
    const be3A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        tabindex: "0", // should be ignored
        parent: tg3
    });
    const p3A1 = createPara({
        id: "p3A1",
        classAttr: "",
        parent: be3A
    });
    const s3A1A = createSpan({
        id: "s3A1A",
        classAttr: "audio-sentence",
        content: "The first sentence in the third group (read first)",
        parent: p3A1
    });
    const s3A1B = createSpan({
        id: "s3A1B",
        classAttr: "audio-sentence",
        content: "The second sentence in the thrid group (read second)",
        parent: p3A1
    });
    const toSort = [be1A, s2A1A, s2A1B, s3A1A, s3A1B];
    const output = sortAudioElements(toSort);
    expect(output[0]).toEqual(s3A1A);
    expect(output[1]).toEqual(s3A1B);
    expect(output[2]).toEqual(s2A1A);
    expect(output[3]).toEqual(s2A1B);
    expect(output[4]).toEqual(be1A);
});

test("sortAudioElements re-orders blocks", () => {
    const input = document.createElement("div");
    const tg1 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup",
        tabindex: "1000",
        parent: input
    });
    const be1A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The first block (read third)</p>",
        tabindex: "3", // should be ignored
        parent: tg1
    });

    const tg2 = createDiv({
        id: "tg2",
        classAttr: "bloom-translationGroup",
        tabindex: "101",
        parent: input
    });
    const be2A = createDiv({
        id: "be2A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The second block (read second)</p>",
        tabindex: "8000", // should be ignored
        parent: tg2
    });

    const tg3 = createDiv({
        id: "tg1",
        classAttr: "bloom-translationGroup",
        tabindex: "11",
        parent: input
    });
    const be3A = createDiv({
        id: "be1A",
        classAttr: "bloom-editable audio-sentence",
        content: "<p>The third block (read first)</p>",
        tabindex: "0", // should be ignored
        parent: tg3
    });

    const toSort = [be1A, be2A, be3A];
    const output = sortAudioElements(toSort);
    expect(output[0]).toEqual(be3A);
    expect(output[1]).toEqual(be2A);
    expect(output[2]).toEqual(be1A);
});
