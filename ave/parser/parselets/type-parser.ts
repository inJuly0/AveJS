import TT = require("../../lexer/tokentype");
import FunctionType, { ParameterType } from "../../type/function-type";
import GenericType, { GenericInstance, t_Array } from "../../type/generic-type";
import * as Typing from "../../type/types";
import Parser from "../parser";
import { TypeInfo } from "../ast/ast";
import Token from "../../lexer/token";
import UnionType from "../../type/union-type";
import ObjectType from "../../type/object-type";

/**
 * Parses a valid Ave Data type, and returns the TypeInfo AST Node
 * wrapping that type.
 * @param  {Parser}   parser The Parser to draw tokens from.
 * @return {TypeInfo}
 */

export default function parseType(parser: Parser) {
	let t = parseNonUnionType(parser);

	// if '|' is seen, parse a union type.
	if (parser.check(TT.PIPE)) {
		const subtypes = [t.type];

		while (parser.match(TT.PIPE)) {
			subtypes.push(parseNonUnionType(parser).type);
		}

		return new TypeInfo(t.token, new UnionType(...subtypes));
	}

	return t;
}

/**
 * Parses a data type but stops on seeing a '|' token. Doesn't parse
 * union types.
 * @param {Parser} parser The parser to draw tokens from.
 */

function parseNonUnionType(parser: Parser): TypeInfo {
	if (parser.isValidType(parser.peek())) {
		let typeToken = parser.next();

		if (parser.match(TT.L_SQ_BRACE)) {
			parser.expect(TT.R_SQ_BRACE, "Expected ']' token.");
			return new TypeInfo(typeToken, t_Array.instantiate([Typing.fromToken(typeToken)]));
		} else if (parser.match(TT.LESS)) {
			return parseGenericInstance(parser, typeToken);
		}

		return new TypeInfo(typeToken, Typing.fromToken(typeToken));
	}

	if (parser.match(TT.L_PAREN)) {
		return new TypeInfo(parser.prev(), parseFunctionType(parser));
	}

	if (parser.match(TT.L_BRACE)) {
		const type = parseObjectType(parser);
		return new TypeInfo(parser.prev(), type);
	}

	return new TypeInfo(parser.peek(), Typing.t_any);
}

function parseFunctionType(parser: Parser): Typing.Type {
	let params = parseParams(parser);
	let returnType = Typing.t_any;

	if (parser.match(TT.ARROW)) {
		returnType = parseType(parser).type;
	}

	let ftype = new FunctionType("", params, returnType);
	return ftype;
}

function parseParams(parser: Parser): ParameterType[] {
	let params: ParameterType[] = [];
	while (!parser.match(TT.R_PAREN)) {
		params.push(parseParam(parser));

		if (!parser.check(TT.R_PAREN)) {
			parser.expect(TT.COMMA, "Expected ','.");
		}
	}
	return params;
}

function parseParam(parser: Parser): ParameterType {
	let name = parser.expect(TT.NAME, "Expected paramter name.").raw;
	let type = Typing.t_any;

	if (parser.match(TT.COLON)) type = parseType(parser).type;

	return {
		name,
		type,
		required: true,
		hasDefault: false,
		isRest: false,
	};
}

function parseGenericInstance(parser: Parser, name: Token) {
	let typeArgs: Typing.Type[] = [];
	while (!parser.match(TT.GREATER)) {
		typeArgs.push(parseType(parser).type);

		if (!parser.match(TT.COMMA)) {
			parser.expect(TT.GREATER, "Expected ','");
			break;
		}
	}

	const genType = new GenericInstance(name.raw, typeArgs);
	return new TypeInfo(name, genType);
}

function parseObjectType(parser: Parser): ObjectType {
	const objectType = new ObjectType();
	while (!parser.match(TT.R_BRACE) && !parser.eof()) {
		const name = parser.expect(TT.NAME, "Expected property name.").raw;
		parser.expect(TT.COLON, "Expected ':' after field name.");
		const type = parseType(parser).type;
		parser.consume(TT.COMMA, TT.SEMI_COLON);
		objectType.defineProperty(name, type);
	}
	return objectType;
}
