import { throws } from 'assert';
import { isValidAssignment, Type, t_any } from './types';

// Function Types
// declared as (p1: t1, p2: t2) => rt

export interface ParameterTypeInfo {
  name: string;
  type: Type;
  required: boolean;
  rest?: boolean;
  hasDefault?: boolean;
}

export default class FunctionType extends Type {
  readonly params: ParameterTypeInfo[];
  returnType: Type;

  public constructor(
    name?: string,
    params?: ParameterTypeInfo[],
    retType?: Type
  ) {
    super(name || '');
    this.superType = null;
    this.params = params || [];
    this.returnType = retType || t_any;
  }

  public addParam(
    name: string,
    type: Type,
    required: boolean,
    hasDefault?: boolean
  ) {
    this.params.push({
      name,
      type,
      required,
      hasDefault,
    });
  }

  public canAssign(t: Type) {
    if (!(t instanceof FunctionType)) return false;
    if (!this.returnType.canAssign(t.returnType)) return false;

    if (t.params.length != this.params.length) return false;

    for (let i = 0; i < this.params.length; i++) {
      if (this.params[i].rest != t.params[i].rest) return false;
      if (!isValidAssignment(t.params[i].type, this.params[i].type))
        return false;
    }

    return true;
  }

  public toString() {
    if (this.tag) return this.tag;
    return `(${this.params
      .map(e => {
        let s = e.required ? '' : '?';
        s += e.rest ? '...' : '';
        s += `${e.name}: ${e.type.toString()} `;
        return s;
      })
      .join(', ')}) -> ${this.returnType.toString()}`;
  }
}

// Javascript functions
export const t_Function = new FunctionType('Function', [
  {
    name: 'args',
    type: t_any,
    required: false,
    rest: true,
  },
]);