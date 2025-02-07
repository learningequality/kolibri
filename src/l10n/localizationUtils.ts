export class LocalizationUtils {
    public static getBookLanguage1(body: HTMLBodyElement): string | undefined {
        const dataDiv = body.querySelector("#bloomDataDiv") as HTMLElement;
        if (!dataDiv) {
            return undefined;
        }
        const language1: string = (dataDiv.querySelector(
            "div[data-book='contentLanguage1']"
        ) as HTMLElement)!.innerHTML!.trim();
        if (language1) {
            return language1;
        } else {
            return undefined;
        }
    }

    // As of today, this is the most reliable way to get language2 and language3.
    // Getting contentLanguage2/contentLanguage3 in the datadiv only works for multilingual books.
    // I experimented with getting a random bloom-contentNational1/2 element and grabbing the
    // lang attribute, but that was just as hacky and didn't always seem to be accurate
    // if the user changed settings and went straight to publish. I also wasn't convinced
    // bloom-contentNational2 would always exist.
    public static getNationalLanguagesFromCssStyles(
        cssText: string
    ): [string | undefined, string | undefined] {
        let language2: string | undefined;
        let language3: string | undefined;

        // We're looking for something like [lang='en']
        const regex = /\[lang=['"](.+)['"]\]/gm;

        let matchCount = 0;
        let match = regex.exec(cssText);
        while (match != null) {
            matchCount++;
            // matched text: match[0]
            // 1st (in our case, only) capturing group: match[1]

            // The first match is language 1
            // The second match is language 2
            // The third match is language 3
            if (matchCount === 2) {
                language2 = match[1];
            } else if (matchCount === 3) {
                language3 = match[1];
                break;
            }
            match = regex.exec(cssText);
        }

        return [language2, language3];
    }
}
