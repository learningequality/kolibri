from metaphone import doublemetaphone
from porter2stemmer import Porter2Stemmer

stemmer = Porter2Stemmer()

def fuzz(text):
    """
    Apply porter stemming algorithm then double metaphone algorithm to the passed in String
    to obtain normalized and misspelling tolerant hash values/tokens
    """
    processed_tokens = [doublemetaphone(stemmer.stem(word)) for word in text.split()]
    return [token for token in sum(processed_tokens, ()) if token]
