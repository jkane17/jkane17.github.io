# C Interface for Q - Part 2

![Cover Image](./images/c_interface.jpeg "Cover Image")

In [Part 1](https://jkane17.github.io/blog/q/c_interface_part_1.html), we looked at the Q object (`QObj`) and at the simplest values it can hold: atoms, and lists of plain C values such as longs or chars. Each of those values was self-contained, with all of its data stored inside a single object.

However, real data can have a more complex structure. A list of strings is a list of lists, a dictionary pairs a list of keys with a list of values, and a table is a set of named columns. In C, each of these is a Q object that holds pointers to other Q objects. In this part, we look at how to create and read them: mixed lists, dictionaries, tables, and keyed tables.

Putting objects inside other objects raises two questions that did not come up in Part 1:

- **Ownership.** Once an object has been placed inside another, which code is responsible for releasing it?
- **Errors.** Creation functions now have arguments that can be wrong, for example keys and values of different lengths. When a function fails, how do we find out why?

We answer both along the way, starting with mixed lists.

The examples are built in the same way as in Part 1 (see [Building the Examples](https://jkane17.github.io/blog/q/c_interface_part_1.html#building-the-examples)).

## Recap

In [Part 1](https://jkane17.github.io/blog/q/c_interface_part_1.html), we saw that:

- Every Q value is a `QObj`: a 16-byte object made up of an 8-byte header holding the value's `type`, `attr`, and reference count (`refs`), and an 8-byte union holding either an atom's value or a list's `length` and data.
- The `type` field is negative for an atom and positive for a list, for example `-7` for a long atom and `7` for a long list.
- Atoms and lists are created with the `qNew` functions and read with the `qGet` functions, for example `qNewLongList` and `qGetLongAtIndex`.
- `qNewList` allocates a list of a given type and length whose elements we fill in ourselves.
- A newly created object has `refs == 0`, and we release it with `qDecRef` when we have finished with it.

## Mixed Lists

A mixed list is a list whose items can be of different types. Its type is `0` (`Q_TYPE_MIXED`), and each item is a pointer to another `QObj`, which can be an atom, a list, or anything else.

A mixed list is created with `qNewMixedList`:

```c
QObj *qNewMixedList(QSize length, ...);
```

`length` is the number of items, and `...` is replaced with that many `QObj` pointers.

Because `qNewMixedList` is variadic, nothing checks that `length` matches the number of arguments, or that each argument is a `QObj *`. Passing the wrong number of arguments is undefined behaviour.

### Ownership

`qNewMixedList` is the first function we have seen that takes Q objects as arguments, so it is a good place to look at ownership. The mixed list **takes ownership** of its items: the references you held are handed over to the list. This means:

- You release only the list. `qDecRef(mixedList)` releases every item in it.
- You must not also call `qDecRef` on the items, as that would release them twice.
- If you want to keep using an item after the list has been released, call `qIncRef` on it before creating the list.

If any item is `NULL`, `qNewMixedList` returns `NULL` (a `domain` error) and releases the other items. A `NULL` item usually means an earlier creation call failed, which is easy to miss when creation calls are nested inside the argument list.

> Note: There is one exception. If `length` is greater than `INT32_MAX`, `qNewMixedList` returns a `domain` error without reading any of its arguments, so it does not release them, and you must release them yourself. This only happens if `length` is wrong, for example a negative number converted to the unsigned `QSize`, because no call can pass that many arguments.

### Access

To access the item at a given index, use `qGetMixedAtIndex`:

```c
QObj *qGetMixedAtIndex(const QObj *obj, QSize index);
```

Because a mixed list holds objects of different types, `qGetMixedAtIndex` returns a pointer to the item's `QObj` rather than a value. The pointer is **borrowed**: it points to an object owned by the list, so you must not release it, and it is only valid while the list is.

From there, if you know the item's type, you can read its value with the matching accessor. For example, to read the first item of a mixed list as a symbol, we write:

```c
qGetSymbol(qGetMixedAtIndex(mixedList, 0))
```

If you do not know the type of the item at a given index, check it first, either by inspecting `obj->type` or (better) by using one of the type check functions described [below](#type-check-functions).

### Example

Create a mixed list consisting of 3 items:

1. A symbol `` `abc``
2. A long `10`
3. A char list `"xyz"`

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    QObj *symbol = qNewSymbol("abc");
    QObj *long_ = qNewLong(10);
    QObj *chars = qNewCharListFromString("xyz");

    // The mixed list takes ownership of symbol, long_, and chars
    QObj *mixedList = qNewMixedList(3, symbol, long_, chars);

    printf("Type = %d\n", mixedList->type);
    printf("Length = %" PRIu64 "\n\n", mixedList->length);

    printf("mixedList[0] = %s\n", qGetSymbol(qGetMixedAtIndex(mixedList, 0)));
    printf("mixedList[1] = %" PRId64 "\n", qGetLong(qGetMixedAtIndex(mixedList, 1)));

    QObj *charList = qGetMixedAtIndex(mixedList, 2); // borrowed: do not release
    printf("mixedList[2] = %.*s\n", (int)charList->length, (char *)charList->list);

    // Releases the list and its three items
    qDecRef(mixedList);
    return 0;
}
```

Output:

```
Type = 0
Length = 3

mixedList[0] = abc
mixedList[1] = 10
mixedList[2] = xyz
```

Only `mixedList` is released. Releasing it also releases the symbol, the long, and the char list.

The char list is printed with `%.*s` rather than `%s` because a char list is not null-terminated. Its `length` is passed as the precision, so `printf` reads exactly that many characters from `list`. We use the same pattern for char lists throughout this part.

### Lists of Lists

A list whose items are lists is also a mixed list. The most common example is a list of strings: in Q, `("alpha";"beta";"gamma")` is a mixed list of `char` lists.

When the number of items is only known at run time, a variadic call cannot be used. Instead, allocate a mixed list with `qNewList` (see [List Allocation in Part 1](https://jkane17.github.io/blog/q/c_interface_part_1.html#list-allocation)) and fill in the `QObj *` slots yourself. As with `qNewMixedList`, the list owns the items stored in it:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    const QChar *words[] = {"alpha", "beta", "gamma"};
    QSize count = sizeof(words) / sizeof(words[0]);

    QObj *strings = qNewList(Q_TYPE_MIXED, count);
    QObj **items = (QObj **)strings->list;
    for (QSize i = 0; i < count; i++) {
        items[i] = qNewCharListFromString(words[i]); // the list owns each item
    }

    printf("Type = %d\n", strings->type);
    for (QSize i = 0; i < strings->length; i++) {
        QObj *item = qGetMixedAtIndex(strings, i);
        printf("strings[%" PRIu64 "] = %.*s\n", i, (int)item->length, (char *)item->list);
    }

    qDecRef(strings);
    return 0;
}
```

Output:

```
Type = 0
strings[0] = alpha
strings[1] = beta
strings[2] = gamma
```

As with any list from `qNewList`, every slot must be set before the list is used. In real code, also check each item for `NULL` before storing it.

### Uniform Items Are Not Collapsed

A mixed list stays a mixed list even if all of its items have the same type. For example:

```c
QObj *list = qNewMixedList(3, qNewLong(1), qNewLong(2), qNewLong(3));
```

creates a list of type `0` containing three long atoms, not a long list of type `7`. In Q, by contrast, `(1;2;3)` is a long list. Calling `qGetLongAtIndex` on this list fails an assert (in a release build with `NDEBUG`, it reads garbage).

When you know the items up front, the simplest fix is to create the typed list directly with `qNewLongList`. When you don't, for example because the items came from elsewhere, `qCollapseMixedList` collapses a mixed list into a simple list (if possible):

```c
QObj *qCollapseMixedList(QObj *obj);
```

> Note: The underlying function used in `qCollapseMixedList`, `vk`, is only provided by the Q executable, not by KX's standalone C API library (such as `c.o`). `qCollapseMixedList` can therefore only be used in code that runs inside a Q process, such as a shared library loaded with `2:`.

If every item is an atom of the same type, it returns a new simple list of that type and releases `obj`. Otherwise, it returns `obj` unchanged. This includes an empty list, items of different types, and items that are themselves lists, such as a list of strings. Either way it takes ownership of `obj`, so always carry on with the returned pointer:

```c
list = qCollapseMixedList(list); // list is now a long list (type 7)
```

`qCollapseMixedList` can also turn a list of dictionaries into a table, which we will see in [Tables](#tables).

### `qNewMixedListVar`

`qNewMixedListVar` is the `va_list` form of `qNewMixedList`:

```c
QObj *qNewMixedListVar(QSize length, va_list args);
```

It is intended for writing your own variadic functions that forward their arguments to create a mixed list. Ownership and errors work as for `qNewMixedList`. The caller still owns `args` and must call `va_end` on it.

## Dictionaries

A dictionary maps a list of keys to a list of values of the same length. The keys are usually a simple list, such as a symbol list. The values can be any list, including a mixed list when they have different types. Keys and values can also be tables, which is how keyed tables are built (see [Keyed Tables](#keyed-tables)).

A dictionary is created using `qNewDict`:

```c
QObj *qNewDict(QObj *keys, QObj *values);
```

`keys` and `values` are pointers to `QObj`s containing the keys and the values respectively.

Like `qNewMixedList`, `qNewDict` **takes ownership** of its arguments: releasing the dictionary releases its keys and values too. It does so even when it fails, so after calling `qNewDict` you must not release `keys` or `values` yourself.

Given a `QObj` containing a dictionary, we can get the number of key-value pairs using `qGetDictCount` (or the generic `qGetCount`, which works on any object). We can also get the keys and the values using `qGetDictKeys` and `qGetDictValues`. These return **borrowed** pointers into the dictionary, so, as with `qGetMixedAtIndex`, they must not be released and are only valid while the dictionary is.

### Example

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    QSymbol symbols[] = {"abc", "def", "ghi"};
    QObj *keys = qNewSymbolList(symbols, 3);

    QLong longs[] = {10, 20, 30};
    QObj *values = qNewLongList(longs, 3);

    // The dictionary takes ownership of keys and values
    QObj *dict = qNewDict(keys, values);

    printf("Type = %d\n", dict->type);
    printf("Length = %" PRIu64 "\n", dict->length);
    printf("Count = %" PRIu64 "\n\n", qGetDictCount(dict));

    // Borrowed pointers: do not release
    QObj *dictKeys = qGetDictKeys(dict);
    QObj *dictValues = qGetDictValues(dict);
    for (QSize i = 0; i < qGetDictCount(dict); i++) {
        printf("%s | %" PRId64 "\n", qGetSymbolAtIndex(dictKeys, i),
               qGetLongAtIndex(dictValues, i));
    }

    // Releases the dictionary, its keys, and its values
    qDecRef(dict);
    return 0;
}
```

Output:

```
Type = 99
Length = 2
Count = 3

abc | 10
def | 20
ghi | 30
```

The dictionary's `length` is `2`, not `3`. A dictionary is a type-`99` object whose list data holds exactly two `QObj` pointers, the keys and the values, laid out just like a two-item mixed list. This is why `qGetDictKeys` and `qGetDictValues` simply return the first and second pointers. The number of key-value pairs is the count of the keys, which is what `qGetDictCount` returns.

### Values of Different Types

When the values have different types, store them in a mixed list. This dictionary is the C equivalent of `` `name`age!("Bob";42) `` in Q:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    QSymbol symbols[] = {"name", "age"};
    QObj *keys = qNewSymbolList(symbols, 2);
    QObj *values = qNewMixedList(2, qNewCharListFromString("Bob"), qNewLong(42));

    QObj *person = qNewDict(keys, values);

    QObj *personValues = qGetDictValues(person);
    QObj *name = qGetMixedAtIndex(personValues, 0);
    QObj *age = qGetMixedAtIndex(personValues, 1);

    printf("Values type = %d\n", personValues->type);
    printf("name = %.*s\n", (int)name->length, (char *)name->list);
    printf("age = %" PRId64 "\n", qGetLong(age));

    qDecRef(person);
    return 0;
}
```

Output:

```
Values type = 0
name = Bob
age = 42
```

### Errors

`qNewDict` checks its arguments and returns `NULL` on failure:

| Error    | Cause                                                                        |
| -------- | ---------------------------------------------------------------------------- |
| `domain` | `keys` or `values` is `NULL`                                                 |
| `type`   | `keys` or `values` is an atom or a function, not a list, table or dictionary |
| `length` | `keys` and `values` have different counts                                    |

A `NULL` return tells us that something failed, but not what. To find out, call `qCheckError` immediately after the failing call. It returns an error object (type `-128`) holding the message, which `qGetError` reads. The error object is ours to release:

```c
#include <stdio.h>
#include "q.h"

int main(void) {
    QChar chars[] = {'a', 'b', 'c'};
    QObj *keys = qNewCharList(chars, 3);

    QInt ints[] = {10, 20};
    QObj *values = qNewIntList(ints, 2);

    // On failure, qNewDict returns NULL and has already released keys and values
    QObj *dict = qNewDict(keys, values);
    if (!dict) {
        QObj *error = qCheckError(dict);
        printf("error: %s\n", qGetError(error));
        qDecRef(error);
        return 0;
    }

    qDecRef(dict);
    return 0;
}
```

Output:

```
error: length
```

Note that `qNewDict` does not check that the keys are unique. Q allows duplicate keys, and a lookup finds the first match.

## Tables

A table is a set of named columns of the same length. It is created from a header (a symbol list of column names) and one column per name, using `qNewTable`:

```c
QObj *table = qNewTable(header, column0, column1, ...);
```

`qNewTable` is not a function but a macro (in C++, a function template). It counts its column arguments at compile time and passes them, with the count, to `qNewTableFromArray`. Unlike `qNewMixedList`, you don't pass a count, so the count can't be wrong: if the number of columns does not match the number of column names, `qNewTable` returns a `length` error rather than causing undefined behaviour.

`qNewTable` **takes ownership** of the header and every column, even when it fails. Releasing the table releases everything in it.

### Layout

This is where the `nested` pointer from [The Q Object in Part 1](https://jkane17.github.io/blog/q/c_interface_part_1.html#the-q-object-qobj) is used. A table is a type-`98` object whose `nested` pointer points to a dictionary. That dictionary's keys are the column names, and its values are a mixed list with one item per column:

```text
table (type 98)
  nested ──> dictionary (type 99)
               keys:   `col0`col1              (symbol list)
               values: (col0 list; col1 list)  (mixed list)
```

`qGetTableHeader` and `qGetTableColumns` return that dictionary's keys and values. Both are **borrowed** pointers. Because the columns are held in a mixed list, each column is read with `qGetMixedAtIndex`. `qGetTableColumnCount` and `qGetTableRowCount` return the number of columns and rows respectively.

Tables are stored by column, not by row. There is no row accessor: to read a row, index into each column.

### Example

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

static QObj *makeTable(void) {
    QSymbol symbols[] = {"col0", "col1"};
    QObj *header = qNewSymbolList(symbols, 2);

    QLong longs[] = {1, 2, 3};
    QObj *col0 = qNewLongList(longs, 3);

    QChar chars[] = {'a', 'b', 'c'};
    QObj *col1 = qNewCharList(chars, 3);

    // The table takes ownership of header, col0, and col1
    return qNewTable(header, col0, col1);
}

static void printTable(const QObj *table) {
    // Borrowed pointers: do not release
    QObj *header = qGetTableHeader(table);
    QObj *columns = qGetTableColumns(table);

    for (QSize i = 0; i < header->length; i++)
        printf("%s ", qGetSymbolAtIndex(header, i));
    printf("\n---------\n");

    QObj *col0 = qGetMixedAtIndex(columns, 0);
    QObj *col1 = qGetMixedAtIndex(columns, 1);

    // Tables are stored by column, so a row is read by indexing each column
    for (QSize row = 0; row < qGetTableRowCount(table); row++) {
        printf("%" PRId64 "    ", qGetLongAtIndex(col0, row));
        printf("%c\n", qGetCharAtIndex(col1, row));
    }
}

int main(void) {
    QObj *table = makeTable();

    printf("Type = %d\n", table->type);
    printf("Column count = %" PRIu64 "\n", qGetTableColumnCount(table));
    printf("Row count = %" PRIu64 "\n\n", qGetTableRowCount(table));

    printTable(table);

    // Releases the table and everything in it
    qDecRef(table);
    return 0;
}
```

Output:

```
Type = 98
Column count = 2
Row count = 3

col0 col1
---------
1    a
2    b
3    c
```

### Building a Table at Run Time

`qNewTable` needs the columns written out in the call. When the number of columns is only known at run time, use `qNewTableFromArray`, which takes a C array of columns and its length:

```c
QObj *qNewTableFromArray(QObj *header, QObj *const *columns, QSize count);
```

It takes ownership of the header and of each column, but not of the array itself, which stays yours:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    QSymbol names[] = {"x", "x2", "x3"};
    QSize columnCount = sizeof(names) / sizeof(names[0]);
    QSize rowCount = 4;

    // Build each column in turn: column c holds row + 1 raised to the power c + 1
    QObj *columns[sizeof(names) / sizeof(names[0])];
    for (QSize c = 0; c < columnCount; c++) {
        columns[c] = qNewList(Q_TYPE_LONG, rowCount);
        QLong *values = (QLong *)columns[c]->list;
        for (QSize row = 0; row < rowCount; row++) {
            QLong value = 1;
            for (QSize p = 0; p <= c; p++)
                value *= (QLong)(row + 1);
            values[row] = value;
        }
    }

    // Takes ownership of the header and each column, but not of the columns array itself
    QObj *table = qNewTableFromArray(qNewSymbolList(names, columnCount), columns, columnCount);

    printf("Columns = %" PRIu64 ", rows = %" PRIu64 "\n", qGetTableColumnCount(table),
           qGetTableRowCount(table));
    QObj *cube = qGetMixedAtIndex(qGetTableColumns(table), 2);
    printf("x3[3] = %" PRId64 "\n", qGetLongAtIndex(cube, 3));

    qDecRef(table);
    return 0;
}
```

Output:

```
Columns = 3, rows = 4
x3[3] = 64
```

There is also `qNewTableVar`, which takes a `va_list` and reads one column for each column name. Like `qNewMixedListVar`, it is intended for writing your own variadic functions.

```c
QObj *qNewTableVar(QObj *header, va_list args);
```

> Note: Unlike the other table functions, `qNewTableVar` does not always release its columns on error. It finds out how many columns to read from the number of column names. If `header` is `NULL` or not a symbol list, it cannot know that number, so it returns an error (`domain` or `type`) without reading any columns from `args`. It still releases `header` if it is not `NULL`, but you must release the columns yourself.

### Errors

The table functions check their arguments and return `NULL` on failure:

| Error    | Cause                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| `domain` | The header or a column is `NULL`                                                                       |
| `type`   | The header is not a symbol list, or a column is not a list or table (e.g. an atom or dictionary)       |
| `length` | The number of columns does not match the number of column names, or the columns have different lengths |
| `rank`   | There are no columns and no column names                                                               |

On error, the header and all columns are released, except in the `qNewTableVar` case described above. For example:

```c
#include <stdio.h>
#include "q.h"

int main(void) {
    QSymbol names[] = {"a", "b"};
    QLong longs[] = {1, 2, 3};
    QChar chars[] = {'x', 'y'};

    // Three rows in the first column, but only two in the second
    QObj *table =
        qNewTable(qNewSymbolList(names, 2), qNewLongList(longs, 3), qNewCharList(chars, 2));
    if (!table) {
        QObj *error = qCheckError(table);
        printf("error: %s\n", qGetError(error));
        qDecRef(error);
        return 0;
    }

    qDecRef(table);
    return 0;
}
```

Output:

```
error: length
```

`qNewTable` does not check that column names are unique. Like `flip` in Q, it keeps duplicates as they are.

Finally, a table can also be built row by row. `qCollapseMixedList` (see [Uniform Items Are Not Collapsed](#uniform-items-are-not-collapsed)) collapses a mixed list of **conforming dictionaries** (the same symbol keys, in the same order) into a table, with one row per dictionary. This is the C equivalent of Q turning a list of dictionaries like ``(`a`b!1 2;`a`b!3 4)`` into a table.

## Keyed Tables

A keyed table is made up of two tables with the same number of rows: the first holds the key columns and the second holds the value columns. It is a dictionary whose keys and values are both tables, which is why a keyed table has the dictionary type, `99`.

A keyed table can be created from its two tables using `qNewKeyedTable`:

```c
QObj *qNewKeyedTable(QObj *keys, QObj *values);
```

`keys` is a table of the key columns, and `values` is a table of the value columns.

Like `qNewDict`, `qNewKeyedTable` **takes ownership** of both tables, even when it fails. The two tables are read with `qGetKeyedTableKeys` and `qGetKeyedTableValues`, which return **borrowed** pointers.

### Example

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

static QObj *makeKeyedTable(void) {
    QSymbol keySymbols[] = {"key0", "key1"};
    QObj *keyHeader = qNewSymbolList(keySymbols, 2);
    QLong keyLongs[] = {1, 2, 3};
    QObj *key0 = qNewLongList(keyLongs, 3);
    QChar keyChars[] = {'a', 'b', 'c'};
    QObj *key1 = qNewCharList(keyChars, 3);

    QObj *keys = qNewTable(keyHeader, key0, key1);

    QSymbol valueSymbols[] = {"col0", "col1", "col2"};
    QObj *valueHeader = qNewSymbolList(valueSymbols, 3);
    QLong valueLongs[] = {10, 20, 30};
    QObj *col0 = qNewLongList(valueLongs, 3);
    QChar valueChars[] = {'x', 'y', 'z'};
    QObj *col1 = qNewCharList(valueChars, 3);
    QFloat valueFloats[] = {1.2, 3.4, 5.6};
    QObj *col2 = qNewFloatList(valueFloats, 3);

    QObj *values = qNewTable(valueHeader, col0, col1, col2);

    // The keyed table takes ownership of keys and values
    return qNewKeyedTable(keys, values);
}

static void printKeyedTable(const QObj *keyedTable) {
    // Borrowed pointers: do not release
    QObj *keys = qGetKeyedTableKeys(keyedTable);
    QObj *values = qGetKeyedTableValues(keyedTable);

    QObj *keysHeader = qGetTableHeader(keys);
    for (QSize i = 0; i < keysHeader->length; i++)
        printf("%s ", qGetSymbolAtIndex(keysHeader, i));

    printf("| ");

    QObj *valuesHeader = qGetTableHeader(values);
    for (QSize i = 0; i < valuesHeader->length; i++)
        printf("%s ", qGetSymbolAtIndex(valuesHeader, i));

    printf("\n--------- | --------------\n");

    QObj *keysColumns = qGetTableColumns(keys);
    QObj *key0 = qGetMixedAtIndex(keysColumns, 0);
    QObj *key1 = qGetMixedAtIndex(keysColumns, 1);

    QObj *valuesColumns = qGetTableColumns(values);
    QObj *col0 = qGetMixedAtIndex(valuesColumns, 0);
    QObj *col1 = qGetMixedAtIndex(valuesColumns, 1);
    QObj *col2 = qGetMixedAtIndex(valuesColumns, 2);

    for (QSize i = 0; i < qGetTableRowCount(keys); i++) {
        printf("%" PRId64 "    ", qGetLongAtIndex(key0, i));
        printf("%c    | ", qGetCharAtIndex(key1, i));
        printf("%" PRId64 "   ", qGetLongAtIndex(col0, i));
        printf("%c    ", qGetCharAtIndex(col1, i));
        printf("%.1f\n", qGetFloatAtIndex(col2, i));
    }
}

int main(void) {
    QObj *keyedTable = makeKeyedTable();

    printf("Type = %d\n", keyedTable->type);
    printf("Keys type = %d\n", qGetKeyedTableKeys(keyedTable)->type);
    printf("Values type = %d\n\n", qGetKeyedTableValues(keyedTable)->type);

    printKeyedTable(keyedTable);

    // Releases the keyed table and both of its tables
    qDecRef(keyedTable);
    return 0;
}
```

Output:

```
Type = 99
Keys type = 98
Values type = 98

key0 key1 | col0 col1 col2
--------- | --------------
1    a    | 10   x    1.2
2    b    | 20   y    3.4
3    c    | 30   z    5.6
```

The key table and the value table must have the same number of rows (three here). Otherwise, `qNewKeyedTable` returns a `length` error (see the errors table below).

### Keying and Unkeying a Table

Often the columns are already in a single table, and some of them should become the key. `qKeyTable` keys a table on its first `nkeys` columns, like Q's `n!table`:

```c
QObj *qKeyTable(QSize nkeys, QObj *table);
```

`nkeys` must be at least `1`, and less than the number of columns, so that there is at least one value column.

`qUnkeyTable` does the reverse, like Q's `0!keyedTable`. It returns a simple table with the key columns followed by the value columns:

```c
QObj *qUnkeyTable(QObj *keyedTable);
```

Both **take ownership** of their argument, so a table can be keyed and unkeyed without releasing anything in between:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

static void printKinds(const char *name, const QObj *obj) {
    printf("%-7s type = %d, qIsTable = %d, qIsKeyedTable = %d, qIsDict = %d\n", name, obj->type,
           qIsTable(obj), qIsKeyedTable(obj), qIsDict(obj));
}

int main(void) {
    QSymbol names[] = {"id", "sym", "price"};
    QLong ids[] = {1, 2, 3};
    QSymbol syms[] = {"abc", "def", "ghi"};
    QFloat prices[] = {1.5, 2.5, 3.5};
    QObj *table = qNewTable(qNewSymbolList(names, 3), qNewLongList(ids, 3),
                            qNewSymbolList(syms, 3), qNewFloatList(prices, 3));
    printKinds("table", table);

    // Key on the first column: qKeyTable takes ownership of table
    QObj *keyedTable = qKeyTable(1, table);
    printKinds("keyed", keyedTable);
    printf("        key columns = %" PRIu64 ", value columns = %" PRIu64 "\n",
           qGetTableColumnCount(qGetKeyedTableKeys(keyedTable)),
           qGetTableColumnCount(qGetKeyedTableValues(keyedTable)));

    // And back again: qUnkeyTable takes ownership of keyedTable
    QObj *unkeyed = qUnkeyTable(keyedTable);
    printKinds("unkeyed", unkeyed);

    qDecRef(unkeyed);
    return 0;
}
```

Output:

```
table   type = 98, qIsTable = 1, qIsKeyedTable = 0, qIsDict = 0
keyed   type = 99, qIsTable = 0, qIsKeyedTable = 1, qIsDict = 0
        key columns = 1, value columns = 2
unkeyed type = 98, qIsTable = 1, qIsKeyedTable = 0, qIsDict = 0
```

This example also shows why type checks matter here. A keyed table has type `99`, just like a dictionary, so `obj->type` alone cannot tell the two apart. `qIsKeyedTable` and `qIsDict` can (see [Type Check Functions](#type-check-functions)).

### Errors

| Function         | Error    | Cause                                                  |
| ---------------- | -------- | ------------------------------------------------------ |
| `qNewKeyedTable` | `domain` | `keys` or `values` is `NULL`                           |
|                  | `type`   | `keys` or `values` is not a table                      |
|                  | `length` | `keys` and `values` have different row counts          |
| `qKeyTable`      | `domain` | `table` is `NULL`                                      |
|                  | `type`   | `table` is not a table                                 |
|                  | `length` | `nkeys` is `0`, or not less than the number of columns |
| `qUnkeyTable`    | `domain` | `keyedTable` is `NULL`                                 |
|                  | `type`   | `keyedTable` is not a keyed table or table             |

In every case the arguments are released on error. `qUnkeyTable` returns a simple table unchanged.

## Type Check Functions

So far we have checked an object's type by reading `obj->type` directly. That works for atoms and simple lists. As we have seen, though, the type code alone cannot tell a dictionary from a keyed table. Code that reads `obj->type` must also check for `NULL` first, or it will crash.

The type check functions (declared in `is.h`) handle both problems. Each takes a `const QObj *` and returns a `bool`, and each returns `false` for `NULL`. This means we can pass the result of a creation call straight in without checking it first.

### Atoms

`qIsAtom` checks whether an object is an atom of any type (a negative type code). There is also one function per atom type, such as `qIsLong`, `qIsSymbol`, and `qIsTimestamp`:

```c
bool qIsAtom(const QObj *obj);
bool qIsLong(const QObj *obj);
bool qIsSymbol(const QObj *obj);
```

Each per-type function calls `qIsAtomType`, which takes a type code. Pass the **list** type code, such as `Q_TYPE_LONG`, not the negative atom type code:

```c
bool qIsAtomType(const QObj *obj, QTypeCode type);

qIsAtomType(obj, Q_TYPE_LONG); // same as qIsLong(obj)
```

### Lists

There are three functions for lists in general:

- `qIsList` checks whether an object is a list of any kind: mixed (`0`), simple (`1` to `19`), or enumerated and mapped (`20` to `97`). Tables (`98`) and dictionaries (`99`) are not lists.
- `qIsSimpleList` checks whether an object is a simple list (`1` to `19`). A mixed list is not simple, even if every item has the same type.
- `qIsListType` checks whether an object is a list of a given type code.

As with atoms, there is one function per list type, such as `qIsLongList` and `qIsCharList`, and each calls `qIsListType`.

Recall from [Uniform Items Are Not Collapsed](#uniform-items-are-not-collapsed) that a mixed list of longs is not a long list. The list checks show the difference:

```c
#include <stdio.h>
#include "q.h"

int main(void) {
    QLong longs[] = {1, 2, 3};
    QObj *longList = qNewLongList(longs, 3);
    QObj *mixedList = qNewMixedList(3, qNewLong(1), qNewLong(2), qNewLong(3));

    printf("            qIsList qIsSimpleList qIsLongList qIsMixedList\n");
    printf("longList    %-7d %-13d %-11d %d\n", qIsList(longList), qIsSimpleList(longList),
           qIsLongList(longList), qIsMixedList(longList));
    printf("mixedList   %-7d %-13d %-11d %d\n", qIsList(mixedList), qIsSimpleList(mixedList),
           qIsLongList(mixedList), qIsMixedList(mixedList));
    printf("NULL        %-7d %-13d %-11d %d\n", qIsList(NULL), qIsSimpleList(NULL),
           qIsLongList(NULL), qIsMixedList(NULL));

    qDecRef(longList);
    qDecRef(mixedList);
    return 0;
}
```

Output:

```
            qIsList qIsSimpleList qIsLongList qIsMixedList
longList    1       1             1           0
mixedList   1       0             0           1
NULL        0       0             0           0
```

Both are lists, but only `longList` is a long list. `qGetLongAtIndex` can therefore be used on `longList`, but on `mixedList` it fails an assert (in a release build with `NDEBUG`, it reads garbage).

### Composite Values

The remaining functions check for the composite values covered in this part:

| Function        | `true` when                                                   |
| --------------- | ------------------------------------------------------------- |
| `qIsMixedList`  | The type is `0`                                               |
| `qIsTable`      | The type is `98`                                              |
| `qIsKeyedTable` | The type is `99`, and both the keys and the values are tables |
| `qIsDict`       | The type is `99`, and the object is not a keyed table         |

`qIsKeyedTable` and `qIsDict` look inside the object, not just at its type code. That is how they tell a keyed table from a dictionary. Exactly one of them is `true` for any type-`99` object, so they can be checked in either order.

### Example

Earlier we saw that before reading an item from a mixed list, we may need to check its type. The `describe` function below does that for each item of a mixed list holding one of each kind of value from this part:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

static void describe(const QObj *obj) {
    if (qIsLong(obj))
        printf("long atom %" PRId64 "\n", qGetLong(obj));
    else if (qIsSymbol(obj))
        printf("symbol atom %s\n", qGetSymbol(obj));
    else if (qIsAtom(obj))
        printf("other atom (type %d)\n", obj->type);
    else if (qIsCharList(obj))
        printf("char list %.*s\n", (int)obj->length, (char *)obj->list);
    else if (qIsSimpleList(obj))
        printf("simple list (type %d) of length %" PRIu64 "\n", obj->type, obj->length);
    else if (qIsMixedList(obj))
        printf("mixed list of length %" PRIu64 "\n", obj->length);
    else if (qIsTable(obj))
        printf("table with %" PRIu64 " rows\n", qGetTableRowCount(obj));
    else if (qIsKeyedTable(obj))
        printf("keyed table with %" PRIu64 " key column(s)\n",
               qGetTableColumnCount(qGetKeyedTableKeys(obj)));
    else if (qIsDict(obj))
        printf("dictionary with %" PRIu64 " keys\n", qGetDictCount(obj));
    else
        printf("something else (type %d)\n", obj->type);
}

int main(void) {
    QSymbol names[] = {"id", "price"};
    QLong ids[] = {1, 2, 3};
    QFloat prices[] = {1.5, 2.5, 3.5};

    QObj *items = qNewMixedList(
        9,
        qNewLong(42),
        qNewSymbol("abc"),
        qNewFloat(1.5),
        qNewCharListFromString("hello"),
        qNewLongList(ids, 3),
        qNewMixedList(2, qNewLong(1), qNewLong(2)),
        qNewDict(qNewSymbolList(names, 2), qNewMixedList(2, qNewLong(1), qNewFloat(1.5))),
        qNewTable(qNewSymbolList(names, 2), qNewLongList(ids, 3), qNewFloatList(prices, 3)),
        qKeyTable(1, qNewTable(qNewSymbolList(names, 2), qNewLongList(ids, 3),
                               qNewFloatList(prices, 3)))
    );

    for (QSize i = 0; i < items->length; i++) {
        printf("items[%" PRIu64 "] = ", i);
        describe(qGetMixedAtIndex(items, i));
    }

    qDecRef(items);
    return 0;
}
```

Output:

```
items[0] = long atom 42
items[1] = symbol atom abc
items[2] = other atom (type -9)
items[3] = char list hello
items[4] = simple list (type 7) of length 3
items[5] = mixed list of length 2
items[6] = dictionary with 2 keys
items[7] = table with 3 rows
items[8] = keyed table with 1 key column(s)
```

The order of the checks matters. The specific checks, such as `qIsLong` and `qIsCharList`, come before the general ones, `qIsAtom` and `qIsSimpleList`, which catch everything else of that kind.

## Conclusion

In this part, we have moved from self-contained values to values built from other values. The key points are:

- **Composite values are objects that point to other objects.** A mixed list holds a pointer to each item. A dictionary holds two pointers, to its keys and its values. A table's `nested` pointer points to a dictionary of column names and columns. A keyed table is a dictionary whose keys and values are both tables.
- **Creation functions take ownership of their arguments.** `qNewMixedList`, `qCollapseMixedList`, `qNewDict`, `qNewTable`, `qNewTableFromArray`, `qNewKeyedTable`, `qKeyTable`, and `qUnkeyTable` all take ownership of the objects passed to them, and almost always do so even when they fail (see the notes on `qNewMixedList` and `qNewTableVar` for the exceptions). Only the outermost object is released, and releasing it releases everything inside it. To keep using an object after passing it in, call `qIncRef` on it first.
- **Accessors return borrowed pointers.** `qGetMixedAtIndex`, `qGetDictKeys`, `qGetTableColumns`, and the other accessors that return a `QObj *` point into the containing object. They must not be released, and are only valid while the containing object is.
- **A `NULL` return means an error.** `qCheckError` turns it into an error object whose message `qGetError` reads, such as `domain`, `type`, or `length`. The error object is ours to release.
- **The type code alone is not always enough.** Dictionaries and keyed tables share the type `99`, so the type check functions are the reliable way to tell them apart.

### Next Time

Over these two parts, we have seen how to create and read most of Q's types from C, but every object has been built in one go, with a fixed length. In Part 3 (link does not exist yet), we look at more functions for working with lists, in particular how to add new items to an existing list. We then put everything together to build a shared library that can be loaded into a live Q session with `2:` and called from Q.
