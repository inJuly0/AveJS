import { parse } from "path";
import Checker from "../checker/checker";
import { JSGenerator } from "../compiler/codegen/gen";
import Lexer from "../lexer/lexer";
import AveParser from "../parser/aveparser";

const src = `
func fib(x: num): num
    if x == 1
        return x
    return fib(x - 1) + fib(x - 2)

const a: bool = true
`;

const parseTree = new AveParser(new Lexer("<test>", src).lex()).parse();
new Checker(parseTree).check();

const writer = new JSGenerator(parseTree.ast);
console.log(writer.generateJS());
