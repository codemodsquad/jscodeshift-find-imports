const j = require('jscodeshift')

/**
 * Searches for imports and require statements in an AST for specifiers
 * corresponding those in the requested statement.
 * @param root - the jscodeshift-wrapped AST to search
 * @param statement - the AST for an import or require declaration to search for
 * @returns {Object} a map of all the found imports, where the key is the alias
 * in statement, and the value is the alias in the searched AST
 */
module.exports = function findImports(root, statement) {
  if (Array.isArray(statement)) {
    const result = {}
    statement.forEach(s => Object.assign(result, findImports(root, s)))
    return result
  }

  let source, importKind
  if (statement.type === 'ImportDeclaration') {
    importKind = statement.importKind
    source = statement.source.value
  } else if (statement.type === 'VariableDeclaration') {
    const { declarations } = statement
    if (declarations.length !== 1) {
      const result = {}
      declarations.forEach(d =>
        Object.assign(
          result,
          findImports(root, Object.assign({}, statement, { declarations: [d] }))
        )
      )
      return result
    }
    const declarator = declarations[0]
    const { init } = declarator
    if (
      !init ||
      init.type !== 'CallExpression' ||
      init.callee.name !== 'require'
    ) {
      throw new Error('statement must be an import or require')
    }
    importKind = 'value'
    source = init.arguments[0].value
  } else {
    throw new Error('invalid statement type: ' + statement.type)
  }
  const imports = root.find(j.ImportDeclaration, {
    source: { value: source },
  })
  const requires = []
  const defaultRequires = []
  root
    .find(j.Program)
    .nodes()[0]
    .body.forEach(node => {
      if (node.type !== 'VariableDeclaration') return
      for (let declarator of node.declarations) {
        const { init } = declarator
        if (!init) continue
        if (
          init.type === 'CallExpression' &&
          init.callee.name === 'require' &&
          init.arguments[0].value === source
        ) {
          requires.push(declarator)
        } else if (
          init.type === 'MemberExpression' &&
          init.property.name === 'default' &&
          init.object.type === 'CallExpression' &&
          init.object.callee.name === 'require' &&
          init.object.arguments[0].value === source
        ) {
          defaultRequires.push(declarator)
        }
      }
    })

  function getImportKind(path) {
    return (
      path.node.importKind ||
      (path.parent && path.parent.node.importKind) ||
      'value'
    )
  }

  function findImport(imported, importKind) {
    let matches
    if (imported === 'default') {
      matches = imports
        .find(j.ImportDefaultSpecifier)
        .filter(p => getImportKind(p) === importKind)
      if (matches.size()) return matches.nodes()[0].local.name
      matches = imports
        .find(j.ImportSpecifier, {
          imported: { name: 'default' },
        })
        .filter(p => getImportKind(p) === importKind)
      if (matches.size()) return matches.nodes()[0].local.name
      if (defaultRequires.length) {
        return defaultRequires[defaultRequires.length - 1].id.name
      }

      for (let node of requires) {
        if (node.id.type === 'Identifier') return node.id.name
      }
    } else {
      matches = imports
        .find(j.ImportSpecifier, {
          imported: { name: imported },
        })
        .filter(p => getImportKind(p) === importKind)
      if (matches.size()) return matches.nodes()[0].local.name
    }
    for (let node of requires) {
      if (node.id.type !== 'ObjectPattern') continue
      for (let prop of node.id.properties) {
        if (prop.key.name === imported) return prop.value.name
      }
    }
  }

  const result = {}
  if (statement.type === 'ImportDeclaration') {
    statement.specifiers.forEach(desiredSpecifier => {
      if (desiredSpecifier.type === 'ImportNamespaceSpecifier') {
        const found = imports.find(j.ImportNamespaceSpecifier)
        if (found.size())
          result[desiredSpecifier.local.name] = found.nodes()[0].local.name
      } else {
        const found = findImport(
          desiredSpecifier.type === 'ImportDefaultSpecifier'
            ? 'default'
            : desiredSpecifier.imported.name,
          desiredSpecifier.importKind || importKind
        )
        if (found) result[desiredSpecifier.local.name] = found
      }
    })
  } else if (statement.type === 'VariableDeclaration') {
    const { id } = statement.declarations[0]
    if (id.type === 'ObjectPattern') {
      for (let prop of id.properties) {
        const key = prop.key.name,
          value = prop.value.name
        const found = findImport(key, 'value')
        if (found) result[value] = found
      }
    }
    if (id.type === 'Identifier') {
      for (let node of requires) {
        if (node.id.type === 'Identifier') {
          result[id.name] = node.id.name
          break
        }
      }
    }
  }
  return result
}
