# flake8: noqa
'''
stemmer.py
Frederik Roenn Stensaeth.
09.24.15
A Python implementation of the Porter Stemmer algorithm as described in
M.F.Porter's paper from July 1980.
'''

import re

def checkStarD(string):
    """
    checkStarD() checks if a string ends with a double consonant.
    @params: string to be checked for ending in a double consonant.
    @return: Boolean.
    """
    # String needs to be at least two characters long in order to have a
    # double consonant at the end.
    if len(string) < 2:
        return False

    # Checks if the last letter in the string is a vowel. If it is we also
    # check whether the second-to-last letter is the same one.
    if string[-1] not in 'aieou':
        if string[-1] == string[-2]:
            return True
    return False

    # has to be the two same consonant, so this re.match doesnt work
    #return None != re.match('[a-z]*[^aeiou][^aieou]$', string)

def checkStarO(string):
    """
    checkStarO() checks if a string ends with cvc, where the second c
    is not w, x or y.
    @params: string to be checked for containing a vowel.
    @return: Boolean.
    """
    # y is a vowel when it is preceded by a consonant
    # y is a consonant when it is preceded by a vowel
    # y at the beginning of a word is a consonant

    # checking for (.*)cvc
    # last c has to be [^aieouxyw]
    # middle v has to be [aeiouy] ('y' is included because it is preceded by
    #       a consonant
    # first c includes 'y' if letter preceding it is a vowel
    cv_lowercase_pattern = ''.join(getSmallCV(string))
    return None != re.match('.*cvc$', cv_lowercase_pattern)

def checkStarVStar(string):
    """
    checkStarVStar() checks if a string contains a vowel or not. 'y' is
    considered a vowel only when it is preceded by a consonant.
    @params: string to be checked for containing a vowel.
    @return: Boolean.
    """
    cv_pattern, m = getCV(string)
    if 'V' in cv_pattern:
        return True
    return False

def getSmallCV(string):
    """
    getSmallCV() takes a string and finds out which characters are consonants and
    which are vowels. A string of c's and v's is created from the pattern of
    consonants and vowels.
    @params: string to find consonant and vowel pattern of.
    @return: string representing the consonant and vowel pattern of the string.
    """
    vowels = ['a', 'e', 'i', 'o', 'u']

    # Loops over chars in string and checks whether the letter is a vowel, in
    # which case it is directly added as a 'v' to the list. If it is a 'y'
    # we need to check the preceding character in the list. If not a vowel and
    # not a 'y', then it must be consonant, or a 'c'.
    cv_list = []
    for char in string:
        if char in vowels:
            cv_list.append('v')
        elif char == 'y':
            if len(cv_list) == 0:
                cv_list.append('c')
            elif cv_list[-1] == 'v':
                cv_list.append('c')
            else:
                cv_list.append('v')
        else:
            cv_list.append('c')

    return cv_list

def getCV(string):
    """
    getCV() takes a cv-string and compresses it together to for a pattern
    represented by C's and V's (eg. CVCV). Y is considered a vowel as long as
    it is preceded by a consonant.
    @params: string to find consonant and vowel pattern of.
    @return: string representing the consonant and vowel pattern of the string
             and value of m (integer).
    """
    # Gets small the lowercase cv pattern of the string.
    cv_list = getSmallCV(string)

    # Loops over chars in the cv_list and collapses sequences of c's into C
    # and sequences of v's into V.
    cv_list_cap = []
    for i in cv_list:
        if len(cv_list_cap) == 0:
            if i == 'c':
                cv_list_cap.append('C')
            else:
                cv_list_cap.append('V')
        else:
            if i == 'c':
                if cv_list_cap[-1] == 'V':
                    cv_list_cap.append('C')
            else:
                if cv_list_cap[-1] == 'C':
                    cv_list_cap.append('V')

    cv_string = ''.join(cv_list_cap)

    # To find the m value of the string we will need to take away the optional
    # 'C' at the beginning and the optional 'V' at the end of the string, if
    # they are present. Once that is done a division of the length by 2 will
    # grant us the value of m.
    m_cv_list = cv_list_cap
    if len(m_cv_list) > 0:
        if m_cv_list[0] == 'C':
            m_cv_list.pop(0)
    if len(m_cv_list) > 0:
        if m_cv_list[-1] == 'V':
            m_cv_list.pop(-1)

    m = len(m_cv_list) / 2

    return cv_string, m

def matchAndTransform(ending, replacement, word, m_less):
    """
    matchAndTransform() checks whether a given string is matched
    according to what ending it has and what m value the string
    has w/o the ending. If a match is found the ending is replaced
    with the replacement.

    @params: ending (string) that the given string must have.
             replacement (string) to replace the ending with
                if the conditions are met.
             word (string) to be checked.
             m_less (int) that the m value must be greater than
                for the remaining part of the string when the
                ending has been removed.
    @return: string with changed ending if match was found,
             otherwise the same string as was given is returned.
    """
    # Checks if the ending of the given string is the same as
    # the one we want to match.
    if word[-len(ending):] == ending:
        # Get the m value of the word (w/o the ending) and
        # check if it satisfies the condition (larger than the
        # cutoff m_less given when the func was called).
        # Perform appropriate substitution if the match was made.
        cv_pattern, m_check = getCV(word[:-len(ending)])
        if m_check > m_less:
            word = re.sub('(.*)' + ending + '$', r'\1' + replacement, word)

    return word

def performStepOne(word):
    """
    performStepOne() checks for a series of matches and changes suffixes
    accordingly.
    @params: string to try to match.
    @return: given word if no match was found and stripped word if match was
             found.
    """
    # 1a START
    # SSES -> SS
    new = re.sub('(.+)sses$', r'\1ss', word)
    if new != word:
        return new
    # IES -> I
    new = re.sub('(.+)ies$', r'\1i', word)
    if new != word:
        return new

    # SS -> SS
    if word[-2:] == 'ss':
        return word

    # S -> ''
    new = re.sub('(.+)s$', r'\1', word)
    if new != word:
        return new
    # 1a END

    # 1b START
    # (m > 0) EED -> EE
    if word[-3:] == 'eed':
        new = matchAndTransform('eed', 'ee', word, 0)
        return new

    # (*v*) ED -> ''
    if word[-2:] == 'ed':
        if checkStarVStar(word[:-2]):
            new = word[:-2]
            new = performOptionalOne(new)
            return new

    # (*v*) ING -> ''
    if word[-3:] == 'ing':
        if checkStarVStar(word[:-3]):
            new = word[:-3]
            new = performOptionalOne(new)
            return new
    # 1b END

    # 1c START
    # (*v*) Y -> I
    if word[-1] == 'y':
        if checkStarVStar(word[:-1]):
            new = re.sub('(.+)y$', r'\1i', word)
            return new
    # 1c END

    return word

def performOptionalOne(word):
    # Do additioanl computation is check = 1.
    # AT -> ATE
    new = re.sub('(.+)at$', r'\1ate', word)
    if new != word:
        return new
    # BL -> BLE
    new = re.sub('(.+)bl$', r'\1ble', new)
    if new != word:
        return new
    # IZ -> IZE
    new = re.sub('(.+)iz$', r'\1ize', new)
    if new != word:
        return new

    # (*d and not (*L or *S or *Z)) --> single letter
    if (checkStarD(word) and not (new[-1] in 'lsz')):
        new = new[:-1]
        return new

    # (m = 1) and *o -> E
    cv_pattern, m = getCV(new)
    if ((m == 1) and checkStarO(new)):
        new = re.sub('(.+)$', r'\1e', new)
        return new

    return new

def performStepTwo(string):
    """
    performStepTwo() checks for a series of matches and changes suffixes
    accordingly.
    @params: string to try to match.
    @return: given word if no match was found and stripped word if match was
             found.
    """
    # List of all the end of word matches we want to perform and what to
    # change them with if a match was found.
    matching_list = [['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'],
                    ['anci', 'ance'], ['izer', 'ize'], ['abli', 'able'],
                    ['alli', 'al'], ['entli', 'ent'], ['eli', 'e'],
                    ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'],
                    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'],
                    ['fulness', 'ful'], ['ousness', 'ous'], ['aliti', 'al'],
                    ['iviti', 'ive'], ['biliti', 'ble']]

    # Loops over all the ending/ replacement pairs and passes them to
    # matchAndTransform(). matchAndTransform() will return an edited
    # string if a match was made and the same string as was given to it
    # if no match was made.
    for i in matching_list:
        if string[-len(i[0]):] == i[0]:
            string = matchAndTransform(i[0], i[1], string, 0)
            return string

    return string

def performStepThree(string):
    """
    performStepThree() checks for a series of matches and changes suffixes
    accordingly.
    @params: string to try to match.
    @return: given word if no match was found and stripped word if match was
             found.
    """
    # list of all the end of word matches we want to perform and what to
    # change them with if a match was found.
    matching_list = [['icate', 'ic'], ['ative', ''], ['alize', 'al'],
                    ['iciti', 'ic'], ['ical', 'ic'], ['ful', ''],
                    ['ness', '']]

    # Loops over all the ending/ replacement pairs and passes them to
    # matchAndTransform(). matchAndTransform() will return an edited
    # string if a match was made and the same string as was given to it
    # if no match was made.
    for i in matching_list:
        if string[-len(i[0]):] == i[0]:
            string = matchAndTransform(i[0], i[1], string, 0)
            return string

    return string

def performStepFour(string):
    """
    performStepFour() checks for a series of matches and changes suffixes
    accordingly.
    @params: string to try to match.
    @return: given word if no match was found and stripped word if match was
             found.
    """
    # list of all the end of word matches we want to perform and what to
    # change them with if a match was found.
    matching_list = [['al', ''], ['ance', ''], ['ence', ''],
                    ['er', ''], ['ic', ''], ['able', ''],
                    ['ible', ''], ['ant', ''], ['ement', ''],
                    ['ment', ''], ['ent', '']]

    # Loops over all the ending/ replacement pairs and passes them to
    # matchAndTransform(). matchAndTransform() will return an edited
    # string if a match was made and the same string as was given to it
    # if no match was made.
    for i in matching_list:
        if string[-len(i[0]):] == i[0]:
            string = matchAndTransform(i[0], i[1], string, 1)
            return string

    # (m>1 and (*S or *T)) ION -> ''
    if string[-3:] == 'ion':
        cv_pattern, m = getCV(string[:-3])
        if ((m > 1) and (string[:-3][-1] in 'st')):
            string = re.sub('(.*)ion$', r'\1', string)

    matching_list_cont = [['ou', ''], ['ism', ''], ['ate', ''],
                         ['iti', ''], ['ous', ''], ['ive', ''],
                         ['ize', '']]

    for i in matching_list_cont:
        if string[-len(i[0]):] == i[0]:
            string = matchAndTransform(i[0], i[1], string, 1)
            return string

    return string

def performStepFive(word):
    """
    performStepFive() checks for a series of matches and changes suffixes
    accordingly.
    @params: string to try to match.
    @return: given word if no match was found and stripped word if match was
             found.
    """
    # 5a START
    # (m > 1) E -> ''
    if word[-1] == 'e':
        new = matchAndTransform('e', '', word, 1)
        if new != word:
            return new

        # ((m = 1) and not *o) E -> ''
        cv_pattern, m = getCV(word[:-1])
        if ((m == 1) and not checkStarO(word[:-1])):
            word = re.sub('(.*)e$', r'\1', word)
        return word
    # 5a END

    # 5b START
    # ((m > 1) and *d and *L) -> single letter
    if word[-1] == 'l':
        cv_pattern, m = getCV(word[:-1])
        if ((m > 1) and checkStarD(word)):
            word = word[:-1]
        return word
    # 5b END

    return word

def stem(string):
    """
    stem() takes a string and returns the stemmed version of the string.
    Several steps are carried out in order to stem the string, but this
    is unknown to the user of stem(). Stemming is done according to the
    Porter Stemmer algorithm.
    @params: string to be stemmed.
    @return: stemmed version of input string.
    """
    # Strips the string from any excess whitespace and makes it lowercase,
    # before passing the word through the different steps of the algorithm.
    word = string.lower().strip()

    # 1 START
    word = performStepOne(word)
    # 1 END

    # 2 START
    word = performStepTwo(word)
    # 2 END

    # 3 START
    word = performStepThree(word)
    # 3 END

    # 4 START
    word = performStepFour(word)
    # 4 END

    # 5 START
    word = performStepFive(word)
    # 5 END

    return word

if __name__ == '__main__':
    main()
