import { Statement, Identifier, MemberExpression } from 'jscodeshift'
import { Collection } from 'jscodeshift/src/Collection'

declare function findImports(
  root: Collection<any>,
  statements: Statement | Statement[]
): Record<string, Identifier | MemberExpression>
export = findImports
