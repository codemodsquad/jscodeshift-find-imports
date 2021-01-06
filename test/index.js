const { describe, it } = require('mocha')
const { expect } = require('chai')
const jscodeshift = require('jscodeshift')

const findImports = require('..')

const generate = require('@babel/generator').default
const mapValues = require('lodash/mapValues')

for (const parser of ['babel', 'babylon', 'ts', 'flow']) {
  describe(`with parser: ${parser}`, function() {
    const j = jscodeshift.withParser('babylon')
    const { statement } = j.template

    function testCase(code, statement, expected) {
      const actual = findImports(j(code), statement)
      expect(mapValues(actual, ast => generate(ast).code)).to.deep.equal(
        expected
      )
    }

    describe(`findImports`, function() {
      describe(`for require statement`, function() {
        it(`throws if statement contains a non-require declarator`, function() {
          const code = `import Baz from 'baz'`
          expect(() =>
            findImports(
              j(code),
              statement`const foo = require('baz'), bar = invalid(true)`
            )
          ).to.throw(Error)
        })
        it(`works for non-default imports with alias`, function() {
          testCase(
            `import {foo as bar} from 'baz'`,
            statement`const {foo: qux} = require('baz')`,
            { qux: 'bar' }
          )
        })
        it(`works for non-default imports without alias`, function() {
          testCase(
            `import {foo} from 'baz'`,
            statement`const {foo: qux} = require('baz')`,
            { qux: 'foo' }
          )
        })
        it(`works for default imports`, function() {
          testCase(
            `import foo from 'baz'`,
            statement`const {default: qux} = require('baz')`,
            { qux: 'foo' }
          )
        })
        it(`works for default requires`, function() {
          testCase(
            `const foo = require('baz')`,
            statement`const qux = require('baz')`,
            { qux: 'foo' }
          )
        })
      })
      describe(`for import statement`, function() {
        it(`works for default imports`, function() {
          const code = `import Baz from 'baz'`
          testCase(code, statement`import Foo from 'baz'`, {
            Foo: 'Baz',
          })
          testCase(code, statement`import {default as Foo} from 'baz'`, {
            Foo: 'Baz',
          })
        })
        it(`works for default type imports`, function() {
          const code = `import type Baz from 'baz'`
          testCase(code, statement`import type Foo from 'baz'`, {
            Foo: 'Baz',
          })
          testCase(code, statement`import {type default as Foo} from 'baz'`, {
            Foo: 'Baz',
          })
        })
        it(`works for default typeof imports`, function() {
          const code = `import typeof Baz from 'baz'`
          testCase(code, statement`import typeof Foo from 'baz'`, {
            Foo: 'Baz',
          })
          testCase(code, statement`import {typeof default as Foo} from 'baz'`, {
            Foo: 'Baz',
          })
        })
        it(`works for funky default imports`, function() {
          testCase(
            `import {default as Baz} from 'baz'`,
            statement`import {default as Foo} from 'baz'`,
            { Foo: 'Baz' }
          )
        })
        it(`works for funky default type imports`, function() {
          testCase(
            `import {type default as Baz} from 'baz'`,
            statement`import type Foo from 'baz'`,
            { Foo: 'Baz' }
          )
        })
        it(`works for funky default typeof imports`, function() {
          testCase(
            `import {typeof default as Baz} from 'baz'`,
            statement`import typeof Foo from 'baz'`,
            { Foo: 'Baz' }
          )
        })
        it(`works for mixed value and type imports`, function() {
          const code = `import {foo, type bar} from 'baz'`
          testCase(
            code,
            [
              statement`import {foo} from 'baz'`,
              statement`import type {bar} from 'baz'`,
            ],
            { foo: 'foo', bar: 'bar' }
          )
          testCase(code, statement`import {type foo, type bar} from 'baz'`, {
            bar: 'bar',
          })
        })
        it(`works for non-default import specifiers with aliases`, function() {
          testCase(
            `import {foo as bar} from 'baz'`,
            statement`import {foo as qux} from 'baz'`,
            { qux: 'bar' }
          )
        })
        it(`works for non-default import type specifiers with aliases`, function() {
          testCase(
            `
        import {foo as bar} from 'baz'
        import type {foo as qlob} from 'baz'`,
            statement`import type {foo as qux} from 'baz'`,
            { qux: 'qlob' }
          )
        })
        it(`works for non-default import specifiers without aliases`, function() {
          testCase(
            `import {foo} from 'baz'`,
            statement`import {foo} from 'baz'`,
            {
              foo: 'foo',
            }
          )
        })
        it(`works for non-default require specifiers with aliases`, function() {
          testCase(
            `const {foo: bar} = require('baz')`,
            statement`import {foo} from 'baz'`,
            { foo: 'bar' }
          )
        })
        it(`works for namespace imports`, function() {
          testCase(
            `import * as React from 'react'`,
            statement`import * as R from 'react'`,
            { R: 'React' }
          )
        })
        it(`works for members of namespace imports`, function() {
          testCase(
            `import * as R from 'react'`,
            statement`import {Component as C} from 'react'`,
            { C: 'R.Component' }
          )
        })
        it(`works for commonjs requires`, function() {
          testCase(
            `const bar = require('foo')`,
            statement`import foo from 'foo'`,
            {
              foo: 'bar',
            }
          )
        })
        it(`works for require defaults`, function() {
          testCase(
            `const bar = require('foo').default`,
            statement`import foo from 'foo'`,
            { foo: 'bar' }
          )
        })
        it(`works for destructured require defaults`, function() {
          testCase(
            `const {default: bar} = require('foo')`,
            statement`import foo from 'foo'`,
            { foo: 'bar' }
          )
        })
        it(`works for members of commonjs imports`, function() {
          testCase(
            `const R = require('react')`,
            statement`import {Component as C} from 'react'`,
            { C: 'R.Component' }
          )
        })
      })
      it(`works with multiple statements, specifiers, and declarators`, function() {
        testCase(
          `const {foo: _foo, bar: _bar} = require('foo')
      import baz, {qux} from 'baz'
      `,
          [
            statement`const {foo, bar} = require('foo')`,
            statement`import blah, {qux} from 'baz'`,
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
