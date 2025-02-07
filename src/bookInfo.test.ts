import { BookInfo } from "./bookInfo";
import { createDiv, createDataDivItem } from "./test/testHelper";

const cases = [
    ["blind", "blind", true],
    ["blind,talkingBook", "blind", true],
    ["blind,talkingBook", "talkingBook", true],
    ["blind, talkingBook", "blind", true],
    ["blind, talkingBook", "talkingBook", true],
    ["talkingBook:en", "talkingBook", true],
    ["", "blind", false],
    ["blind", "talkingBook", false]
];
test.each(cases)(
    "hasFeature",
    (featuresString: string, input: string, expected: boolean) => {
        const bookInfo = new BookInfo();
        bookInfo.setSomeBookInfoFromMetadata(
            { features: featuresString, bloomdVersion: 1 },
            document.body as HTMLBodyElement
        );

        expect(bookInfo.hasFeature(input)).toEqual(expected);
    }
);

test("setSomeBookInfoFromHead defaults verified", () => {
    const bookInfo = new BookInfo();
    bookInfo.setSomeBookInfoFromHead(document.head);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.creator).toEqual("bloom");
});

test("setSomeBookInfoFromHead values set", () => {
    const head = document.head;
    const meta = document.createElement("meta");
    meta.name = "bloom-digital-creator";
    meta.content = "Bloom 1.0";
    head.appendChild(meta);

    const bookInfo = new BookInfo();
    bookInfo.setSomeBookInfoFromHead(head);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.creator).toEqual("Bloom 1.0");
});

test("setSomeBookInfoFromBody defaults verified", () => {
    const body = document.createElement("body");

    const bookInfo = new BookInfo();
    bookInfo.setSomeBookInfoFromBody(body);

    expect(bookInfo.canRotate).toEqual(false);
    expect(bookInfo.autoAdvance).toEqual(false);
    expect(bookInfo.playAnimations).toEqual(false);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.contentLang).toBeUndefined();
    expect(ambientAnalyticsProps.copyrightHolder).toEqual("");
    expect(ambientAnalyticsProps.originalCopyrightHolder).toEqual("");
});

test("setSomeBookInfoFromBody values set", () => {
    const body = document.createElement("body");
    body.setAttribute("data-bfcanrotate", "allOrientations;bloomReader");
    body.setAttribute("data-bfautoadvance", "landscape;bloomReader");
    body.setAttribute("data-bfplayanimations", "landscape;bloomReader");

    const dataDiv = createDiv({ id: "bloomDataDiv", parent: body });
    const contentLanguage1Div = createDataDivItem({
        key: "contentLanguage1",
        lang: "*",
        content: "es",
        parent: dataDiv
    });
    const copyrightDiv = createDataDivItem({
        key: "copyright",
        lang: "*",
        content: "Copyright © 2019, this guy",
        parent: dataDiv
    });
    const origCopyrightDiv = createDataDivItem({
        key: "originalCopyright",
        lang: "*",
        content: "Copyright © 2019, The original guy",
        parent: dataDiv
    });

    const bookInfo = new BookInfo();
    bookInfo.setSomeBookInfoFromBody(body);

    expect(bookInfo.canRotate).toEqual(true);
    expect(bookInfo.autoAdvance).toEqual(true);
    expect(bookInfo.playAnimations).toEqual(true);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.contentLang).toEqual("es");
    expect(ambientAnalyticsProps.copyrightHolder).toEqual("this guy");
    expect(ambientAnalyticsProps.originalCopyrightHolder).toEqual(
        "The original guy"
    );
});

test("setSomeBookInfoFromMetadata", () => {
    const bookInfo = new BookInfo();

    const metadata = {
        bookInstanceId: "123",
        brandingProjectName: "myBranding",
        title: "My Title",
        originalTitle: "My Original Title",
        publisher: "my publisher",
        originalPublisher: "my original publisher",
        features: "blind,talkingBook",
        bloomdVersion: "1"
    };
    const body = document.body as HTMLBodyElement;

    bookInfo.setSomeBookInfoFromMetadata(metadata, body);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.bookInstanceId).toEqual("123");
    expect(ambientAnalyticsProps.brandingProjectName).toEqual("myBranding");
    expect(ambientAnalyticsProps.title).toEqual("My Title");
    expect(ambientAnalyticsProps.originalTitle).toEqual("My Original Title");
    expect(ambientAnalyticsProps.publisher).toEqual("my publisher");
    expect(ambientAnalyticsProps.originalPublisher).toEqual(
        "my original publisher"
    );
    expect(ambientAnalyticsProps.features).toEqual("blind,talkingBook");
    expect(ambientAnalyticsProps.bookshelves).toEqual("");
});

test("setSomeBookInfoFromMetadata_bookshelvesFromTags", () => {
    const bookInfo = new BookInfo();

    const metadata = {
        tags: [
            "bookshelf:my bookshelf",
            "otherTag:my other tag",
            "bookshelf:my other bookshelf"
        ]
    };
    const body = document.body as HTMLBodyElement;

    bookInfo.setSomeBookInfoFromMetadata(metadata, body);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.bookshelves).toEqual(
        "my bookshelf,my other bookshelf"
    );
});

test("setSomeBookInfoFromMetadata_bookshelvesFromBookshelvesField", () => {
    const bookInfo = new BookInfo();

    const metadata = {
        bookshelves: ["my bookshelf", "my other bookshelf"]
    };
    const body = document.body as HTMLBodyElement;

    bookInfo.setSomeBookInfoFromMetadata(metadata, body);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.bookshelves).toEqual(
        "my bookshelf,my other bookshelf"
    );
});

test("setSomeBookInfoFromMetadata_bookshelvesFromTagsAndBookshelvesField", () => {
    const bookInfo = new BookInfo();

    const metadata = {
        bookshelves: ["my bookshelf", "my other bookshelf 2"],
        tags: [
            "bookshelf:my bookshelf",
            "otherTag:my other tag",
            "bookshelf:my other bookshelf"
        ]
    };
    const body = document.body as HTMLBodyElement;

    bookInfo.setSomeBookInfoFromMetadata(metadata, body);

    const ambientAnalyticsProps = bookInfo.getAmbientAnalyticsProps();
    expect(ambientAnalyticsProps.bookshelves).toEqual(
        "my bookshelf,my other bookshelf 2,my other bookshelf"
    );
});

test("getPreferredTranslationLanguages, 1 language", () => {
    // This isn't real-looking data, but it is enough to get the values.
    // And the relevant logic is tested in localizationUtils.test.ts
    const cssText = `
    [lang='aaa']`;
    const bookInfo = createBookInfoWithLanguages("aaa", cssText);

    const preferredTranslationLanguages = bookInfo.getPreferredTranslationLanguages();
    expect(preferredTranslationLanguages.length).toEqual(1);
    expect(preferredTranslationLanguages[0]).toEqual("aaa");
});

test("getPreferredTranslationLanguages, 2 languages", () => {
    // This isn't real-looking data, but it is enough to get the values.
    // And the relevant logic is tested in localizationUtils.test.ts
    const cssText = `
    [lang='aaa']
    [lang='bbb']`;
    const bookInfo = createBookInfoWithLanguages("aaa", cssText);

    const preferredTranslationLanguages = bookInfo.getPreferredTranslationLanguages();
    expect(preferredTranslationLanguages.length).toEqual(2);
    expect(preferredTranslationLanguages[0]).toEqual("aaa");
    expect(preferredTranslationLanguages[1]).toEqual("bbb");
});

test("getPreferredTranslationLanguages, 3 languages", () => {
    // This isn't real-looking data, but it is enough to get the values.
    // And the relevant logic is tested in localizationUtils.test.ts
    const cssText = `
    [lang='aaa']
    [lang='bbb']
    [lang='ccc']`;
    const bookInfo = createBookInfoWithLanguages("aaa", cssText);

    const preferredTranslationLanguages = bookInfo.getPreferredTranslationLanguages();
    expect(preferredTranslationLanguages.length).toEqual(3);
    expect(preferredTranslationLanguages[0]).toEqual("aaa");
    expect(preferredTranslationLanguages[1]).toEqual("bbb");
    expect(preferredTranslationLanguages[2]).toEqual("ccc");
});

function createBookInfoWithLanguages(lang1: string, cssText: string): BookInfo {
    const body = document.createElement("body");

    const dataDiv = createDiv({ id: "bloomDataDiv", parent: body });
    const contentLanguage1Div = createDataDivItem({
        key: "contentLanguage1",
        lang: "*",
        content: lang1,
        parent: dataDiv
    });
    const bookInfo = new BookInfo();
    bookInfo.setSomeBookInfoFromBody(body);

    bookInfo.setLanguage2And3(cssText);

    return bookInfo;
}
