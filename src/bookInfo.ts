import { LocalizationUtils } from "./l10n/localizationUtils";
import { getQueryStringParamAndUnencode } from "./utilities/urlUtils";

enum BookFeatures {
    talkingBook = "talkingBook",
    blind = "blind",
    signLanguage = "signLanguage",
    motion = "motion"
}

export class BookInfo {
    private static DEFAULT_CREATOR: string = "bloom";

    public canRotate: boolean;
    public autoAdvance: boolean;
    public playAnimations: boolean;

    public totalNumberedPages = 0; // found in book
    public questionCount = 0; // comprehension questions found in book

    public hasAppearanceSystem: boolean;

    private brandingProjectName = "";
    private bookInstanceId = "";
    private bookTitle = "";
    private originalTitle = "";
    private copyrightHolder = "";
    private originalCopyrightHolder = "";
    private sessionId = this.generateUUID();
    private creator = BookInfo.DEFAULT_CREATOR; // If we find a head/meta element, we will replace this.
    private publisher = "";
    private originalPublisher = "";
    private features = "";
    // This will almost always be a single bookshelf, but the model allows for multiple, so we handle that by creating a
    // comma-delimited list.
    private bookshelves = "";

    private bookLanguage1: string | undefined;
    private bookLanguage2: string | undefined;
    private bookLanguage3: string | undefined;

    private static getCreator(head: HTMLHeadElement): string {
        const metaElements = head.getElementsByTagName("meta");
        if (metaElements.length === 0) {
            return BookInfo.DEFAULT_CREATOR;
        }
        const creatorElement = metaElements.namedItem("bloom-digital-creator");
        if (creatorElement === null) {
            return BookInfo.DEFAULT_CREATOR;
        }
        return creatorElement.content;
    }

    private static getCopyrightInfo(
        body: HTMLBodyElement,
        dataDivKey: string
    ): string {
        const copyrightNoticeRE = /^Copyright © \d\d\d\d, /;
        const copyright = this.getDataDivValue(body, dataDivKey);
        return copyright.replace(copyrightNoticeRE, "");
    }

    private static getDataDivValue(
        body: HTMLBodyElement,
        dataDivKey: string
    ): string {
        const node = body.ownerDocument!.evaluate(
            ".//div[@data-book='" + dataDivKey + "']",
            body,
            null,
            XPathResult.ANY_UNORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        if (!node) {
            return "";
        }
        if (!node.textContent) {
            return "";
        }
        return node.textContent.trim();
    }

    public hasFeature(feature: string): boolean {
        return this.features.indexOf(feature) > -1;
    }

    // Some facts about the book will go out with all events.
    // We call these "ambient" properties.
    // This returns the ones (nearly all) that are derived from meta.json.
    // (Currently there is just one more that comes from the .distribution file.
    // Make sure to include it if you add  new call to this function.)
    public getAmbientAnalyticsProps(): any {
        const ambient: any = {
            bookInstanceId: this.bookInstanceId,
            totalNumberedPages: this.totalNumberedPages,
            questionCount: this.questionCount,
            contentLang: this.bookLanguage1,
            features: this.features,
            sessionId: this.sessionId,
            title: this.bookTitle,
            originalTitle: this.originalTitle,
            creator: this.creator,
            brandingProjectName: this.brandingProjectName,
            originalCopyrightHolder: this.originalCopyrightHolder,
            copyrightHolder: this.copyrightHolder,
            publisher: this.publisher,
            originalPublisher: this.originalPublisher,
            bookshelves: this.bookshelves
        };
        // BloomLibrary2 and BloomReader both set this query parameter appropriately.
        const host = getQueryStringParamAndUnencode("host", null);
        if (host != null) {
            ambient["host"] = host;
        } else if (window.location.hostname === "localhost") {
            ambient["host"] = "testing"; // handles case of testing during development
        }
        return ambient;
    }

    public getPreferredTranslationLanguages(): string[] {
        return (
            [this.bookLanguage1, this.bookLanguage2, this.bookLanguage3]
                // remove if empty or undefined
                .filter((lang): lang is string => !!lang)
        );
    }

    public setSomeBookInfoFromHead(head: HTMLHeadElement): void {
        this.creator = BookInfo.getCreator(head);
    }

    public setSomeBookInfoFromBody(body: HTMLBodyElement): void {
        this.bookLanguage1 = LocalizationUtils.getBookLanguage1(body);

        this.canRotate = body.hasAttribute("data-bfcanrotate"); // expect value allOrientations;bloomReader, should we check?
        this.autoAdvance = body.hasAttribute("data-bfautoadvance"); // expect value landscape;bloomReader, should we check?
        this.playAnimations = body.hasAttribute("data-bfplayanimations"); // expect value landscape;bloomReader, should we check?

        this.copyrightHolder = BookInfo.getCopyrightInfo(body, "copyright");
        this.originalCopyrightHolder = BookInfo.getCopyrightInfo(
            body,
            "originalCopyright"
        );
    }

    public setSomeBookInfoFromMetadata(
        metaDataObject: any,
        body: HTMLBodyElement
    ): void {
        this.bookInstanceId = metaDataObject.bookInstanceId;
        this.brandingProjectName = metaDataObject.brandingProjectName;
        this.bookTitle = metaDataObject.title;
        this.originalTitle = metaDataObject.originalTitle;
        this.publisher = metaDataObject.publisher;
        this.originalPublisher = metaDataObject.originalPublisher;
        this.bookshelves = this.getBookshelves(
            metaDataObject.tags,
            metaDataObject.bookshelves
        );

        const bloomdVersion = metaDataObject.bloomdVersion
            ? metaDataObject.bloomdVersion
            : 0;
        this.features =
            bloomdVersion > 0
                ? metaDataObject.features
                : this.guessFeatures(body);
    }

    private getBookshelves(
        tagsField: Array<string>,
        bookshelvesField: Array<string>
    ): string {
        // The bookshelves field is untested.
        // As of Jul 2021, we only put bookshelves in meta.json in the tags field.
        // But we are progressively trying to migrate to using the more simple
        // and separate bookshelves field which already exists in parse.
        // Assumption: items in the bookshelves field will be unique.
        const bookshelvesSet: Array<string> = Array.from(
            bookshelvesField ?? []
        );
        if (tagsField) {
            tagsField.forEach(tag => {
                if (tag.startsWith("bookshelf:")) {
                    const bookshelf = tag.substring("bookshelf:".length).trim();
                    if (!bookshelvesSet.includes(bookshelf)) {
                        bookshelvesSet.push(bookshelf);
                    }
                }
            });
        }
        return bookshelvesSet.join(",");
    }

    public setLanguage2And3(data: any): void {
        [
            this.bookLanguage2,
            this.bookLanguage3
        ] = LocalizationUtils.getNationalLanguagesFromCssStyles(data);
    }

    // In July 2019, Bloom Desktop added a bloomdVersion to meta.json and at the same
    // time, started to report features more fully/reliably in meta.json:features.
    private guessFeatures(body: HTMLBodyElement): string {
        const features: BookFeatures[] = [];
        // An obsolete .bloomd (won't happen on BL). Guess the features.
        // The only feature that we haven't already figured out is talkingBook.
        // Enhance: we could use a series of axios requests to see whether
        // any of the audio-sentece blocks actually has audio files.
        // Or, since obsolete bloomd's will only be found by BR, we could
        // send a request for BR to check the audio folder.

        // initially tried starts-with(@src, 'video') since we use that constraint in BR1.3.
        // It never matched. I suspect Android WebView doesn't support starts-with (XPath 1.0.4.2),
        // though I can't find any definite documentation saying so. Could use contains, but on
        // second thought this query (looking for video/source) is already superior to the 1.3
        // regular expression approach.
        const signLanguage =
            body.ownerDocument!.evaluate(
                ".//video/source[@src]",
                body,
                null,
                XPathResult.ANY_UNORDERED_NODE_TYPE,
                null
            ).singleNodeValue != null;
        const motion =
            (body.getAttribute("data-bffullscreenpicture") || "").indexOf(
                "landscape;bloomReader"
            ) >= 0;
        const blind =
            body.ownerDocument!.evaluate(
                ".//div[contains(@class, 'bloom-page') and not(@data-xmatter-page)]//div[contains(@class, 'bloom-imageDescription')]",
                body,
                null,
                XPathResult.ANY_UNORDERED_NODE_TYPE,
                null
            ).singleNodeValue != null;
        const isTalkingBook =
            body.ownerDocument!.evaluate(
                ".//*[contains(@class, 'audio-sentence')]",
                body,
                null,
                XPathResult.ANY_UNORDERED_NODE_TYPE,
                null
            ).singleNodeValue != null;
        // Note: the order of features here matches Bloom's BookMetaData.Features getter,
        // so the features will be in the same order as when output from there.
        // Not sure whether this matters, but it may make analysis of the data easier.
        if (blind) {
            features.push(BookFeatures.blind);
        }
        if (signLanguage) {
            features.push(BookFeatures.signLanguage);
        }
        if (isTalkingBook) {
            features.push(BookFeatures.talkingBook);
        }
        if (motion) {
            features.push(BookFeatures.motion);
        }
        return features.join(",");
    }

    private generateUUID() {
        // Public Domain/MIT (stackoverflow)
        let d = new Date().getTime();

        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            // tslint:disable-next-line: no-bitwise
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            // tslint:disable-next-line: no-bitwise
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
    }
}
