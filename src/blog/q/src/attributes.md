# KDB+ Attributes

![Cover Image](./images/attributes.png "Cover Image")

KDB+ provides four attributes — *sorted*, *unique*, *parted*, and *grouped* — that can be applied to lists and table columns to significantly enhance query performance. However, understanding when these attributes are preserved, lost, or best applied can be subtle and often overlooked. This blog explores how these attributes behave under common operations, where they are most effectively used, and some special behaviours — particularly of the *sorted* attribute. Whether you’re optimising an RDB or HDB, mastering attribute behaviour is key to writing efficient, high-performance KDB+ code.

## What is an Attribute?

In KDB+, an attribute is a form of metadata that can be applied to a list (also dictionaries and tables for *sorted*), provided the list has a structure compatible with that attribute. This metadata instructs the Q interpreter to apply certain optimisations when processing the list, potentially leading to significant performance improvements in queries and operations.

However, attributes come with trade-offs. Maintaining attribute integrity ([attribute preservation](#attribute-preservation)) can add complexity to your code. Additionally, attributes can introduce performance overhead, both in terms of memory usage and execution time. For a deeper exploration of performance implications, see my other blog post [Performance Costs of KDB+ Attributes](./attr_perf_costs.md).

## The Four Attributes

KDB+ provides four attributes that can be applied to lists to enable specific performance optimisations:

| Attribute | Code | Required Structure | Optimisation |
| - | - | - | - |
| *Sorted* | s | List must be sorted in ascending order. | Enables the use of binary search instead of linear search, improving search performance. |
| *Unique* | u | List must contain only unique values. | Builds a hash table that maps each unique element to its index in the list. |
| *Parted* | p | List must be sorted into contiguous blocks of identical elements. | Builds a hash table mapping each unique element to the index of the first element in its group. |
| *Grouped* | g | No structural requirement. | Builds a hash table mapping each unique element to the list of indexes where it occurs. |

### Example: Sorted Searching

To illustrate how different search algorithms operate, let’s search for (the first occurrence of) the number 7 in a sorted list of numbers from 1 to 10.

[Linear search](https://en.wikipedia.org/wiki/Linear_search) sequentially examines each element until a match is found (or the end of the list is reached).

    1 2 3 4 5 6 7 8 9 10
    ^                      // 1 ≠ 7

    1 2 3 4 5 6 7 8 9 10
    ^                      // 2 ≠ 7

    1 2 3 4 5 6 7 8 9 10
        ^                  // 3 ≠ 7

    1 2 3 4 5 6 7 8 9 10
        ^                  // 4 ≠ 7

    1 2 3 4 5 6 7 8 9 10
            ^              // 5 ≠ 7

    1 2 3 4 5 6 7 8 9 10
            ^              // 6 ≠ 7

    1 2 3 4 5 6 7 8 9 10
                ^          // 7 = 7 → Found at index 6

    // Result: Item found after checking 7 elements

[Binary search](https://en.wikipedia.org/wiki/Binary_search) uses a divide-and-conquer approach and only works on sorted data.

    1 2 3 4 5 6 7 8 9 10
            ^              // Midpoint: 5 < 7 → Search right half

    6 7 8 9 10
        ^                  // Midpoint: 8 > 7 → Search left half

    6 7
    ^                      // Midpoint: 6 < 7 → Search right

    7
    ^                      // 7 = 7 → Found at index 6

    // Result: Item found after checking only 4 elements

### Example: Unique Hash Table

The following example shows the internal hash table Q creates when the *unique* attribute is applied:

```q
q)mylist:`u#`a`b`c`z`y`x

// Resulting hash table:
a | 0
b | 1
c | 2
z | 3
y | 4
x | 5
```

### Example: Parted Hash Table

Here’s what Q generates when the *parted* attribute is applied:

```q
q)mylist:`p#`a`a`a`b`b`b`c`z`z`z`z`z`y`x`x

// Resulting hash table:
a | 0
b | 3
c | 6
z | 7
y | 12
x | 13
```

### Example: Grouped Hash Table

Finally, this example illustrates the hash table built by Q when the *grouped* attribute is used:

```q
q)mylist:`g#`a`a`b`c`z`a`z`y`x`x`c`y

// Resulting hash table:
a | 0 1 5
b | 2
c | 3 10
z | 4 6
y | 7 11
x | 8 9
```

## Attribute Operations

There are three primary operations related to attributes in KDB+: **applying**, **removing**, and **checking** attributes on a list.

### Applying

Attributes are applied using the `#` operator:

```q
x#y
```

Where:

- *x* is the attribute code as a symbol (`` `s, `u, `p, or `g ``).
- *y* is the list to apply the attribute to.

#### Object Copying

When an attribute is applied to a list, it creates a copy of the original list with the attribute applied. We can confirm this behaviour by inspecting the reference count of the object using the internal function `-16!`, which reveals how many references point to the same memory location.

```q
q)show n:til 10
0 1 2 3 4 5 6 7 8 9
q)m:n
// Both m and n point to the same object in memory
q)-16!m
2i
q)-16!n
2i
```

Now apply an attribute (e.g., *unique*) to *n*:

```q
q)show n:til 10
0 1 2 3 4 5 6 7 8 9
q)show m:`u#n
`u#0 1 2 3 4 5 6 7 8 9

// m and n now reference separate objects
q)-16!n
1i
q)-16!m
1i
```

#### Exception: Sorted Attribute Applied In-Place

Unlike the other attributes, the *sorted* attribute is applied in-place, i.e., it modifies the original object even without reassignment.

```q
q)n:til 10
q)`s#n
`s#0 1 2 3 4 5 6 7 8 9

// Despite no reassignment, the attribute is applied to n
q)n
`s#0 1 2 3 4 5 6 7 8 9
```

This behaviour remains even when assigned to another variable:

```q
q)n:til 10
q)show m:`s#n
`s#0 1 2 3 4 5 6 7 8 9
q)n
`s#0 1 2 3 4 5 6 7 8 9

// m and n reference separate objects
q)-16!n
1i
q)-16!m
1i
```

#### Other Attributes Require Reassignment

For all other attributes (*unique*, *grouped*, *parted*), reassignment is necessary to retain the attribute:

```q
q)n:til 10
q)`u#n
`u#0 1 2 3 4 5 6 7 8 9

// The attribute is not preserved unless reassigned
q)n
0 1 2 3 4 5 6 7 8 9
q)n:`u#n
q)n
`u#0 1 2 3 4 5 6 7 8 9
```

#### List Structure Verification

When applying the *sorted*, *unique*, or *parted* attributes, Q verifies that the list meets the required structure. If not, an error is raised:

```q
q)`s#4 2 5 1 3
's-fail
  [0]  `s#4 2 5 1 3
         ^

q)`u#1 2 1 2 1
'u-fail
  [0]  `u#1 2 1 2 1
         ^

// For `p, Q also throws a 'u-fail if the list is not properly parted
q)`p#1 2 1 2 1
'u-fail
  [0]  `p#1 2 1 2 1
         ^
```

As a convenience, applying asc to a list will automatically assign the *sorted* attribute:

```q
q)show n:10?100
93 54 38 97 88 58 68 45 2 39
q)asc n
`s#2 38 39 45 54 58 68 88 93 97
```

### Removing

To remove an attribute, use the null symbol `` ` `` as the left argument to the `#` operator:

```q
`#y
```

Where *y* is the list from which the attribute should be removed.

```q
q)show n:`u#til 10
`u#0 1 2 3 4 5 6 7 8 9
q)show n:`#n
0 1 2 3 4 5 6 7 8 9
```

### Checking

You can check the current attribute applied to a list using the `attr` keyword:

```q
q)show n:`u#til 10
`u#0 1 2 3 4 5 6 7 8 9
q)attr n
`u
```

If no attribute is applied, the result is the null symbol `` ` ``.

```q
q)show n:til 10
0 1 2 3 4 5 6 7 8 9
q)attr n
`
```

## Table Attributes

Most operations in KDB+ involve working with tables. Attributes are most commonly applied to table columns, and the principles for applying, removing, and checking attributes are the same as for standalone lists.

### Applying

Attributes can be applied to table columns either:
* At the time of table creation, or
* After the table is created, using an `update` statement or direct column assignment.

#### Apply on creation

```q
// Apply the unique attribute to col1 when creating the table
q)show t:([] col1:`u#til 5; col2:`a`b`c`d`e)
col1 col2
---------
0    a
1    b
2    c
3    d
4    e
q)attr t`col1
`u
```

#### Apply using `update`

```q
// Create table without attributes, then apply unique to col1
q)t:([] col1:til 5; col2:`a`b`c`d`e)
q)attr t`col1
`
q)update `u#col1 from `t
`t
q)attr t`col1
`u
```

#### Apply using column assignment

```q
// Apply attribute via direct column assignment
q)t:([] col1:til 5; col2:`a`b`c`d`e)
q)attr t`col1
`
q)t[`col1]:`u#t`col1
q)attr t`col1
`u
```

### Removing

Attributes can be removed from a table column using `` `# `` along with either an `update` statement or a column assignment.

#### Removing using `update`

```q
q)t:([] col1:`u#til 5; col2:`a`b`c`d`e)
q)attr t`col1
`u
q)update `#col1 from `t
`t
q)attr t`col1
`
```

#### Removing using column assignment

```q
q)t:([] col1:`u#til 5; col2:`a`b`c`d`e)
q)attr t`col1
`u
q)t[`col1]:`#t`col1
q)attr t`col1
`
```

### Checking

You can use the `attr` keyword to inspect the attribute of an individual column:

```q
q)t:([] col1:`u#til 5; col2:`a`b`c`d`e)
q)attr t`col1
`u
```

To view all column attributes at once, use the `meta` keyword. The `"a"` field in the metadata output indicates any attribute applied to each column:

```q
q)meta t
c   | t f a
----| -----
col1| j   u
col2| s
```

## Attribute Preservation

Preserving an attribute on a list can be tricky — many operations will strip an attribute, even if the structure appears unchanged. It’s important to understand which operations preserve attributes and which cause them to be lost.

### Append Operations

Append operations will **preserve attributes** (except *parted*) as long as the required structure is maintained.

#### Sorted (s) Attribute

```q
// Sorted preserved: elements appended in order
q)show n:`s#til 10
`s#0 1 2 3 4 5 6 7 8 9
q)show n,:10 11 12
`s#0 1 2 3 4 5 6 7 8 9 10 11 12

// Using upsert, sorted still preserved
q)n:`s#til 10
q)show n:n upsert 10 11 12
`s#0 1 2 3 4 5 6 7 8 9 10 11 12

// Appending unsorted data causes attribute to be lost
q)n:`s#til 10
q)show n,:12 11 10
0 1 2 3 4 5 6 7 8 9 12 11 10
```

Table append behaves the same

```q
q)show t:([] col1:`s#til 5; col2:`a`b`c`d`e)
col1 col2
---------
0    a
1    b
2    c
3    d
4    e
q)meta t,:([] col1:5 6 7; col2:`x`y`z)   // Sorted preserved
c   | t f a
----| -----
col1| j   s
col2| s
q)meta t upsert flip (5 6 7;`x`y`z)      // Sorted preserved
c   | t f a
----| -----
col1| j   s
col2| s
q)meta t upsert flip (7 6 5;`x`y`z)      // Sorted lost
c   | t f a
----| -----
col1| j
col2| s
```

#### Unique (u) Attribute

```q
// Unique preserved: no duplicates added
q)show n:`u#til 10
`u#0 1 2 3 4 5 6 7 8 9
q)show n,:10 11 12
`u#0 1 2 3 4 5 6 7 8 9 10 11 12

// Unique lost: duplicates introduced
q)n:`u#til 10
q)show n,:7 8 9
0 1 2 3 4 5 6 7 8 9 7 8 9
```

#### Grouped (g) Attribute

```q
// Grouped is always preserved when appending
q)show n:`g#til 10
`g#0 1 2 3 4 5 6 7 8 9
q)show n,:til 10
`g#0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9
```

### Comma Join (,) Operation

A standard comma join (without assignment) creates a new list, losing any attribute.

```q
q)show n:`s#til 10
`s#0 1 2 3 4 5 6 7 8 9
q)show n:n,10 11 12
0 1 2 3 4 5 6 7 8 9 10 11 12

// Even grouped is lost
q)show n:`g#til 10
`g#0 1 2 3 4 5 6 7 8 9
q)show n:n,10 11 12
0 1 2 3 4 5 6 7 8 9 10 11 12

// Tables also lose attributes on comma join
q)meta t:([] col1:`s#til 5; col2:`a`b`c`d`e)
c   | t f a
----| -----
col1| j   s
col2| s
q)meta t,([] col1:5 6 7; col2:`x`y`z)
c   | t f a
----| -----
col1| j
col2| s
```

### Parted (p) Attribute and Append

The *parted* attribute is only preserved when:

* Both lists are parted.
* Their group values are disjoint (except in a [special case](#special-case-shared-edge-group)).

```q
// Valid parted append: disjoint values, both parted
q)x:`p#1 1 1 2 2 3 4 4 4 4
q)y:`p#5 6 7 7
q)show z:x,y
`p#1 1 1 2 2 3 4 4 4 4 5 6 7 7

// Comma assign does not preserve parted
q)show x,:y
1 1 1 2 2 3 4 4 4 4 5 6 7 7

// y not parted → attribute lost
q)x:`p#1 1 1 2 2 3 4 4 4 4
q)y:5 6 7 7
q)show z:x,y
1 1 1 2 2 3 4 4 4 4 5 6 7 7

// Not disjoint → attribute lost
q)x:`p#1 1 1 2 2 3 4 4 4 4
q)y:`p#1 1 2
q)show z:x,y
1 1 1 2 2 3 4 4 4 4 1 1 2
```

#### Special Case: Shared edge group

If the last group in *x* is the same as the first group in *y*, and all other groups are disjoint, the attribute is preserved.

```q
// Special case: last of x = first of y
q)x:`p#1 1 1 2 2 3 4 4 4 4
q)y:`p#4 4 5 5 6
q)show z:x,y
`p#1 1 1 2 2 3 4 4 4 4 4 4 5 5 6

// Not valid: disjoint condition violated
q)x:`p#1 1 1 2 2 3 4 4 4 4
q)y:`p#6 5 5 4 4
q)show z:x,y
1 1 1 2 2 3 4 4 4 4 6 5 5 4 4
```

### Modification Operations

Any operation that modifies elements in a list (e.g., addition, replacement, deletion) results in a new list with no attribute.

```q
q)show n:`s#til 10
`s#0 1 2 3 4 5 6 7 8 9

// Sorted lost
q)show m:n+1
1 2 3 4 5 6 7 8 9 10

// Even assigning back to n loses the attribute
q)show n+:1
1 2 3 4 5 6 7 8 9 10

// Replacement loses attribute
q)n:`s#5 10 15 20 25
q)n[2]:16
q)n
5 10 16 20 25

// Deletion loses attribute
q)n:`s#til 10
q)show n:-1_n
0 1 2 3 4 5 6 7 8

// Same behaviour applies to unique, parted, grouped
q)n:`u#til 10; show n+:1
q)n:`p#til 10; show n+:1
q)n:`g#til 10; show n+:1
```

#### Table Modifications

Updating a table also removes column attributes:

```q
q)meta t:([] col1:`s#til 5; col2:`a`b`c`d`e)
c   | t f a
----| -----
col1| j   s
col2| s
q)meta update col1+1 from t
c   | t f a
----| -----
col1| j
col2| s
```

## When and Where to Use Attributes

Attributes are most commonly applied to table columns that are frequently queried. Choosing the right attribute depends on both:

* The structure of the data in the column (since attributes, except *grouped*, require specific ordering or uniqueness), and
* The cost and complexity of preserving that attribute across updates or transformations.

The table below summarises typical use cases for each attribute in KDB+:

| Attribute | Where to Apply |
| - | - |
| *Sorted* | On temporal columns (e.g., timestamps) where values naturally arrive in ascending order. |
| *Unique* | On columns containing unique identifiers or primary keys. |
| *Parted* | On symbol columns in a historical database (HDB) where values are fixed after initial writedown (e.g., `sym` in tick data). |
| *Grouped* | On frequently queried columns whose values are often repeated but lack a predictable structure (common in RDBs). |

Attribute application should be based on your specific workload and data patterns. While attributes can offer substantial performance improvements, they come with maintenance trade-offs. Always test attribute use in your environment to verify their effectiveness before applying them broadly.

## Attribute Interaction in Queries

Only the first column with an attribute referenced in a where clause benefits from the attribute. Subsequent filters operate on a derived sub-table, where attributes are no longer available.

```q
q)meta t:([] col1:`s#til 5; col2:`u#`a`b`c`d`e)
c   | t f a
----| -----
col1| j   s
col2| s   u
// Only 'col1>2' benefits from an attribute
q)select from t where col1>2, col2 in `d`e
col1 col2
---------
3    d
4    e
```

In this example:

* `col1>2` benefits from the *sorted* attribute for efficient filtering.
* `` col2 in `d`e `` does not leverage the *unique* attribute, since it's applied on a sub-table.

## Special Applications of Sorted

The *sorted* attribute is unique among KDB+ attributes because it can be applied not only to lists (like all attributes) but also directly to dictionaries, tables, and keyed tables.

### Step Functions

Applying the *sorted* attribute to a dictionary transforms it into a step function. In this context, KDB+ will return the value associated with the largest key less than or equal to the query value:

```q
q)show d:`s#10 20 30 40 50!`a`b`c`d`e
10| a
20| b
30| c
40| d
50| e
q)attr d
`s
// Attribute is visible on the key
q)key d
`s#10 20 30 40 50

q)d 10
`a
q)d 19
`a
q)d 20
`b
q)d 10000
`e

// Null since no key <= 5
q)d 5
`
```

Note that the key of the dictionary must be in sorted order:

```q
q)`s#20 10 30 40 50!`a`b`c`d`e
's-fail
  [0]  `s#20 10 30 40 50!`a`b`c`d`e
         ^
```

A step function behaves similarly to the `bin` keyword, except it returns an index rather than a key:

```q
q)10 20 30 40 50 bin 10
0
q)10 20 30 40 50 bin 19
0
q)10 20 30 40 50 bin 20
1
q)10 20 30 40 50 bin 10000
4
// -1 since no value <= 5
q)10 20 30 40 50 bin 5
-1
```

> [!NOTE]
> * The *sorted* attribute must be applied to the entire dictionary.
> * Applying it to just the key list does not create a step function:
>```q
>// Not a step function – just a dictionary with a sorted key
>q)d:(`s#10 20 30 40 50)!`a`b`c`d`e
>q)attr d
>`
>q)attr key d
>`s
>q)d 19
>`
>```

### Tables and Keyed Tables

The behaviour of the *sorted* attribute differs depending on whether it’s applied to a simple table or a keyed table:

#### Simple Tables

When *sorted* is applied to a non-keyed (simple) table, it implicitly applies the *parted* attribute to the first column only:

```q
q)meta t:([] col1:til 5; col2:`a`b`c`d`e)
c   | t f a
----| -----
col1| j
col2| s
q)meta `s#t
c   | t f a
----| -----
col1| j   p
col2| s
```

#### Keyed Tables

For keyed tables:

* If there is only one key column, *sorted* is applied directly to that key column.
* If there are multiple key columns, only the first receives the *parted* attribute.

```q
// Single-keyed table: sorted applies to the key column
q)meta t:([col1:til 5] col2:`a`b`c`d`e)
c   | t f a
----| -----
col1| j
col2| s
q)meta `s#t
c   | t f a
----| -----
col1| j   s
col2| s

// Multi-keyed table: parted applied to the first key only
q)meta t:([col1:til 5;col2:`a`b`c`d`e;col3:"abcde"] col4:1 2 3 4 5f)
c   | t f a
----| -----
col1| j
col2| s
col3| c
col4| f
q)meta `s#t
c   | t f a
----| -----
col1| j   p
col2| s
col3| c
col4| f
```

## Conclusion

Understanding where and how to apply attributes in KDB+ is essential for optimising query performance, especially when working with large datasets. Each attribute — *sorted*, *unique*, *parted*, and *grouped* — has specific use cases and constraints based on the structure of your data. While this blog focused on where attributes are most effectively applied and the special behaviour of the *sorted* attribute across different structures, it’s important to test and benchmark attribute usage in your specific environment for best results.

For an in-depth look at the performance impact of these attributes, including benchmarks and practical query comparisons, please refer to my follow-up blog on [Performance Benefits of KDB+ Attributes](./attr_perf_benefits.md).
