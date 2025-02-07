import { LocalizationManager } from "../../l10n/localizationManager";

export class OldQuestionsConverter {
    public static convert(json: string, pageClass: string): HTMLElement[] {
        if (!json) {
            return [];
        }
        // a list containing one object for each question page in the book, with property questions, also a list
        let questionsWrapper: any = json;
        if (typeof json === "string") {
            // in unit tests we pass strings. The result we get from axios is already parsed.
            questionsWrapper = JSON.parse(json);
        }
        const result: HTMLElement[] = [];
        for (
            let questionNumber = 0;
            questionNumber < questionsWrapper.length;
            questionNumber++
        ) {
            if (questionsWrapper[questionNumber].onlyForBloomReader1) {
                continue;
            }
            const questionGroups = questionsWrapper[questionNumber].questions;
            const lang = questionsWrapper[questionNumber].lang;

            for (let i = 0; i < questionGroups.length; i++) {
                const question = questionGroups[i];
                const page = document.createElement("div");
                result.push(page);

                page.classList.add("bloom-page");
                page.classList.add("simple-comprehension-quiz");
                page.classList.add("bloom-interactive-page");
                page.classList.add("numberedPage");
                page.classList.add(pageClass);
                page.setAttribute("data-analyticsCategories", "comprehension");

                const marginBox = this.appendElementWithClass(
                    "div",
                    "marginBox",
                    page
                );
                const quiz = this.appendElementWithClass(
                    "div",
                    "quiz",
                    marginBox
                );

                const checkYourUnderstandingString = LocalizationManager.getTranslation(
                    "Quiz.CheckYourUnderstanding",
                    [lang],
                    "Check Your Understanding"
                );
                this.appendTranslationGroup(
                    quiz,
                    checkYourUnderstandingString,
                    "QuizHeader-style",
                    lang, // Regardless of whether the string is actually this lang or a fallback, we need to put something and mark it down for {lang}
                    "Quiz.CheckYourUnderstanding"
                );

                this.appendTranslationGroup(
                    quiz,
                    question.question,
                    "QuizQuestion-style",
                    lang
                );

                const answers = question.answers;
                for (let j = 0; j < answers.length; j++) {
                    const answer = answers[j];
                    const answerText = answer.text as string;
                    const answerDiv = this.appendElementWithClass(
                        "div",
                        "checkbox-and-textbox-choice",
                        quiz
                    );

                    const input = this.appendElementWithClass(
                        "input",
                        "styled-check-box",
                        answerDiv
                    ) as HTMLInputElement;
                    input.setAttribute("name", "Correct");
                    input.setAttribute("type", "checkbox");

                    const answerGroup = this.appendElementWithClass(
                        "div",
                        "bloom-translationGroup",
                        answerDiv
                    );

                    this.appendElementWithClass(
                        "div",
                        "placeToPutVariableCircle",
                        answerDiv
                    );

                    const answerEditable = this.appendElementWithClass(
                        "div",
                        "bloom-editable",
                        answerGroup
                    );
                    answerEditable.classList.add("bloom-content1");
                    answerEditable.classList.add("bloom-visibility-code-on");
                    answerEditable.classList.add("QuizAnswer-style");
                    answerEditable.setAttribute("lang", lang);
                    const answerPara = this.appendElementWithClass(
                        "p",
                        "",
                        answerEditable
                    );
                    answerPara.textContent = answerText;

                    if (answer.correct) {
                        answerDiv.classList.add("correct-answer");
                    }
                }
                const script = this.appendElementWithClass("script", "", quiz);
                script.setAttribute("src", "simpleComprehensionQuiz.js");
            }
        }
        return result;
    }

    private static appendTranslationGroup(
        parent: HTMLElement,
        text: string,
        className: string,
        lang: string,
        l10nId?: string
    ) {
        const group = this.appendElementWithClass(
            "div",
            "bloom-translationGroup",
            parent
        );
        const editable = this.appendElementWithClass(
            "div",
            "bloom-editable",
            group
        );
        editable.classList.add("bloom-content1");
        editable.classList.add("bloom-visibility-code-on");
        editable.classList.add(className);
        editable.setAttribute("lang", lang);
        if (l10nId) {
            editable.setAttribute("data-i18n", "Quiz.CheckYourUnderstanding");
        }

        const para = this.appendElementWithClass("p", "", editable);
        para.textContent = text;
    }

    private static appendElementWithClass(
        tag: string,
        className: string,
        parent: HTMLElement
    ): HTMLElement {
        const result = document.createElement(tag);
        if (className) {
            result.classList.add(className);
        }
        parent.appendChild(result);
        return result;
    }
}
