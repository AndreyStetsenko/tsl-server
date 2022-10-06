// const { uniqueNamesGenerator, adjectives, colors } = require('unique-names-generator');
const miscHelpers = require('../../helpers/misc');
const _ = require('lodash');
const { adjectives, adverbs, nouns, pronouns, verbs } = require('./dictionaries');
const { isDomainAvailable } = require('../dns');

function genSalt(type, length = 0) {
    let characters;
    switch (type) {
      case 'string':
        characters = 'abcdefghijklmnopqrstuvwxyz';
        break;
      case 'number':
        characters = '0123456789';
        break;
      case 'mixed':
        characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        break;
    }

    return miscHelpers.generateRandomString(length, characters);
}

function formatSeparator(separator) {
  switch(separator) {
    case 'empty':
      return '';
    case 'dash':
      return '-';
  }
} 

function getDictionaries(count) {
  switch(count) {
    case 1:
      return _.sample([[adjectives], [nouns], [verbs]])
    case 2:
      return _.sample([[adjectives, nouns], [nouns, verbs], [pronouns, nouns]])
    case 3:
      return _.sample([[adjectives, adverbs, nouns], [nouns, verbs, pronouns]])
    case 4:
      return _.sample([[adjectives, adverbs, nouns, verbs], [nouns, verbs, pronouns, adjectives]])
  }
}

exports.generateNames = async (keywords, tlds, wordCount, quantity, separator, isPrefixEnabled, prefixType, prefixLength, isSuffixEnabled, suffixType, suffixLength) => {
  const dictionaries = getDictionaries(wordCount);

  const words = await Promise.all(dictionaries.map(dictionary => {
      return _.sampleSize(dictionary, quantity);
  }));

  const formattedSeparator = formatSeparator(separator);
  const prefix = isPrefixEnabled ? genSalt(prefixType, prefixLength) : null;
  const suffix = isSuffixEnabled ? genSalt(suffixType, suffixLength) : null;

  const domainsWithoutCheck = [];
  // Join array of words by index
  const mergedArrayWords = _.zip(...words);

  mergedArrayWords.map(merged => {
    // Find random word index in array
    const randomWordIndex = _.random(0, wordCount - 1);
    // Replace random word with random keyword
    keywords.length && (merged[randomWordIndex] = _.sample(keywords));
    // Add prefix if exist
    prefix && (merged.unshift(prefix));
    // Add suffix if exist
    suffix && (merged.push(suffix));

    // Merge all words with random domain zone
    const fullDomain = merged.join(formattedSeparator).toLowerCase() + '.' + _.sample(tlds);
    domainsWithoutCheck.push(fullDomain);
  });

  // Check only unique domain names from array
  const domainsWithCheck = await Promise.all(_.uniq(domainsWithoutCheck).map(async domain => {
    return {
      name: domain,
      isAvailable: await isDomainAvailable(domain)
    }
  }));

  return domainsWithCheck.filter(domain => domain.isAvailable === true).map(domain => domain.name);
}