# Understanding the `.Q` Functions - Part 1

## K4 Conversion Table

| K4    | Q          |
| ----- | ---------- |
| `*x`  | `first x`  |
| `$x`  | `string x` |
| `@x`  | `type x`   |
| `. x` | `value x`  |

In K4, many operators are overloaded on their valence. Ambiguities can arise when it is not clear to the interpreter which form should be used because the criteria for both forms has been met. The `:` operator forces the unary form and you will often see it used in most Q keyword definitions, e.g.,
  ```q
  q)type
  @:
  ```
  Here, `@` is the `type` operator when used in unary form, and `:` forces it to be in unary form.

## Notes

- I have added indentation and extra spacing to the K4 definitions for readability purposes.

## `.Q.v` - Value

```q
.Q.v x
```

`x`:
 - File symbol: Retuns splayed table stored at `x`.
 - Regular symbol: Returns the value stored at (global) name `x`.
 - Anything else: Returns `x`.
  
### Convert Implementation

The underlying K4 implementation of `.Q.v` is

```q
k){
    $[-11h=@x;
        .$[":"=*t:$x;`$t,"/";x];
        x
    ]
 }
```

where `x` is the sole parameter.

The whole body of the function is a single if-else block. Converting each part in turn:

- Predicate `-11h=@x`: 
    - `@` in unary form is `type` in Q → `-11h=type x`
    - The predicate is true if `x` is a symbol atom, and false otherwise.

- Consequent `.$[":"=*t:$x;``$t,"/";x]`:
    - Split into two parts:
      - `.`: `value` in Q.
      - `` $[":"=*t:$x;`$t,"/";x] ``: An if-else statement where
        - Predicate `":"=*t:$x`:
          - `$x` → `string x`
          - Asign `t`: `t:string x`
          - `*t` → `first t`
          - `":"=first t`: Check if the first character in `t` is `":"`, i.e., is this is a file symbol.
          - → `":"=first t:string x`
        - Consequent `` `$t,"/" ``:
          - `t` is a file symbol → append a `"/"` character (unix file path seperator) and cast to symbol (exactly the same in Q).
        - Alternative `x`: Just return `x` as is. 

- Alternative `x`: Just return `x` as is. 

Therefore, the equivalent Q implementation is

```q
{
    $[-11h=type x;
        value $[":"=first t:string x; `$t,"/"; x];
        x
    ]
 }
```

### Usage

`.Q.v` is almost equivalent to `value` except for the case where its argument is a file symbol, in which case a `/` is append to the file symbol before calling `value` on it.

The question here is, what is the difference between calling `value` on a file symbol (assumed to be the path to a splayed table) with and without a trailing `/`?

Let's show this with an example:

```q
// Create a simple splayed table
q)`:./db/t/ set .Q.en[`:./db;] ([] a:1 2 3; b:`a`b`c)
`:./db/t/
```

In a fresh Q session:

```q
// Load the sym file
q)`sym set get `:./db/sym
`sym

// They look the same
q)value `:./db/t
a b
---
1 a
2 b
3 c
q)value `:./db/t/
a b
---
1 a
2 b
3 c

// But are not equivalent
q)(value `:./db/t)~value `:./db/t/
0b
```

Digging deeper

```q
// Same type
q)type value `:./db/t
98h
q)type value `:./db/t/
98h

// Same metadata
q)meta value `:./db/t
| c   | t f a |
| --- | ----- |
| a   | j     |
| b   | s     |
q)meta value `:./db/t/
| c   | t f a |
| --- | ----- |
| a   | j     |
| b   | s     |

// The rows match
q)(value `:./db/t)~'value `:./db/t/
111b
```

Everything seems equivalent so far. But, the difference is a bit more subtle. 

Let's store the tables in some variables and then use `\` to drop into k mode and query the tables:

```q
q)t1:value `:./db/t
q)t2:value `:./db/t/
q)\
  t1
+`a`b!(1 2 3;`sym$`a`b`c)
  t2
+`a`b!`:./db/t/
```

This tells us that `t1` is a simple table and `t2` is a splayed table.

An easier way to check this without having to drop into k mode is using `.Q.qp` (is partitioned):

```q
q).Q.qp t1
0
q).Q.qp t2
0b
```

`.Q.qp` returns `1b` when a table is partitioned, `0b` when a table is splayed, and `0` for everything else.

We can also use `flip`:

```q
q)flip t1
a| 1 2 3
b| a b c
q)flip t2
`a`b!`:./db/t/
```

Let's create a larger table and consult the time and memory statistics for both cases:

```q
q)`:./db/t/ set .Q.en[`:./db;] ([] a:1000000?100; b:1000000?`3)
`:./db/t/
```

```q
// Fresh Q session

q)`sym set get `:./db/sym
`sym

q).Q.w[]
used| 537072
heap| 67108864
peak| 67108864
wmax| 0
mmap| 0
mphy| 8095444992
syms| 4853
symw| 203320

// Does not have trailing /
q)t:value `:./db/t

q).Q.w[]
used| 537184
heap| 67108864
peak| 67108864
wmax| 0
mmap| 16004112
mphy| 8095444992
syms| 4855
symw| 203383

q)\ts:10000 select from t
1 720
```

For the case with no trailing `/`, `mmap` (memory mapped) increased from 0 to 16,004,112, .i.e., `t` has been mapped into memory. Query speed is very fast.

```q
// Fresh Q session

q)`sym set get `:./db/sym
`sym

q).Q.w[]
used| 537072
heap| 67108864
peak| 67108864
wmax| 0
mmap| 0
mphy| 8095444992
syms| 4853
symw| 203320

// Has trailing /
q)t:value `:./db/t/

q).Q.w[]
used| 537168
heap| 67108864
peak| 67108864
wmax| 0
mmap| 0
mphy| 8095444992
syms| 4855
symw| 203385

q)\ts:10000 select from t
432 720
```

`mmap` did not change and thus `t` was not mapped into memory. Query speed is much slower because the table must be mapped into memory during each query.

To summarise, the difference between calling `value` on a file symbol (splayed table path) with and without a trailing `/` is that in the former case, the table is directly mapped into memory, but is consider to be a regular table. In the latter case, the table is not mapped into memory and is consider to be splayed.

`.Q.v` is useful when you want to ensure the trailing `/` is appended to file symbols so that the table is not mapped into memory, i.e., when the table is queries infrequently.

## `.Q.V` - Table to Dictionary

```q
.Q.V x
```

`x`:
 - Table: Dictionary of column values.
 - Partitioned table: Last partition as a dictionary.
  
## Convert Implementation

The underlying K4 implementation of `.Q.V` is

```q
k){
    $[
        qO x;
            [
                (`T!([m])):x;
                m:m x;
                m m()
            ];

        qp x:v x;
            ((,pf)!,. pf),+$[(~x in!d0[])&(x:.+x)in !*. .Q.vt;.Q.vp x;d0[]@x];
            
        0h>@*x:+0!x;
            x@'!x;
            
        x
    ]
 }
```

where `x` is the sole parameter.

The whole body of the function is a single if-else-if block. Converting each part in turn:

- Predicate 1 `qO x`:
  - `qO` refers to `.Q.qO` (was inside `.Q` namespace when defined). This function is not documented by KX but is simply 
    ```q
    k){:[x;`T!x;1b;0b]}
    ```

q).Q.qO
k){:[x;`T!x;1b;0b]}

q):[5; 10; 10; 20]
20

q):[a; b; 1; 2]
1
q)a
10
q)b
10

q)a:10
q)b:20
q):[b; a; 1; 2]
1
q)a
20
q)b
20

q)a:([] a:1 2 3; b:`a`b`c)
q):[a; `T!a; 1; 2]
2
q)`T!a
'type
  [0]  `T!a

// Will return to the case where this succeeds when covering modules

## Usage
