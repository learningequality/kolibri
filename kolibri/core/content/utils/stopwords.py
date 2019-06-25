import io
import json
import os

# load stopwords file
stopwords_path = os.path.join(
    os.path.dirname(__file__), os.path.pardir, "constants", "stopwords-all.json"
)
with io.open(stopwords_path, mode="r", encoding="utf-8") as f:
    stopwords = json.load(f)

# load into a set
stopwords_set = set()
for values in stopwords.values():
    stopwords_set.update(values)
