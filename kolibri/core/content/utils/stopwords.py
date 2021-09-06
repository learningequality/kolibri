import json

from importlib_resources import files

# stopwords file
ref = files("kolibri.core.content.constants").joinpath("stopwords-all.json")
stopwords = json.loads(ref.read_text())

# load into a set
stopwords_set = set()
for values in stopwords.values():
    stopwords_set.update(values)
