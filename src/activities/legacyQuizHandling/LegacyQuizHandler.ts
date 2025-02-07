import axios from "axios";
import { OldQuestionsConverter } from "./old-questions";

// This handles books created before we had actual activity pages; instead the presence of a
// "questions.json" was the trigger to make pages at the end.

export class LegacyQuestionHandler {
    public constructor(locationOfDistFolder: string) {
        this.locationOfDistFolder = locationOfDistFolder;
    }
    private needQuizCss = false;
    private locationOfDistFolder: string;
    public getPromiseForAnyQuizCss() {
        return this.needQuizCss
            ? // enhance: we would like to change this name to "simpleComprehensionQuiz.css", but
              // we're unsure if that would break something and don't want to deal with it at the
              // moment. (also Special.less includes simpleComprehensionQuiz.less plus something else?)
              // And at the moment the "special" is a template book that happens to only have this
              // quiz, but could contain other things... in any case this "special" is unhelpful.
              axios.get(this.getFolderForSupportFiles() + "/Special.css")
            : null;
    }

    // Prior to Bloom 4.6, quizzes were done by writing out a json file,
    // rather than having the wysiwyg pages we have now.
    public generateQuizPagesFromLegacyJSON(
        urlPrefix,
        body,
        pageClass,
        finished: () => void
    ) {
        const urlOfQuestionsFile = urlPrefix + "/questions.json";
        axios
            .get(urlOfQuestionsFile)
            .then(qfResult => {
                const newPages = OldQuestionsConverter.convert(
                    qfResult.data,
                    pageClass
                );
                const firstBackMatterPage = body.getElementsByClassName(
                    "bloom-backMatter"
                )[0];
                for (let i = 0; i < newPages.length; i++) {
                    this.needQuizCss = true;
                    // insertAdjacentElement is tempting, but not in FF45.
                    firstBackMatterPage.parentElement!.insertBefore(
                        newPages[i],
                        firstBackMatterPage
                    );
                }
                finished();
            })
            .catch(() => finished());
    }

    private getFolderForSupportFiles() {
        const href =
            window.location.protocol +
            "//" +
            window.location.host +
            window.location.pathname;
        const lastSlash = href.lastIndexOf("/");
        const sub =
            window["STORYBOOK_ENV"] !== undefined
                ? "/legacyQuizHandling"
                : this.locationOfDistFolder;
        return href.substring(0, lastSlash) + sub;
    }
}
