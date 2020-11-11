import Lexer from "../lexer/lexer";
import NodeKind = require("../parser/ast/nodekind");
import AveParser from "../parser/aveparser";
import TokenType = require("../lexer/tokentype");
import Checker from "../checker/checker";

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchAST(expected: UnknownNode[]): R;
      toHaveError(errMsg: string): R;
    }
  }
}

expect.extend({
  toMatchAST(src: string, expected: UnknownNode[]) {
    const ast = toAST(src);
    const match = matchNodes(expected, ast);
    return {
      pass: match.pass,
      message: () => match.message,
    };
  },

  toHaveError(src: string, errMsg: string) {
    const parser = new AveParser(new Lexer("<test>", src).lex());
    const parseTree = parser.parse();
    const err = parseTree.errors[0];
    let pass = true;
    let msg: string = "errors matched";

    if (!parseTree.hasError) {
      const checker = new Checker(parseTree);
      const checkedAST = checker.check();
      pass = false;
      msg = "Expected program to have error.";
    } else if (err.message != errMsg) {
      pass = false;
      msg = `Error mismatch. Expected: \n${errMsg}\nPassed in: \n${err.message}`;
    }

    return {
      pass,
      message: () => msg,
    };
  },
});

function toAST(src: string) {
  const lexer = new Lexer("<test>", src);
  const parser = new AveParser(lexer.lex());
  return parser.parse().ast.body.statements;
}

type UnknownNode = { [k: string]: any };
type MatchResult = { pass: boolean; message: string };

/**
 * Returns `true` if all properties in `a` are also present in `b`.
 * @param {UnknownNode} a object whose properties are to be checked against
 * @param {UnknownNode} b object which is expected tp be the superset and contain all properties of `a`.
 */

function isSubsetOf(a: UnknownNode, b: UnknownNode): MatchResult {
  for (const [key, val] of Object.entries(a)) {
    if (!b.hasOwnProperty(key))
      return { pass: false, message: `missing key "${key}"` };
    const match = matchNodes(val, b[key]);
    if (!match.pass) {
      return {
        pass: false,
        message: `${key}: ${match.message}`,
      };
    }
  }
  // a is an empty object
  return { pass: true, message: "nodes match" };
}

/**
 * Matches two values `a` and `b`. The values can be arrays, object literals
 * strings or number literals.
 * @param a
 * @param b
 */
function matchNodes(a: any, b: any): MatchResult {
  if (typeof a != typeof b)
    return { pass: false, message: "conflicting types" };

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length > b.length)
      return {
        pass: false,
        message: `Expected at least ${a.length} elements`,
      };
    for (let i = 0; i < a.length; i++) {
      const match = matchNodes(a[i], b[i]);
      if (!match.pass) return match;
    }
    return { pass: true, message: "arrays match" };
  }

  if (typeof a == "object") {
    return isSubsetOf(a, b);
  }

  if (a == b) {
    return {
      pass: true,
      message: "values equal",
    };
  }

  return {
    pass: false,
    message: `Expected '${a}' got '${b}'`,
  };
}

// prettier-ignore
test("variable declarations", () => {
  expect(`let a = 1;`).toMatchAST([{
    kind: NodeKind.VarDeclaration,
    declarators: [{
      kind: NodeKind.VarDeclarator, name: "a", value: {
        kind: NodeKind.Literal,
        value: 1
    }},],
  }]);
});

// prettier-ignore
test("assignment expression", () => {
  expect(`a = b = 1`).toMatchAST([
    {
      kind: NodeKind.ExprStmt,
      expr: {
        kind: NodeKind.AssignmentExpr,
        left: { kind: NodeKind.Identifier, name: "a" },
        right: {
          kind: NodeKind.AssignmentExpr,
          left: { kind: NodeKind.Identifier, name: "b" },
          right: { kind: NodeKind.Literal, value: 1 } } } },
  ]);
});

// prettier-ignore
test("parse precedence for operators.", () => {
  expect(`1 + 2 * -3`).toMatchAST([{
    kind: NodeKind.ExprStmt,
    expr: {
      kind: NodeKind.BinaryExpr,
      operator: { type: TokenType.PLUS },
      left: { kind: NodeKind.Literal, value: 1 },
      right: {
        kind: NodeKind.BinaryExpr,
        operator: { type: TokenType.STAR },
        right: { 
          kind: NodeKind.PrefixUnaryExpr,
          operator: { type: TokenType.MINUS },
          operand: { kind: NodeKind.Literal, value: 3 } } } } }      
  ]);
});

// prettier-ignore
test("parse while loops.", () => {
  expect(`
var k = 4
while k
  k -= 1
  `).toMatchAST([{
    kind: NodeKind.VarDeclaration,
    declarators: [ { kind: NodeKind.VarDeclarator, name: "k", value: { kind: NodeKind.Literal, value: 4 } } ],
  },
  {
    kind: NodeKind.WhileStmt,
    condition: { kind: NodeKind.Identifier, name: "k" },
    body: {
      kind: NodeKind.Body,
      statements: [ {
          kind: NodeKind.ExprStmt,
          expr: {
            kind: NodeKind.AssignmentExpr,
            left: { kind: NodeKind.Identifier, name: "k" },
            operator: { type: TokenType.MINUS_EQ },
            right: { kind: NodeKind.Literal, value: 1 } } } ] } } ] )
});

// prettier-ignore
test("arrays and indexing", () => {
  expect("array[index]").toMatchAST([{
     kind: NodeKind.ExprStmt,
      expr: {kind: NodeKind.MemberAcessExpr,
      isIndexed: true,
      object: { kind: NodeKind.Identifier, name: "array" },
      property: { kind: NodeKind.Identifier, name: "index" }, }, },
  ]);
});

// negative tests for the Parser.
// These tests check if the parser produces the expected errors (and doesn't crash)

test("error on unexpected EOF", () => {
  expect("1 + 2 * -").toHaveError(
    "Reached end of file while parsing expression."
  );
  expect("1 + 2 +").toHaveError(
    "Reached end of file while parsing expression."
  );
});

test("error on faulty expressions", () => {
  expect("a := ()").toHaveError("Unexpected ')'");
  expect("a: b: c:").toHaveError("Unexpected ':'");
});

test("error on incorrect blocks", () => {
  expect(`
while k
  var a = 1
    var b = 2
  `).toHaveError("Expected object key name.");

  expect("if foo").toHaveError("Expected indent before 'if' body.");
});

test("arrow functions.", () => {
  // prettier-ignore
  expect(`
var dbl = (a: num) -> a * 2
  `).toMatchAST([{
    kind: NodeKind.VarDeclaration,
    declarators: [{
      name: "dbl",
      value: {
        kind: NodeKind.FunctionExpr,
        isArrow: true,
        body: {
          statements: [{
            kind: NodeKind.ReturnStmt,
            expr: {
              kind: NodeKind.BinaryExpr,
              left: { name: "a" }, 
              operator: { type: TokenType.STAR }, 
              right: { value: 2 }}}]}}}]}]
  );
});
