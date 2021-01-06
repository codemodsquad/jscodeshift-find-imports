const { describe, it } = require('mocha')
const { expect } = require('chai')
const jscodeshift = require('jscodeshift')
const prettier = require('prettier')

const findImports = require('..')

const generate = require('@babel/generator').default
const mapValues = require('lodash/mapValues')

for (const parser of ['babel', 'babylon', 'ts', 'flow']) {
  describe(`with parser: ${parser}`, function() {
    const j = jscodeshift.withParser('babylon')
    const { statement } = j.template

    const format = code =>
      prettier.format(code, {
        parser: parser === 'ts' ? 'typescript' : 'babel',
      })

    function testCase(code, imports, expected) {
      const doFind = () =>
        findImports(
          j(code),
          typeof imports === 'string'
            ? statement([imports])
            : Array.isArray(imports)
            ? imports.map(i => (typeof i === 'string' ? statement([i]) : i))
            : imports
        )

      if (expected instanceof Error) {
        expect(doFind).to.throw(expected.message)
      } else {
        const actual = doFind()
        expect(
          mapValues(actual, ast => format(generate(ast).code))
        ).to.deep.equal(mapValues(expected, format))
      }
    }

    describe(`findImports`, function() {
      describe(`for require statement`, function() {
        it(`throws if statement contains a non-require declarator`, function() {
          testCase(
            `import Baz from 'baz'`,
            `const foo = require('baz'), bar = invalid(true)`,
            new Error('statement must be an import or require')
          )
        })
        it(`works for non-default imports with alias`, function() {
          testCase(
            `import {foo as bar} from 'baz'`,
            `const {foo: qux} = require('baz')`,
            { qux: 'bar' }
          )
        })
        it(`works for non-default imports without alias`, function() {
          testCase(
            `import {foo} from 'baz'`,
            `const {foo: qux} = require('baz')`,
            { qux: 'foo' }
          )
        })
        it(`works for default imports`, function() {
          testCase(
            `import foo from 'baz'`,
            `const {default: qux} = require('baz')`,
            { qux: 'foo' }
          )
        })
        it(`works for default requires`, function() {
          testCase(`const foo = require('baz')`, `const qux = require('baz')`, {
            qux: 'foo',
          })
        })
      })
      describe(`for import statement`, function() {
        it(`works for default imports`, function() {
          const code = `import Baz from 'baz'`
          testCase(code, `import Foo from 'baz'`, {
            Foo: 'Baz',
          })
          testCase(code, `import {default as Foo} from 'baz'`, {
            Foo: 'Baz',
          })
        })
        it(`works for default type imports`, function() {
          const code = `import type Baz from 'baz'`
          testCase(code, `import type Foo from 'baz'`, {
            Foo: 'Baz',
          })
          testCase(code, `import {type default as Foo} from 'baz'`, {
            Foo: 'Baz',
          })
        })
        it(`works for default typeof imports`, function() {
          const code = `import typeof Baz from 'baz'`
          testCase(code, `import typeof Foo from 'baz'`, {
            Foo: 'Baz',
          })
          testCase(code, `import {typeof default as Foo} from 'baz'`, {
            Foo: 'Baz',
          })
        })
        it(`works for funky default imports`, function() {
          testCase(
            `import {default as Baz} from 'baz'`,
            `import {default as Foo} from 'baz'`,
            { Foo: 'Baz' }
          )
        })
        it(`works for funky default type imports`, function() {
          testCase(
            `import {type default as Baz} from 'baz'`,
            `import type Foo from 'baz'`,
            { Foo: 'Baz' }
          )
        })
        it(`works for funky default typeof imports`, function() {
          testCase(
            `import {typeof default as Baz} from 'baz'`,
            `import typeof Foo from 'baz'`,
            { Foo: 'Baz' }
          )
        })
        it(`works for mixed value and type imports`, function() {
          const code = `import {foo, type bar} from 'baz'`
          testCase(
            code,
            [`import {foo} from 'baz'`, `import type {bar} from 'baz'`],
            { foo: 'foo', bar: 'bar' }
          )
          testCase(code, `import {type foo, type bar} from 'baz'`, {
            bar: 'bar',
          })
        })
        it(`works for non-default import specifiers with aliases`, function() {
          testCase(
            `import {foo as bar} from 'baz'`,
            `import {foo as qux} from 'baz'`,
            { qux: 'bar' }
          )
        })
        it(`works for non-default import type specifiers with aliases`, function() {
          testCase(
            `
              import {foo as bar} from 'baz'
              import type {foo as qlob} from 'baz'
            `,
            `import type {foo as qux} from 'baz'`,
            { qux: 'qlob' }
          )
        })
        it(`works for non-default import specifiers without aliases`, function() {
          testCase(`import {foo} from 'baz'`, `import {foo} from 'baz'`, {
            foo: 'foo',
          })
        })
        it(`works for non-default require specifiers with aliases`, function() {
          testCase(
            `const {foo: bar} = require('baz')`,
            `import {foo} from 'baz'`,
            { foo: 'bar' }
          )
        })
        it(`works for namespace imports`, function() {
          testCase(
            `import * as React from 'react'`,
            `import * as R from 'react'`,
            { R: 'React' }
          )
        })
        it(`works for members of namespace imports`, function() {
          testCase(
            `import * as R from 'react'`,
            `import {Component as C} from 'react'`,
            { C: 'R.Component' }
          )
        })
        it(`works for commonjs requires`, function() {
          testCase(`const bar = require('foo')`, `import foo from 'foo'`, {
            foo: 'bar',
          })
        })
        it(`works for require defaults`, function() {
          testCase(
            `const bar = require('foo').default`,
            `import foo from 'foo'`,
            { foo: 'bar' }
          )
        })
        it(`works for destructured require defaults`, function() {
          testCase(
            `const {default: bar} = require('foo')`,
            `import foo from 'foo'`,
            { foo: 'bar' }
          )
        })
        it(`works for members of commonjs imports`, function() {
          testCase(
            `const R = require('react')`,
            `import {Component as C} from 'react'`,
            { C: 'R.Component' }
          )
        })
      })
      it(`works with multiple statements, specifiers, and declarators`, function() {
        testCase(
          `
            const {foo: _foo, bar: _bar} = require('foo')
            import baz, {qux} from 'baz'
          `,
          [
            `const {foo, bar} = require('foo')`,
            `import blah, {qux} from 'baz'`,
          ],
          {
            foo: '_foo',
            bar: '_bar',
            blah: 'baz',
            qux: 'qux',
          }
        )
      })
    })
  })
}
