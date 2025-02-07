// tslint:disable-next-line: no-submodule-imports
import autonymData from "raw-loader!./iso639-autonyms.tsv";

// This class handles retrieving data from the 'iso639-autonyms.tsv' file.
// iso639-autonyms.tsv originally came from https://github.com/bbqsrc/iso639-autonyms.
// We removed the final column and got rid of the '\r's to save quite a few KB.
export class AutonymHandler {
    private static singleton: AutonymHandler;
    private autonymArray: object;
    private twoLetterTothreeLetterIndex: object;

    public static getAutonymHandler(): AutonymHandler {
        if (!AutonymHandler.singleton) {
            AutonymHandler.singleton = new AutonymHandler();
            AutonymHandler.singleton.init();
        }
        return this.singleton;
    }

    private constructor() {
        this.autonymArray = {};
        this.twoLetterTothreeLetterIndex = {};
    }

    private init() {
        // .tsv extension is tab-delimited data in rows.
        // The first few rows follow as example data: (for clarity pipes have been substituted for tabs)
        //   tag3|tag1|name|autonym|source
        //   kap||Bezhta||iso639-3
        //   aar|aa|Afar|Qafar|cldr
        //   aaq||Eastern Abnaki||iso639-3
        //   aap||Pará Arára|Ukarãngmã|iso639-3, ethnologue

        //console.log("Starting AutonymHandler load...");
        const rows: string[] = autonymData.split("\n");
        let index = 1; // first row is header info.
        while (index < rows.length) {
            const currentRow = rows[index];
            if (!currentRow) {
                break;
            }
            const parts = currentRow.split("\t");
            const row = { autonym: parts[3], english: parts[2] };
            this.autonymArray[parts[0]] = row;
            if (parts[1]) {
                this.twoLetterTothreeLetterIndex[parts[1]] = parts[0];
            }
            index++;
        }
        //console.log("Loaded AutonymHandler...");
    }

    // Returns an object containing two strings: autonym and English name
    public getAutonymDataFor(
        code: string
    ): { autonym: string; english: string } {
        const failure = { autonym: "", english: "" };
        //console.log("Processing code to get autonym data...");
        const threeLetterIsoCode = this.getThreeLetterIsoCode(code);
        if (!threeLetterIsoCode) {
            return failure;
        }
        return this.autonymArray[threeLetterIsoCode]
            ? this.autonymArray[threeLetterIsoCode]
            : failure;
    }

    private getThreeLetterIsoCode(code: string): string | undefined {
        const baseLanguageCode = code.split("-")[0]; // in case of Regional, Script, Variant codes
        if (baseLanguageCode.length === 3) {
            return baseLanguageCode; // The majority of cases
        }
        if (baseLanguageCode.length > 3) {
            // An unknown odd situation! We failed to get a decent iso639 code.
            return undefined;
        }
        // BL-8268: In some cases, such as 'zh-CN', we got here with a two letter code, but previously
        // we didn't handle it well. Now, we use our 2 -> 3 letter index to get 'zho' from 'zh' (e.g.).
        // In that particular case, our database has [english: 'Chinese' and autonym: 中文].

        // If the two-letter code (after splitting off Regional, Script, Variant codes), is not in our
        // index, or if we somehow arrive here with a defective code (length 0 or 1!),
        // this line returns 'undefined'.
        return this.twoLetterTothreeLetterIndex[baseLanguageCode];
    }
}

export default AutonymHandler;
