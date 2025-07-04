const fs = require('fs')

/**
 * Splits a key string into an array of key parts, separated by dots. Escaped dots are treated as part of the key.
 * @param key Key to split
 * @returns Array of key parts
 */
const splitKey = (key) => key.match(/(\\.|[^.])+/g) || []

/**
 * Removes the first element of a key string
 * @param key Key to modify
 * @returns Modified key
 */
const getNextStepKey = (key) => splitKey(key).slice(1).join('.')

/**
 * Converts a comma, semicolon or newline separated string into an array of items.
 * Items can be escaped with a backslash, e.g. `\,` or `\;` or `\\n`.
 * @param {string} str String to convert to an array
 * @returns 
 */
const stringToArray = (str) => {
  if (!str) {
    return []
  }
  const items = str.match(/(\\[,;\n]|[^,;\n])+/g) || [] 
  return items.map((item) => item.trim())
}

/**
 * Replaces a value in an object based on a string key
 * @param obj Object to replace the value in
 * @param key Key to replace the value of
 * @param value New value
 * @returns True if the value was replaced, false otherwise
 */
const replaceValue = (obj, key, value) => {
  const currentKey = splitKey(key)[0]?.replace(/\\./g, '.') || ''
  const nextKey = getNextStepKey(key)
  const isLastKey = nextKey === ''
  if (!currentKey) {
    return false
  }
  // If the current key doesn't exist in the object, return false
  if (typeof obj[currentKey] === 'undefined') {
    return false
  }

  // Recurse into the object or array
  if (Array.isArray(obj)) {
    // If the object is an array, try to use the key as an array index
    const index = Number(currentKey)
    if (!isNaN(index)) {
      if (isLastKey) {
        obj[index] = value
        return true
      } else {
        return replaceValue(obj[index], nextKey, value)
      }
    }
  } else if (Array.isArray(obj[currentKey]) && isLastKey) {
      // Replace the entire array content if the key doesn't refer to an index
      obj[currentKey] = stringToArray(value)
      return true
  } else if (typeof obj[currentKey] === 'object' && obj[currentKey] !== null && !isLastKey) {
    // If the current key points to an object, recursively search for the next key
    return replaceValue(obj[currentKey], nextKey, value)
  }

  if ((typeof obj[currentKey] !== 'object' || obj[currentKey] === null) && !Array.isArray(obj)) {
    // If the current key points to a value that isn't an object or array, replace it
    // If the current value is a string, also convert the new value to a string to avoid type mismatch
    obj[currentKey] = typeof obj[currentKey] === 'string' ? String(value) : value
    return true
  }
  return false
}

/**
 * Parses the given value as a valid JSON data type
 * @param value String representation of the value
 * @returns The parsed value or the original value if it could not be parsed as a boolean, number or null
 */
const parseValue = (value) => {
  if (!value) {
    return null
  } else if (value === 'true') {
    return true
  } else if (value === 'false') {
    return false
  } else if (
    !isNaN(Number(value))
    && (parseInt(value).toString() === value || parseFloat(value).toString() === value)
  ) {
    return Number(value)
  } else {
    return value
  }
}

/**
 * Replaces the value of the given key in the given JSON object
 * @param obj The JSON object
 * @param key The key to replace
 * @param value The value to replace the key with
 * @returns True if the value was replaced, false otherwise
 */
const replaceObjectValue = (obj, key, value) => {
  const parsedValue = parseValue(value)
  return replaceValue(obj, key, parsedValue)
}

/**
 * Replaces the values in the given object with the values in the given replacements object
 * @param obj Object to replace the values in
 * @param replacements Object containing the keys to replace and their new values
 * @returns Array of keys that were replaced
 */
const transformObject = (obj, replacements) => {
  const replacedKeys = []
  for (const key in replacements) {
    const replaced = replaceObjectValue(obj, key, replacements[key])
    if (replaced) {
      replacedKeys.push(key)
    }
  }
  return replacedKeys
}

/**
 * Parses the given replacements string into an object
 * @param replacements Replacements string in the format key=value, separated by newlines
 * @returns Object containing the keys to replace and their new values
 */
const parseReplacements = (replacements) => {
  const lines = replacements.split('\n')
  const replacementsObj = {}
  for (const line of lines) {
    const sections = line.trim().split('=')
    const key = sections[0]
    const value = sections.slice(1).join('=')
    if (!key) {
      continue
    }
    replacementsObj[key.trim()] = value?.trim() || ''
  }
  return replacementsObj
}

/**
 * Replaces the values in the given JSON file with the values in the given replacements object and writes the result to the output file
 * @param inputFilePath Path to the input file
 * @param outputFilePath Path to the output file
 * @param replacements Object containing the keys to replace and their new values
 * @returns Array of keys that were replaced successfully
 */
const transformJsonFile = (inputFilePath, outputFilePath, replacements) => {
  const fileContent = fs.readFileSync(inputFilePath, 'utf8')
  const obj = JSON.parse(fileContent)
  const replacedKeys = transformObject(obj, replacements)
  fs.writeFileSync(outputFilePath, JSON.stringify(obj, null, 2))
  return replacedKeys
}

module.exports = { parseReplacements, transformJsonFile, transformObject }
