# Types

The selling point of Ave is that it minimizes the syntax by cutting out all that's not needed, and yet supports a type system. This helps in catching compile time typeerrors and reference errors which normal Javascript would allow. 

This has been an attempt at getting rid of a major cause of frustration for developers.


## Primitive Types.

Ave supports the following types out of the box:

* num : represents javascript numbers.
* str: represents javascript string literals.
* bool: true / false
* any: a free, dynamic type.
* null: javascript's null
* void: absence of type.
* object: key value pairs


Types can be annotated as follows:

```py
mynum: num = 10
mynum = "aa" #TypeError

myOtherNum := 100
myOtherNum = "100" #TypeError, type is inferred unless defined to be of type any.

myBool: any = true
myBool = "aaa" # 👍

myString := "abcde".substring(0, 3)
myString += 1 # string is now "abcde1"

myString -= 10: #TypeError: Cannot use operator '-=' on types 'str' and 'num'

```

## Compund Types.

Other than primitive type, there are also function types in Ave. Let's understand this using an example:

```go
func myFunc(a: num, b: num)
  if a > b
    return a + b
  return b - (a * 2)

```

The compiler now automatically infers that the function
adder takes two arguments of type number and returns a number.

```py
a := 20
b := 10

result := myFunc(a, b) # result is now 30

otherResult := myFunc('10', 20) 
# TypeError: cannot assign argument of type 'str' to paramter of type 'num'

```

The ave type checker will tell us that we did something wrong. whereas javascript would simply pass this as okay, and then our 'myFunc' would do all kinds of weird gymnastics and sometimes return a `NaN` sometimes until we finally catch the bug.


## Records.

Records let us define the structure of an object.

```ts
record Doggy
  name: str
  age: num
  bark: () -> str
```

now we could do:

```py
goodDog: Doggy =
  name: "bobo",
  age: 20,
  bark: func ()
    return "bow bow"

badDoggy: Doggy =
  name: "dodo",
  age: 10

# TypeError: cannot initialize 'badDoggy' with type 'Doggy'
#   'badDoggy' is missing the property 'bark' defined in 'Doggy'
```

This is especially helpful in functions :

```go
func getDogAge(dog: Doggy)
  return dog.ages
```
if you look closely, we mispelled the property 'age' on record dog as 'ages'. Javascript again, would never complain and would happily return undefined leaving us to work with it.

Ave catches this at compile time, and throws the following error:

```
TypeError: field 'ages' does not exist on type Doggy. Did you mean 'age' ?
```



