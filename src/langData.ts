// LangData groups information about a language that BloomPlayerCore finds
// in a book for transmission to/from the LanguageMenu in the ControlBar.
import AutonymHandler from "./autonyms";

export default class LangData {
    private name: string;
    private code: string;
    private selected: boolean = false;
    private hasAudio: boolean = false;

    constructor(name: string, code: string) {
        this.name = name;
        this.code = code;
    }

    public get Name(): string {
        return this.name;
    }

    public get Code(): string {
        return this.code;
    }

    public get HasAudio(): boolean {
        return this.hasAudio;
    }

    public set HasAudio(value: boolean) {
        this.hasAudio = value;
    }

    public get IsSelected(): boolean {
        return this.selected;
    }

    public set IsSelected(value: boolean) {
        this.selected = value;
    }

    private static getLangDataByCode = (
        languageData: LangData[],
        languageCode: string
    ): LangData => {
        return languageData.filter(lang => lang.Code === languageCode)[0];
    };

    private static getActiveCodeFromLangData = (
        languageData: LangData[]
    ): string => {
        if (languageData.length < 1) {
            return "";
        }
        return languageData.filter(lang => lang.IsSelected)[0]?.Code;
    };

    // Assumes caller has already verified that there is a change in code.
    public static selectNewLanguageCode = (
        languageData: LangData[],
        newActiveLanguageCode: string
    ) => {
        const newActiveLangData = LangData.getLangDataByCode(
            languageData,
            newActiveLanguageCode
        );
        if (newActiveLangData.IsSelected) {
            return; // nothing to do.
        }
        // Unselect the old one first (as a belt-and-braces guard
        // against it being the same one we are about to select)
        const oldActiveLangCode = LangData.getActiveCodeFromLangData(
            languageData
        );
        if (oldActiveLangCode !== undefined) {
            const oldActiveLangData = LangData.getLangDataByCode(
                languageData,
                oldActiveLangCode
            );
            oldActiveLangData.IsSelected = false;
        }
        newActiveLangData.IsSelected = true;
    };

    public static createLangDataArrayFromDomAndMetadata(
        body: HTMLBodyElement,
        metadataObject: object
    ): LangData[] {
        let languageArray: LangData[] = [];
        const languageDisplayNames: object | undefined =
            metadataObject["language-display-names"];
        // We are largely imitating the logic in the C# property Book.AllLanguages, so if changes
        // are needed here, we may need changes there too.
        // This xpath gets us editable divs that are in non-xMatter pages and have
        // a potentially interesting language.
        let xpath = "//div[contains(@class, 'bloom-page') and";
        xpath +=
            " not(contains(@class, 'bloom-frontMatter')) and not(contains(@class, 'bloom-backMatter'))]";
        xpath += "//div[contains(@class, 'bloom-editable') and @lang]";
        const langDivs = body.ownerDocument!.evaluate(
            xpath,
            body,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        for (let idx = 0; idx < langDivs.snapshotLength; idx++) {
            const langDiv = langDivs.snapshotItem(idx) as HTMLElement;
            if (
                langDiv.parentElement!.classList.contains(
                    "bloom-ignoreChildrenForBookLanguageList"
                )
            ) {
                continue;
            }
            const langCode = langDiv.getAttribute("lang");
            // Not valid languages, though we sometimes use them for special purposes
            if (
                !langCode ||
                langCode === "z" ||
                langCode === "*" ||
                langCode === ""
            ) {
                continue;
            }
            if (LangData.getLangDataByCode(languageArray, langCode)) {
                // We already have this one!
                continue;
            }
            const divText = langDiv.innerText.trim();
            if (divText) {
                // We have text in this language and we don't already have this one "on file".
                // Try to get a display name from the meta.json object.
                const langData = new LangData(
                    LangData.getBestLanguageNameFromMetaData(
                        langCode,
                        languageDisplayNames
                    ),
                    langCode
                );
                if (LangData.hasAudioInLanguage(body, langCode)) {
                    langData.HasAudio = true;
                }
                languageArray.push(langData);
            }
        }
        // Reorder based on vernacular first, then alphabetically.
        languageArray = LangData.reorderMenuItems(
            LangData.getLanguage1CodeOrEnglish(body),
            languageArray
        );

        // Apply fallback information if we need it, but it's now very unlikely we'll need this
        // because this means that NO language code was found to have ANY text outside of xMatter.
        if (languageArray.length === 0) {
            const fallbackLangData = LangData.getMinimalFallbackL1(body);
            languageArray.push(fallbackLangData);
        }
        // Always assume the first is selected to begin with
        languageArray[0].IsSelected = true;
        return languageArray;
    }

    // Put L1 at the top of the menu,
    // the rest alphabetically according to display name in current locale.
    private static reorderMenuItems(
        language1Code: string,
        languageArray: LangData[]
    ) {
        languageArray = languageArray.sort(LangData.compare);

        if (LangData.getLangDataByCode(languageArray, language1Code)) {
            LangData.moveToBeginning(languageArray, language1Code);
        }
        return languageArray;
    }

    private static compare(a: LangData, b: LangData): number {
        const aName = a.name.toLocaleLowerCase();
        const bName = b.name.toLocaleLowerCase();
        if (aName === bName) {
            return 0;
        }
        if (aName > bName) {
            return 1;
        }
        return -1;
    }

    // Move the LangData referenced by code to the beginning of the array
    private static moveToBeginning(languageArray: LangData[], code: string) {
        const langDataToReorder = LangData.getLangDataByCode(
            languageArray,
            code
        );
        const index = languageArray.indexOf(langDataToReorder);
        // move from old index to beginning of array
        languageArray.splice(0, 0, languageArray.splice(index, 1)[0]);
    }

    private static getMinimalFallbackL1(body: HTMLBodyElement): LangData {
        // This is now only used in the unlikely case that no language has text in the book!
        const dataDivElement = LangData.getBloomDataDiv(body);
        if (!dataDivElement) {
            // Not even a bloomDataDiv in the book!
            const totalFallBack = new LangData("English", "en");
            totalFallBack.IsSelected = true;
            return totalFallBack;
        }
        const langsOfBookDiv = dataDivElement.ownerDocument!.evaluate(
            "//div[@data-book='languagesOfBook' and @lang='*']",
            dataDivElement,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        const language1Code: string = LangData.getLanguage1CodeOrEnglish(body);
        let name =
            langsOfBookDiv === null ? "" : langsOfBookDiv.textContent!.trim();
        // langsOfBookDiv could have a couple of comma separated language names,
        // but we only want the first for our fallback.
        name = name.split(",")[0];
        name = LangData.getBestLanguageName(language1Code, name);
        const fallback = new LangData(name, language1Code);
        fallback.IsSelected = true;
        return fallback;
    }

    private static getBloomDataDiv(body: HTMLBodyElement): HTMLElement | null {
        return body.ownerDocument!.getElementById("bloomDataDiv");
    }

    private static getLanguage1CodeOrEnglish(body: HTMLBodyElement): string {
        const dataDivElement = this.getBloomDataDiv(body);
        if (!dataDivElement) {
            return "en";
        }

        const contentLanguage1Div = dataDivElement.ownerDocument!.evaluate(
            "//div[@data-book='contentLanguage1' and @lang='*']",
            dataDivElement,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        const code =
            contentLanguage1Div === null
                ? "en"
                : contentLanguage1Div.textContent!.trim();
        return code;
    }

    private static getBestLanguageNameFromMetaData(
        code: string,
        languageDisplayNames: object | undefined
    ): string {
        let proposedDisplayName = "";
        if (languageDisplayNames && languageDisplayNames.hasOwnProperty(code)) {
            proposedDisplayName = languageDisplayNames[code];
        }
        return LangData.getBestLanguageName(code, proposedDisplayName);
    }

    private static getBestLanguageName(
        code: string,
        proposedName: string
    ): string {
        const autonymHandler = AutonymHandler.getAutonymHandler();
        const langDbEntry = autonymHandler.getAutonymDataFor(code);
        const autonym = langDbEntry.autonym;
        const english = langDbEntry.english;
        // The "business logic" of choosing the best name as laid out by JH in BL-7610.
        if (proposedName === "") {
            if (autonym !== "") {
                if (english !== autonym) {
                    return `${autonym} (${english})`;
                }
                return autonym;
            } else {
                if (english === "") {
                    return code;
                }
                return english;
            }
        } else {
            if (proposedName === english) {
                return proposedName;
            } else {
                if (english === "") {
                    return `${proposedName} (${code})`;
                }
                return `${proposedName} (${english})`;
            }
        }
    }

    // ENHANCE
    // Ideally, we would have access to this information in meta.json, but alas we don't.
    // We would like to add it, but even then, it wouldn't be there for older books.
    // When we do add it, we could update the meta version number so we know we can
    // trust meta.json as the source of truth after that version number and fall back to
    // this for versions before it.
    private static hasAudioInLanguage(
        body: HTMLBodyElement,
        isoCode: string
    ): boolean {
        const audioClass = "audio-sentence";
        const divsInLang = body.ownerDocument!.evaluate(
            ".//div[@lang='" + isoCode + "']",
            body,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        for (let idx = 0; idx < divsInLang.snapshotLength; idx++) {
            const mainDiv = divsInLang.snapshotItem(idx) as HTMLElement;
            if (mainDiv.getAttribute("data-book") !== null) {
                continue;
            }
            if (mainDiv.classList.contains(audioClass)) {
                return true;
            }
            const audioSpans = body.ownerDocument!.evaluate(
                ".//span[contains(@class, '" + audioClass + "')]",
                mainDiv,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            // An audio sentence only counts as in this language if the CLOSEST
            // lang attribute matches. Sometimes mainDiv is something further out,
            // in which case, that audioSpan can't qualify the book as having audio
            // in that language.
            for (let jdx = 0; jdx < audioSpans.snapshotLength; jdx++) {
                const audioSpan = audioSpans.snapshotItem(jdx) as HTMLElement;
                if (
                    audioSpan.closest("[lang]")?.getAttribute("lang") ===
                    isoCode
                ) {
                    return true;
                }
            }
        }
        return false;
    }
}
