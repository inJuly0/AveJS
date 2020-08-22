import TokenType = require('./tokentype');
import Token from './token';
import keywords from './keywords';
import * as util from './helpers';

type bracket = ')' | '(' | '[' | ']' | '{' | '}';

export default class Lexer {
  private readonly sourceCode: string;
  // current Indentation level
  private currentLevel: number;
  // indentation level stack
  private levels: number[];
  private brackets: bracket[];
  private tokens: Token[];
  private current: number;
  private start: number;
  private line: number;
  private hasError: boolean = false;
  // private static readonly numberRegex: RegExp = /^\d+(\.\d+)?([eE][+-]?\d+)?$/;

  constructor(source: string) {
    this.sourceCode = source;
    this.currentLevel = 0;
    this.start = 0;
    this.levels = [];
    this.brackets = [];
    this.line = 1;
    this.tokens = [];
    this.current = 0;
  }

  // helper functions

  private eof(): boolean {
    return this.current >= this.sourceCode.length;
  }

  private next(): string {
    return this.sourceCode[this.current++];
  }

  private peek(): string {
    if (this.eof()) return '\0';
    return this.sourceCode[this.current];
  }

  private peekNext(): string {
    if (this.eof() || this.current + 1 >= this.sourceCode.length) return '\0';
    return this.sourceCode[this.current + 1];
  }

  error(message: string) {
    this.hasError = true;
    console.error(message);
    // TODO
  }

  private expect(char: string, errorMessage: string) {}

  private match(char: string): boolean {
    if (this.check(char)) {
      this.next();
      return true;
    }
    return false;
  }

  private check(char: string): boolean {
    return this.peek() == char;
  }

  private addToken(type: TokenType, value?: string | number) {
    const token: Token = {
      raw: this.sourceCode.substring(this.start, this.current),
      pos: {
        start: this.start,
        end: this.current,
        line: this.line,
      },
      type: type,
      value: value || null,
    };

    this.tokens.push(token);
  }

  // actual functions (?)

  lex(): Token[] {
    while (!this.eof()) {
      this.start = this.current;
      this.scanToken();
    }
    this.addToken(TokenType.EOF);
    return this.tokens;
  }

  private lexString(quote: string) {
    while (!this.eof() && !this.check(quote)) {
      if (this.check('\n')) this.line++;
      this.next();
    }
    if (this.eof()) this.error('Unterminated string literal');
    this.next(); //consume closing quote
    this.addToken(
      TokenType.LITERAL_STR,
      this.sourceCode.substring(this.start + 1, this.current - 1)
    );
  }

  private lexNumber() {
    while (!this.eof() && util.isDigit(this.peek())) this.next();

    if (this.check('.') && util.isDigit(this.peekNext())) {
      this.next();
      while (!this.eof() && util.isDigit(this.peek())) this.next();
    }

    if (this.match('e') || this.match('E')) {
      if (this.check('+') || this.check('-')) this.next();
      if (!util.isDigit(this.peek()))
        return this.error('Expected number after exponent.');
      while (util.isDigit(this.peek())) this.next();
    }

    if (!this.eof() && util.isAlpha(this.peek()))
      this.error('Identifier starts immediately after number literal.');

    let number = this.sourceCode.substring(this.start, this.current);
    this.addToken(TokenType.LITERAL_NUM, parseFloat(number));
  }

  private lexHexNumber() {
    // a 0x is consumed when this method is called
    let hexNum: string = '0x';

    if (!util.isHexDigit(this.peek()))
      this.error('Unexpected token ' + this.peek());

    while (!this.eof() && util.isHexDigit(this.peek())) {
      hexNum += this.next();
    }

    if (util.isValidIdChar(this.peek())) {
      this.error('Identifier starts immediately after number literal');
    }
    this.addToken(TokenType.LITERAL_HEX, hexNum);
  }

  private lexBinaryNumber() {
    // a 0b is consumed when this method is called

    let binaryNum: string = '0b';

    if (!util.isBinDigit(this.peek()))
      this.error('Unexpected token ' + this.peek());

    while (!this.eof() && util.isBinDigit(this.peek())) {
      binaryNum += this.next();
    }

    if (util.isValidIdChar(this.peek())) {
      this.error('Identifier starts immediately after number literal');
    }

    this.addToken(TokenType.LITERAL_BINARY, binaryNum);
  }

  lexIdentifier(firstChar: string) {
    let id: string = firstChar;

    while (!this.eof() && util.isValidIdChar(this.peek())) {
      id += this.next();
    }

    if (keywords.has(id)) {
      this.addToken(keywords.get(id) as TokenType);
      return;
    }

    this.addToken(TokenType.NAME, id);
  }

  private scanToken() {
    const c: string = this.next();
    //prettier-ignore
    switch (c) {
      case ':': this.addToken(TokenType.COLON); break;
      case ';': this.addToken(TokenType.SEMI_COLON); break;
      case '.': this.addToken(TokenType.DOT); break;
      case ',': this.addToken(TokenType.COMMA); break;
      case '|': this.addToken(TokenType.PIPE); break;
      case '&': this.addToken(TokenType.AMP); break;
      case '^': this.addToken(TokenType.XOR); break;
      case '=': this.addToken(TokenType.EQ); break;
      case '(':
        this.addToken(TokenType.L_PAREN);
        this.brackets.push(c);
        break;
      case ')':
        this.addToken(TokenType.R_PAREN);
        break;
      case '[':
        this.addToken(TokenType.L_SQ_BRACE);
        this.brackets.push(c);
        break;
      case ']':
        this.addToken(TokenType.R_SQ_BRACE);
        break;
      case '{': this.addToken(TokenType.L_BRACE); break;
      case '}': this.addToken(TokenType.L_BRACE); break;
      case '+':
        if (this.match('=')) this.addToken(TokenType.PLUS_EQ);
        else if (this.match('+')) this.addToken(TokenType.PLUS_PLUS);
        else this.addToken(TokenType.PLUS);
        break;
      case '-':
        if (this.match('=')) this.addToken(TokenType.MINUS_EQ);
        else if (this.match('-')) this.addToken(TokenType.MINUS_MINUS);
        else if (this.match('>')) this.addToken(TokenType.ARROW);
        else this.addToken(TokenType.MINUS);
        break;
      case '*':
        if (this.match('=')) this.addToken(TokenType.STAR_EQ);
        else if (this.match('*')) this.addToken(TokenType.POW);
        else this.addToken(TokenType.STAR);
        break;
      case '/':
        if (this.match('=')) this.addToken(TokenType.DIV_EQ);
        else if (this.match('/')) this.addToken(TokenType.FLOOR_DIV);
        else this.addToken(TokenType.DIV);
        break;
      case '>':
        if (this.match('=')) this.addToken(TokenType.GREATER_EQ);
        else this.addToken(TokenType.GREATER);
        break;
      case '<':
        if (this.match('=')) this.addToken(TokenType.LESS_EQ);
        else this.addToken(TokenType.LESS);
        break;
      case '"':
      case "'":
        this.lexString(c);
        break;
      // TODO: store comments somehow... I don't know how
      case '#':
        while (!this.check('\n')) this.next();
        break;
      case '\n':
        this.line++;
        this.addToken(TokenType.NEWLINE);
        break;
      default:
        if (util.isValidIdStart(c)) {
          this.lexIdentifier(c);
        } else if (util.isDigit(c)) {
          if (c == '0' && this.match('b')) this.lexBinaryNumber();
          else if (c == '0' && this.match('x')) this.lexHexNumber();
          else this.lexNumber();
        }
      //prettier-ignore-end
    }
  }
}
