import Token, { TokenPosition } from '../lexer/token';
import chalk = require('chalk');

export enum ErrorType {
  SyntaxError,
  TypeError,
  ReferenceError,
}

export interface AveError {
  message: string;
  startPos: number;
  endPos?: number;
  line: number;
  column: number;
  type: ErrorType;
  fileName: string;
}

export interface AveInfo {
  message: string;
  fileName: string;
}

function getErrorTypeName(et: ErrorType) {
  return ['SyntaxError', 'TypeError', 'ReferenceError'][et];
}

// some helpher functions

// finds the index of nth occurance of a character in a string,
// if not found, returns the length of the string instead
function nthIndex(s: string, c: string, n: number): number {
  for (let i = 0; i < s.length; i++) {
    if (s[i] == c) n--;
    if (n == 0) return i;
  }

  return s.length;
}

// return a colored string focusing on the error
function makeErrorLine(source: string, line: number) {
  const lineNumber = chalk.bgWhite.black(line + '| ');
  const lineContents = source.substring(
    nthIndex(source, '\n', line - 1) + (line == 1 ? 0 : 1),
    nthIndex(source, '\n', line)
  );

  return lineNumber + ' ' + lineContents;
}

// nth line of the source code in gray color
function makeLine(source: string, line: number) {
  const lineNumber = chalk.rgb(127, 140, 141)(line + '| ');
  const lineContents = source.substring(
    nthIndex(source, '\n', line - 1) + (line == 1 ? 0 : 1),
    nthIndex(source, '\n', line)
  );

  return lineNumber + ' ' + chalk.rgb(127, 140, 141)(lineContents);
}

function makeUnderLine(source: string, line: number, err: AveError): string {
  const lineLength =
    nthIndex(source, '\n', line) - nthIndex(source, '\n', line - 1) + 1;

  const text =
    ' '.repeat(err.column + `${err.line}| `.length) +
    '^'.repeat((err.endPos || 1) - err.startPos);

  return chalk.rgb(229, 80, 57)(text);
}

function makeErrorInfo(source: string, line: number, err: AveError) {
  const lines: string[] = [];

  // previous line (for easy identification of error locations)
  if (line - 1) lines.push(makeLine(source, line - 1));
  // line where the error happened
  lines.push(makeErrorLine(source, line));

  if (err.endPos) {
    lines.push(makeUnderLine(source, line, err));
  }

  return lines.join('\n');
}

export function throwError(err: AveError, source: string) {
  const errType: string = getErrorTypeName(err.type);
  const message = `\n${chalk.yellow(err.fileName)}:${err.line}:${
    err.column
  } - [${chalk.red(errType)}] ${err.message}`;

  console.error(message);
  console.log(makeErrorInfo(source, err.line, err));
}

export function makeInfo(message: string, fileName: string): AveInfo {
  return {
    message,
    fileName,
  };
}

export function throwInfo(info: AveInfo) {
  console.error(chalk.red('|* ') + info.message);
}

export function errorFromToken(
  token: Token,
  message: string,
  fileName: string,
  type?: ErrorType
): AveError {
  return {
    type: type || ErrorType.SyntaxError,
    startPos: token.pos.start,
    endPos: token.pos.end,
    line: token.pos.line,
    column: token.pos.column,
    message: message,
    fileName,
  };
}
