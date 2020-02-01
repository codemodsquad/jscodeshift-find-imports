# jscodeshift-find-imports

[![CircleCI](https://circleci.com/gh/codemodsquad/jscodeshift-find-imports.svg?style=svg)](https://circleci.com/gh/codemodsquad/jscodeshift-find-imports)
[![Coverage Status](https://codecov.io/gh/codemodsquad/jscodeshift-find-imports/branch/master/graph/badge.svg)](https://codecov.io/gh/codemodsquad/jscodeshift-find-imports)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/jscodeshift-find-imports.svg)](https://badge.fury.io/js/jscodeshift-find-imports)

find imported/required identifiers with jscodeshift

# Usage

```
npm i jscodeshift-find-imports
```

```js
const findImports = require('jscodeshift-find-imports')
const j = require('jscodeshift')
const { statement } = j.template

const code = `
import bar from 'foo'
`

const imports = findImports(j(code), statement`import foo from 'foo'`)

console.log(imports) // {foo: 'bar'}
```

# `findImports(root, statements)`

## Arguments

### `root`

The jscodeshift-wrapped AST of source code

### `statements`

The AST of an `ImportDeclaration` or `VariableDeclaration` containing `require`
calls to search for (e.g. `const foo = require('foo')`), or an array of them.

## Returns

An object where each key is an identifier from your search statement(s) that was found, and the
corresponding value is the local binding for that import. For example, if you search for
`const {bar} = require('bar')` but the source code has `const foo = require('bar').bar`,
the result will have `bar: foo`.
