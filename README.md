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

console.log(imports) // {foo: {type: 'Identifier', name: 'bar'}}
```

# Compatibility

Currently tested and working with `jscodeshift@0.11.0` and the following parsers:

* `'babel'`
* `'babylon'`
* `'ts'`
* `'flow'`

It won't likely work with other custom parsers unless they output nodes in the same format as
Babel for import declarations, variable declarations, require calls, and object patterns.

# `findImports(root, statements)`

## Arguments

### `root`

The jscodeshift-wrapped AST of source code

### `statements`

The AST of an `ImportDeclaration` or `VariableDeclaration` containing `require`
calls to search for (e.g. `const foo = require('foo')`), or an array of them.

## Returns

An object where each key is an identifier from your search statement(s) that was found, and the
corresponding value is the AST for the local binding for that import (either an `Identifier` or
`MemberExpression` node). For example, if you search for `const {bar} = require('bar')` but the
source code has `const foo = require('bar').bar`, the result will have `bar: { type: 'Identifier', name: 'bar' }`.

The local binding will be a `MemberExpression` in cases like this:

```js
const code = `
import React from 'react'
`
const imports = findImports(
  j(code),
  statement`import { Component } from 'react'`
)
```

In this case `imports` would be

```js
{
  Component: {
    type: 'MemberExpression',
    object: {
      type: 'Identifier',
      name: 'React',
    },
    property: {
      type: 'Identifier',
      name: 'Component',
    },
  },
}
```
