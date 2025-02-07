import { OldQuestionsConverter } from "./old-questions";

test("no questions, no pages", () => {
    expect(OldQuestionsConverter.convert("", "")).toEqual([]);
});

const converted = OldQuestionsConverter.convert(
    `[
        {"questions":[
            {"question":"How did the boy lose his cap",
                "answers":[
                    {"text":"The bully took it","correct":false},
                    {"text":"The wind blew it away","correct":true},
                    {"text":"He left it on the bus","correct":false}
                ]},
            {"question":"What did the moon do?",
                "answers":[
                    {"text":"Hid behind clouds","correct":false},
                    {"text":"Appeared to wear the cap","correct":true}
                ]}
            ],
            "lang":"sp"},
        {"questions":[
            {"question":"Why use old questions?",
                "answers":[
                    {"text":"Lack of information","correct":true},
                    {"text":"Laziness","correct":false}
                ]}
            ],
            "lang":"sp"},
        {"questions":[
            {"question":"What should we do with new-quiz json?",
                "answers":[
                    {"text":"Discard it","correct":true},
                    {"text":"Make a duplicate page","correct":false}
                ]}
            ],
            "lang":"sp",
            "onlyForBloomReader1": true}
        ]`,
    "Device16x9Portrait"
);

test("got three pages", () => {
    expect(converted.length).toBe(3);
});

test("pages have expected classes", () => {
    for (let i = 0; i < 3; i++) {
        const div = converted[i];
        expect(div.classList).toContain("bloom-page");
        expect(div.classList).toContain("simple-comprehension-quiz");
        expect(div.classList).toContain("bloom-interactive-page");
        expect(div.classList).toContain("numberedPage");
        expect(div.classList).toContain("Device16x9Portrait");
        expect(div.getAttribute("data-analyticsCategories")).toBe(
            "comprehension"
        );
    }
});

test("pages have basic structure", () => {
    for (let i = 0; i < 3; i++) {
        const div = converted[i];
        expect(div.childElementCount).toBe(1);
        const marginBox = div.firstElementChild!;
        expect(marginBox.classList).toContain("marginBox");
        expect(marginBox.childElementCount).toBe(1);
        const quizDiv = marginBox.firstElementChild!;
        expect(quizDiv.classList).toContain("quiz");
    }
});

const checkTranslationGroup = (
    group: HTMLElement,
    paraContent: string,
    editableStyle: string,
    lang: string
) => {
    expect(group.classList).toContain("bloom-translationGroup");
    expect(group.childElementCount).toBe(1);
    const editable = group.firstElementChild!;
    expect(editable.classList).toContain("bloom-editable");
    expect(editable.classList).toContain("bloom-content1");
    expect(editable.classList).toContain("bloom-visibility-code-on");
    if (editableStyle) {
        expect(editable.classList).toContain(editableStyle);
    }
    expect(editable.getAttribute("lang")).toBe(lang);
    expect(editable.childElementCount).toBe(1);
    const para = editable.firstElementChild!;
    expect(para.textContent).toBe(paraContent);
};

test("correct header", () => {
    const headerGroup = converted[0].firstElementChild!.firstElementChild!
        .firstElementChild as HTMLElement;
    checkTranslationGroup(
        headerGroup,
        "Check Your Understanding",
        "QuizHeader-style",
        "sp"
    );
});

test("correct questions", () => {
    const firstQuestion = getQuestionTranslationGroup(converted[0]);
    checkTranslationGroup(
        firstQuestion,
        "How did the boy lose his cap",
        "QuizQuestion-style",
        "sp"
    );
    const secondQuestion = getQuestionTranslationGroup(converted[1]);
    checkTranslationGroup(
        secondQuestion,
        "What did the moon do?",
        "QuizQuestion-style",
        "sp"
    );

    const thirdQuestion = getQuestionTranslationGroup(converted[2]);
    checkTranslationGroup(
        thirdQuestion,
        "Why use old questions?",
        "QuizQuestion-style",
        "sp"
    );
});

const getQuestionTranslationGroup = (convertedQuestion: HTMLElement) => {
    return convertedQuestion.firstElementChild!.firstElementChild!
        .children[1] as HTMLElement;
};

const checkAnswer = (
    answer: HTMLElement,
    paraContent: string,
    lang: string,
    correct: boolean
) => {
    expect(answer.classList).toContain("checkbox-and-textbox-choice");
    if (correct) {
        expect(answer.classList).toContain("correct-answer");
    } else {
        expect(answer.classList).not.toContain("correct-answer");
    }
    expect(answer.children.length).toBe(3);
    const input = answer.children[0] as HTMLInputElement;
    expect(input).not.toBeFalsy();
    expect(input.classList).toContain("styled-check-box");
    expect(input.getAttribute("name")).toBe("Correct");
    expect(input.getAttribute("type")).toBe("checkbox");

    const group = answer.children[1] as HTMLElement;
    checkTranslationGroup(group, paraContent, "QuizAnswer-style", lang);

    const circleDiv = answer.children[2];
    expect(circleDiv.classList).toContain("placeToPutVariableCircle");
};

test("correct answers", () => {
    const firstQuiz = converted[0].firstElementChild!
        .firstElementChild as HTMLElement;
    expect(firstQuiz.children.length).toBe(6); // one header, one question, three answers, script
    const firstAnswer = firstQuiz.children[2] as HTMLElement;
    checkAnswer(firstAnswer, "The bully took it", "sp", false);
    const secondAnswer = firstQuiz.children[3] as HTMLElement;
    checkAnswer(secondAnswer, "The wind blew it away", "sp", true);

    const secondQuiz = converted[1].firstElementChild!
        .firstElementChild as HTMLElement;
    expect(secondQuiz.children.length).toBe(5); // one header, one question, two answers, script
    const q2A1 = secondQuiz.children[2] as HTMLElement;
    checkAnswer(q2A1, "Hid behind clouds", "sp", false);
    const q2A2 = secondQuiz.children[3] as HTMLElement;
    checkAnswer(q2A2, "Appeared to wear the cap", "sp", true);

    const thirdQuiz = converted[2].firstElementChild!
        .firstElementChild as HTMLElement;
    expect(thirdQuiz.children.length).toBe(5); // one header, one question, two answers, script
    const q3A1 = thirdQuiz.children[2] as HTMLElement;
    checkAnswer(q3A1, "Lack of information", "sp", true);
    const q3A2 = thirdQuiz.children[3] as HTMLElement;
    checkAnswer(q3A2, "Laziness", "sp", false);
});

test("script", () => {
    const firstQuiz = converted[0].firstElementChild!
        .firstElementChild as HTMLElement;
    const script = firstQuiz.lastElementChild as HTMLElement;
    expect(script).toBeInstanceOf(HTMLScriptElement);
    expect(script.getAttribute("src")).toBe("simpleComprehensionQuiz.js");
});
