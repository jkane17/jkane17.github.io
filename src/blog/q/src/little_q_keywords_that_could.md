# The Little Q Keywords That Could

![The Little Q Keywords That Could Cover Image](./images/little_q_keywords_that_could.png "The Little Q Keywords That Could Cover Image")

In programming, keywords are predefined words with special meanings that form part of a language's syntax. The Q programming language is rich with keywords, many of which were introduced to improve the readability of its predecessor, K4, by "wordifying" many primitive operations. In this blog, we'll explore some of Q's lesser-known or underutilised keywords that can be quite powerful when used effectively. We'll also examine a few keywords whose usefulness might be questionable.

## `csv`

The `csv` keyword is a synonym for `","`, often used to represent a comma delimiter.

**Example Usage**

`csv` is primarily used when specifying a delimiter for preparing or saving text data:

```q
q)csv 0: ([] a:1 2 3; b:`a`b`c)
"a,b"
"1,a"
"2,b"
"3,c"

q)"," 0: ([] a:1 2 3; b:`a`b`c)
"a,b"
"1,a"
"2,b"
"3,c"
```

In the past, `csv` was particularly useful for working with comma-separated values (CSV) files. However, other delimited file formats have become popular, and it's now common to use different delimiters when preparing or saving text data:

```q
q)"|" 0: ([] a:1 2 3; b:`a`b`c)
"a|b"
"1|a"
"2|b"
"3|c"
```

Given this shift, `csv` is less useful than it once was. To maintain consistency, especially when using different delimiters, one should prefer to specify `","` explicitly.

## `dsave`

Introduced in version 3.2, `dsave` is a convenient keyword used to write global tables to disk as splayed, enumerated, indexed KDB+ tables. It simplifies the process of saving data, especially when dealing with partitions.

**Syntax**

```q
x dsave y
```

* `x` : The save path as a file symbol (atom or vector).
* `y` : One or more table names as a symbol (atom or vector).

**Example Usage**

In a fresh Q session, let's define simple `trade` and `quote` tables:

```q
q)trade:`sym xasc flip `sym`price`qty!5?/:(`3;100f;100)
q)quote:`sym xasc flip `sym`ask`bid!10?/:(distinct trade`sym;100f;100f)
```

You can save these tables to disk using `dsave`:

```q
q)`:db1 dsave `trade`quote
`trade`quote
```

The command above creates a new root directory named *db1*. Within this directory, two subdirectories, *trade* and *quote*, are created for the respective tables. Additionally, `dsave` automatically enumerates any symbol columns in the tables, resulting in the creation of a sym file under the root directory (e.g., `db1/sym`).

`dsave` will apply the *parted* attribute to the first column of the saved tables (`sym` in this case).

```q
q)\l db1 // Load db1
::

q)meta trade
c    | t f a
-----| -----
sym  | s   p
price| f    
qty  | j 

q)meta quote
c  | t f a
---| -----
sym| s   p
ask| f    
bid| f    
```

You can also save to a specific partition by providing a two-item list as the left argument. In a fresh Q session, we define the `trade` and `quote` tables as before and then save them to a partition:

```q
q)`:db2`2024.01.17 dsave `trade`quote
`trade`quote
```

**Comparison: `dsave` vs `.Q.en` & `.Q.dpft`**

While similar results can be achieved using `set` combined with `.Q.en`, or `.Q.dpft`, `dsave` offers a simpler and more direct approach.

Using `set` and `.Q.en` (fresh Q session):

```q
q)`:db3/trade/ set .Q.en[`:db3;update `p#sym from trade]
`:db3/trade/

q)`:db3/quote/ set .Q.en[`:db3;update `p#sym from quote]
`:db3/quote/
```

Using `.Q.dpft` (fresh Q session):

```q
q).Q.dpft[`:db4;2024.01.17;`sym;] each `trade`quote
`trade`quote
```

`dsave` streamlines this process by combining these steps into a single, more intuitive operation.

## `next`

The `next` keyword retrieves the next item in a list, returning null for the last item since it has no successor.

**Syntax**

```q
next x
```

* `x` : A list from which to retrieve the next items.

**Example Usage**

```q
q)next 10 20 30
20 30 0N
```

For mixed lists, the last item is an empty list of the same type as the first item:

```q
q)next (10 20 30f;"hello";`blah)
"hello"
`blah
`float$()
```

`next` is particularly useful when dealing with temporal types:

```q
q)quote:([] sym:6#`a`b; time:00:01:00.000+"j"$1e3*0 0 17 42 68 112)

q)update next[time]-time by sym from quote // Duration of a quote
sym time
----------------
a   00:00:17.000
b   00:00:42.000
a   00:00:51.000
b   00:01:10.000
a
b
```

**Implementation**

Conceptually, `next` performs the following operation:

```q
1_x,enlist x 0N
```

## `prev`

The `prev` keyword retrieves the previous item in a list, returning null for the first item since it has no predecessor.

**Syntax**

```q
prev x
```

* `x` : A list from which to retrieve the previous items.

**Example Usage**

```q
q)prev 10 20 30
0N 10 20
```

For mixed lists, the first item is an empty list of the same type as the first item in the original list:

```q
q)prev (10 20 30f;"hello";`blah)
`float$()
10 20 30f
"hello"
```

**Implementation**

`prev` is effectively doing this:

```q
(enlist x 0N),-1_x
```

## `xprev`

The `xprev` keyword allows you to access the item *x* places before the current item in a list, padding with nulls where necessary.

**Syntax**

```q
x xprev y
```

* `x` : The number of positions to look back.
* `y` : The list from which to retrieve the previous items.

**Example Usage**

```q
q)2 xprev 10 20 30 40 50
0N 0N 10 20 30
```

For mixed lists, the first *x* items are empty lists of the same type as the first item in the original list:

```q
q)2 xprev (10 20 30f;"hello";`blah;1 2 3f;101b)
`float$()
`float$()
10 20 30f
"hello"
`blah
```

**Implementation**

Conceptually, `xprev` performs the following:

```q
y (til count y)-x
```

## `rand`

The `rand` keyword is used to pick or generate a random value.

**Syntax**

```q
rand x
```

* `x` : A list (to select a random element) or a number (to generate a random number between 0 and *x*).

**Example Usage**

```q
q)rand 10 20 30 40 50
50
q)rand 1000
360
```

`rand` is a shorthand for the following:

```q
first 1?x
```

While `rand` is convenient for generating a single random item, the `?` operator should be preferred for generating larger sets:

```q
q)\ts rand each 1000000#10
626 41164880
q)\ts 1000000?10
19 8388800
```

## `reciprocal`

The `reciprocal` keyword computes the reciprocal of a number or a list of numbers.

**Syntax**

```q
reciprocal x
```

* `x` : A number or a list of numbers for which to compute the reciprocal.

**Example Usage**

```q
q)reciprocal 1 2 3 4 5
1 0.5 0.3333333 0.25 0.2
```

This operation is equivalent to applying the `%` operator with 1 as its left operand:

```q
q)1%1 2 3 4 5
1 0.5 0.3333333 0.25 0.2
```

Both forms have similar performance:

```q
q)\ts:100 reciprocal 1+til 10000000
4127 402660944

q)\ts:100 1%1+til 10000000
4070 402660384
```

While `reciprocal` is more verbose, `%` is often preferred for its succinctness and clarity.

## `rload` & `rsave` 

The `rload` and `rsave` keywords are used to load and save splayed tables from and to directories, respectively.

**Syntax**

```q
rload x
```

* `x` : The directory path (as a symbol) from which to load a splayed table.

```q
rsave x
```

* `x` : The directory path (as a symbol) to which a global table will be saved.

**Example Usage**

In a fresh Q session, define and save a splayed `trade` table:

```q
q)trade:update `sym?sym from flip `sym`price`qty!5?/:(`3;100f;100)

q)rsave `:db/trade
`:db/trade/
```

The `trade` table can be loaded using `rload`:

```q
q)delete trade from `. // remove from memory
`.

q)rload `:db/trade
`trade
```

**Comparison: `rload` & `rsave` vs `get` & `set`**

`rload` and `rsave` are less flexible than the `get` and `set` keywords, which allow specifying different target directory names.

For example, saving with a different name using `set` and loading using `get`:

```q
q)`:db/tradeOther/ set trade
`:db/tradeOther/

q)delete tradeOther from `.
`.

q)tradeOther:get `:db/tradeOther/
```

`rload` and `rsave` also require global tables, whereas `get` and `set` can work with local tables.

```q
q)f:{[] tradeLocal:update `sym?sym from flip `sym`price`qty!5?/:(`3;100f;100); rsave `:db/tradeLocal}

q)f[]
'tradeLocal
  [1]  f:{[] tradeLocal:update `sym?sym from flip `sym`price`qty!5?/:(`3;100f;100); rsave `:db/tradeLocal}
                                                                                    ^
```

```q
q)f:{[] tradeLocal:update `sym?sym from flip `sym`price`qty!5?/:(`3;100f;100); `:db/tradeLocal/ set tradeLocal}

q)f[]
`:db/tradeLocal/
```

Implicit iteration is a benefit of `rload` and `rsave`:

```q
q)t1:([] a:1 2 3; b:"abc")

q)t2:([] a:4 5 6; b:"def")

q)rsave `t1`t2
`:t1/`:t2/

q)delete t1, t2 from `.

q)rload `t1`t2
```

Explicit iteration is required with `get` and `set`:

```q
q)`:t1/`:t2/ set' (t1;t2)
`:t1/`:t2/

q)get each `:t1`:t2
+`a`b!(1 2 3;"abc")
+`a`b!(4 5 6;"def")
```

If you don’t need the extra flexibility of `get` and `set`, `rload` and `rsave` offer a simpler method for saving and loading splayed tables.
 
## `signum`

The `signum` keyword evaluates an integer value and returns:
* `-1i` for a null or negative value
* `0i` for a zero value
* `1i` for a positive value

**Syntax**

```q
signum x
```

* `x` : An integer value.

**Example Usage**

```q
q)signum -1 0 1 0N
-1 0 1 -1i
```

You can use `signum` to categorise and count price movements by their direction:

```q
q)t:([] price:10 11 9 8 8 15)

q)select ct:count i by direction:signum deltas price from t
direction| ct
---------| --
-1       | 2
0        | 1
1        | 3
```

This example demonstrates how `signum` can be used to summarise directional price changes in a dataset.

## `sublist`

The `sublist` keyword selects a subset of a list.

**Syntax**

```q
x sublist y
```

* `x` : The number of items to take from the start of the list if positive, or from the end if negative.
* `y` : The list from which to extract the sublist.

**Example Usage**

```q
q)3 sublist 10 20 30 40 50
10 20 30

q)-3 sublist 10 20 30 40 50
30 40 50
```

If the requested sublist exceeds the available items, it returns as many items as possible:

```q
q)10 sublist 10 20 30 40 50
10 20 30 40 50
```

You can also select a slice of the list:

```q
q)1 3 sublist 10 20 30 40 50
20 30 40

q)1 10 sublist 10 20 30 40 50
20 30 40 50
```

**Comparison: `sublist` vs take (`#`)**

Use `sublist` when you want to avoid exceeding the number of available items, unlike the `#` operator which always returns the requested number of items:

```q
q)10#"Hey"
"HeyHeyHeyH"

q)10 sublist "Hey"
"Hey"
```

## Conclusion

In the Q programming language, while some keywords are well-known and frequently used, there are others that, though lesser-known, offer powerful functionality that can simplify and optimise your code. From efficient data-saving methods with `dsave`, to navigating lists with `next`, `prev`, and `xprev`, and managing splayed tables with `rload` and `rsave`, these keywords may seem minor at first glance, but they can make a significant difference in your code’s clarity and maintainability.

However, not all keywords are equally valuable in every context. For instance, the `csv` keyword, a shorthand for comma-delimited text, might be less useful in modern coding practices where other delimiters are also prevalent. Similarly, while `reciprocal` provides a way to calculate the reciprocal of a number, the more concise `1%` is usually preferred for its brevity and clarity.

Understanding and utilising these underappreciated keywords not only enhances your proficiency in Q but also opens up new possibilities for writing more readable, efficient, and maintainable code. So, the next time you’re coding in Q, consider reaching for these keywords – they might just become your new favourites.
