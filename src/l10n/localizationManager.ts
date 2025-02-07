import i18nData from "./l10n-all.json"; // file created at build time

// Handles loading and retrieving of localization data.
//
// l10n-all.json contains all the translation information.
// We build that file from Crowdin (or git) at build time.
// We would call the class LocalizationManager, but we're using that
// for the singleton.
class LocalizationManagerImplementation {
    // l10n-all.json has the following structure:
    // {
    //   "en": { "Sample.ID1": { "message": "First Sample English Text", "description": "..." },
    //           "Sample.ID2": { "message": "Second English Text", "description": "..." }
    //         },
    //   "fr": { "Sample.ID1": { "message": "Premier échantillon de texte en français", "description": "..."},
    //           "Sample.ID2": { "message": "Deuxième texte français", "description": "..."}
    //         }
    // }
    // This is essentially a concatenation of the individual language json files, with the
    // language codes tagging the  separate pieces that were gathered together.  This is based
    // on the "Chrome JSON" format (https://support.crowdin.com/file-formats/chrome-json/).
    private l10nDictionary: Map<string, Map<string, string>> = new Map();

    private isSetup: boolean = false;

    // Set up the l10n dictionary. If this is not called first, localize will do nothing.
    public setUp(i18nDataOverride?: any) {
        if (this.isSetup) {
            return;
        }
        this.isSetup = true;

        const i18nDataToUse = i18nDataOverride ? i18nDataOverride : i18nData;

        Object.keys(i18nDataToUse).forEach(lang => {
            const strings = i18nDataToUse[lang];
            Object.keys(strings).forEach(stringId => {
                let translations = this.l10nDictionary.get(stringId);
                if (!translations) {
                    translations = new Map();
                    this.l10nDictionary.set(stringId, translations);
                }
                translations.set(lang, strings[stringId].message);
            });
        });
    }

    // Find all pages which are descendents of the given element and localize them.
    // As opposed to UI controls, we don't have a good react-y way of localizing pages.
    //
    // preferredLanguages is an ordered array such that we use the most preferred language
    // for which a translation exists (on an element by element basis).
    public localizePages(
        ancestorElement: HTMLElement,
        preferredLanguages: string[]
    ): void {
        const elementsToTranslate = ancestorElement.querySelectorAll(
            ".bloom-page [data-i18n]"
        );
        if (elementsToTranslate) {
            // nodeList.forEach not supported in FF45, so we add Array.from()
            Array.from(elementsToTranslate).forEach(elementToTranslate => {
                this.localizeElement(
                    elementToTranslate as HTMLElement,
                    preferredLanguages
                );
            });
        }
    }

    private localizeElement(
        element: HTMLElement,
        preferredLanguages: string[]
    ): void {
        const key = element.dataset["i18n"];
        if (!key) {
            return;
        }

        const [translation, language] = this.getTranslationAndLanguage(
            key,
            preferredLanguages
        );
        if (translation && language) {
            element.innerText = translation;
            element.setAttribute("lang", language);
        }
    }

    // Get the translation for the given l10n ID in the most preferred language
    // for which we have a translation.
    public getTranslationAndLanguage(
        id: string,
        preferredLanguages: string[]
    ): [string, string] | [undefined, undefined] {
        const translations = this.l10nDictionary.get(id);
        if (!translations || !preferredLanguages) {
            return [undefined, undefined];
        }

        // Using for (not foreach) so we can return early
        for (let i: number = 0; i < preferredLanguages.length; i++) {
            const language = preferredLanguages[i];
            const translation = translations.get(language);
            if (translation) {
                return [translation, language];
            }
        }

        const englishFallback = translations.get("en");
        if (englishFallback) {
            return [englishFallback, "en"];
        }
        return [undefined, undefined];
    }

    public getTranslation(
        id: string,
        preferredLanguages: string[],
        defaultVal: string
    ): string {
        const [result] = this.getTranslationAndLanguage(id, preferredLanguages);
        return result || defaultVal;
    }

    // Returns the language code that should be used for Bloom Player's UI
    // (Note - this may be different than the book's languages or the UI of the browser)
    public getBloomUiLanguage(): string {
        // NOTE: This has only really been tested in the browser (BloomLibrary) scenario.
        // For devices (BloomReader): well, this currently affects tooltips,
        // but tooltips don't show up in the Android app even when long-pressing,
        // so no relevant scenario to test.

        // NOTE: If the user has set multiple preferred languages in the browser,
        // this code only picks the user's most-preferred language
        // My reasoning for this is that a user might set a non-English language as their most preferred,
        // and then have English as their least preferred.
        // I think it's awkward if we used their least preferred browser language before the book's language
        // So... I figure we might as well just use only their first one.
        //
        // NOTE: This is user's preferred language setting.
        // Although it usually the same as the browser's UI language, it is not guaranteed to be the same,
        // if the user has configured their settings such that the top language
        // is not the language selected for displaying the browser's UI.
        // But since they signed up saying they most desire to receive their web content in this language,
        // I think it's a reasonable thing to do (actually, the most reasonable thing)
        const langForBloomUi = navigator.language; // Might be a lang/region, e.g. "en-US". Or may just be "es"

        return this.removeRegionCode(langForBloomUi);
    }

    // Removes the region and any other suffixes from a lang with region code like "en-US"
    // Examples:
    // * en-US -> en
    // * es -> es
    public removeRegionCode(langRegionCode: string): string {
        const hyphenIndex = langRegionCode.indexOf("-");
        if (hyphenIndex < 0) {
            // No hyphen, we can return it directly
            return langRegionCode;
        }

        const langOnly = langRegionCode.substring(0, hyphenIndex);
        return langOnly;
    }
}

// This is the one instance of this class.
export const LocalizationManager = new LocalizationManagerImplementation();
