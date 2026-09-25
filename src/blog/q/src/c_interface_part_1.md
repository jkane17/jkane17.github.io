# C Interface for Q - Part 1

![Cover Image](./images/c_interface_part_1.jpeg "Cover Image")

Q is fast, but sometimes you need to reach outside it: to call an existing C library, to speed up a hot loop, or to talk to a Q process from a C program. kdb+ supports all of this through its C API. A C function can be compiled into a shared library and loaded into a Q process with `2:`, and a standalone C program can create Q values and exchange them with Q processes by linking against KX's C API library.

Everything that crosses between C and Q is a **Q object**, and working with Q objects is what the C API is all about. KX's header for it, `k.h`, is famously terse: a Q object is a `K`, a long atom is created with `kj`, a list with `ktn`, the elements of a long list are reached with the `kJ` macro, and an object is released with `r0`. Once learned, these names are quick to type, but they make code hard to read for anyone who has not learned them.

This series uses the C interface from [QLib](https://github.com/jkane17/qlib), which wraps `k.h` with descriptive names, C types that mirror Q's types, and extra checking. The table below shows a few examples:

| `k.h`        | QLib                       | Purpose                        |
| ------------ | -------------------------- | ------------------------------ |
| `K`          | `QObj *`                   | A Q object                     |
| `kj(x)`      | `qNewLong(x)`              | Create a long atom             |
| `ktn(KJ, n)` | `qNewList(Q_TYPE_LONG, n)` | Allocate a long list           |
| `kJ(x)[i]`   | `qGetLongAtIndex(x, i)`    | Read an element of a long list |
| `ks(s)`      | `qNewSymbol(s)`            | Create a symbol atom           |
| `r0(x)`      | `qDecRef(x)`               | Release a Q object             |

The wrappers are thin: a `QObj` has exactly the same memory layout as a `K`, and most functions call their `k.h` counterpart directly. So everything in this series also applies to code written against `k.h`, just with different names.

In this first part, we look at the Q object itself: how it is laid out in memory, the types of value it can hold, and how to create and read atoms and lists. In Part 2 (link not available yet), we move on to more complex types like mixed lists, dictionaries, and tables.

### Building the Examples

The C interface requires a C23 compiler (`-std=c2x`), and either GCC or Clang, since `QObj` relies on a compiler extension (see [Size](#size)). Every example in this post is a complete program. To build one, compile it against the QLib headers, QLib's `libcdk.so` (built by running `./build.sh` in the QLib repository), and KX's C API library. On Linux, that looks like:

```bash
gcc -std=c2x -I $QLIB/include example.c $QLIB/libcdk.so $QCLIB/c.o -lm -o example
```

where

- `QLIB` - Path to qlib install (e.g. `/home/USER/.kx/mod/qlib`)
- `QCLIB` - Path to KX's C API library (e.g. `/home/USER/.kx/c`)

KX's C API library provides the kdb+ functions that the C interface calls, such as `kj` and `ktn`. It is not included with QLib, but is available from KX for each platform (see [C client for q](https://code.kx.com/q/interfaces/c-client-for-q/#two-sets-of-files)). On Linux and macOS it is `c.o`, or `e.o` for SSL/TLS support, which also requires OpenSSL. On Windows it is a DLL and its import library, such as `c.dll` and `c.lib`. Code that is loaded into a Q process as a shared library does not need the library, as the Q process provides those functions itself.

> Note: You will see `#include "q.h"` in examples below. `q.h` exists to make including all header files a single line in your source.

## The Q Object (`QObj`)

The [`QObj`](https://github.com/jkane17/qlib/blob/main/doc/c/object.md) is a C `struct` that represents a Q value. It stores both the value itself and metadata associated with it, including its type, reference count, attributes, and, for lists, their length. Some fields are reserved for Q's internal use.

### Definition

The `QObj` is defined as follows:

```c
typedef struct _q0 {
    signed char _reserved_m; // internal value
    signed char _reserved_a; // internal value

    QType type;   // data type (negative for atom, zero or positive for list)
    QAttr attr;   // attribute flag (sorted, unique, grouped, parted)
    int32_t refs; // reference count

    union {
        QByte qbyte;     // boolean, byte, char
        QShort qshort;   // short
        QInt qint;       // int, month, date, minute, second, time
        QLong qlong;     // long, timestamp, timespan
        QReal qreal;     // real
        QFloat qfloat;   // float, datetime
        QSymbol qsymbol; // symbol

        struct _q0 *nested; // table (points to its column dictionary)

        struct {
            QSize length; // number of elements in list
            QByte list[]; // start of contiguous list data
        };
    };
} QObj;
```

The struct is tagged `_q0` so that it can refer to itself, which the `nested` pointer needs.

The layout matches kdb+'s own `K` object (`struct k0` in `k.h`) byte for byte. That's what lets a `QObj *` be passed straight to kdb+ with no conversion. If you've used `k.h`, you'll recognise the fields: `_reserved_m`, `_reserved_a`, `type`, `attr`, and `refs` correspond to `m`, `a`, `t`, `u`, and `r`.

The individual fields are:

- `_reserved_m` and `_reserved_a`: Fields reserved for kdb+'s internal use. They should never be read or written directly.

- `QType type`: The data type of the stored value. This corresponds to Q's type values: for example, `7` represents a long and `9` represents a float. Negative values represent atoms, while zero and positive values represent lists. See [Q Types](#q-types) for more on types.

- `QAttr attr`: The attribute applied to the value, one of the `QAttrCode` values: `Q_ATTR_NONE` (`0`), `Q_ATTR_SORTED` (`1`, `` `s# ``), `Q_ATTR_UNIQUE` (`2`, `` `u# ``), `Q_ATTR_PARTED` (`3`, `` `p# ``), or `Q_ATTR_GROUPED` (`5`, `` `g# ``). Grouped is an oddity: it is `5` in memory, but IPC serialisation (`-8!`) encodes it as `4`.

- `int32_t refs`: The object's reference count, used for memory management. A newly created object has `refs == 0`, which means it has a single owner and no additional references. Positive values mean additional references exist. Because an object with additional references may be shared, operations that mutate the object should take this into account. The count is changed with `qIncRef` and `qDecRef` (defined in [`mem.h`](https://github.com/jkane17/qlib/blob/main/doc/c/memory.md)), never by modifying `refs` directly. Calling `qDecRef` on an object whose count is already `0` frees the object's memory.

- The anonymous `union`: The storage used by the value. A C `union` allocates enough space for its largest member, and all of its members occupy the same memory location. Which member is meaningful depends on the value stored in `type`.
    - `QByte qbyte`: A one-byte value used for Q boolean, byte, and char values. Note that `QChar` is `char` while `QByte` is `unsigned char`, so a char atom's value is stored in `qbyte` and converted back to `QChar` when it is read.
    - `QShort qshort`: A two-byte value used for the Q short type.
    - `QInt qint`: A four-byte value used for Q int, month, date, minute, second, and time values.
    - `QLong qlong`: An eight-byte value used for Q long, timestamp, and timespan values.
    - `QReal qreal`: A four-byte value used for Q real values.
    - `QFloat qfloat`: An eight-byte value used for Q float and datetime values.
    - `QSymbol qsymbol`: A pointer-sized value used for Q symbols.
    - `struct _q0 *nested`: Used by tables (type `98`). A table's `nested` pointer points to a dictionary that maps the column names to the column values.
    - `struct { QSize length; QByte list[]; }`: The list representation. `length` stores the number of elements in the list, while `list` is a flexible array member containing the list's contiguous data. Because `list` is stored as bytes, it must be interpreted or cast as the appropriate element type when accessing its elements.

You may notice that the union has no member for GUIDs. A GUID atom is 16 bytes, which is too large for any member of the union, so its bytes are stored where list data would begin. This is why `qGetGuid` reads a GUID atom from `obj->list`.

### Size

Every Q value carries a `QObj` header, so its size tells us the fixed cost of every Q value, even a single boolean.

We can calculate the size of a `QObj` using C's `sizeof` operator. The size is determined by the size of its individual fields, the size of the union's largest member, and any alignment padding inserted by the compiler.

Assuming the following sizes on our platform:

```text
signed char = 1 byte
QType       = 1 byte
QAttr       = 1 byte
QByte       = 1 byte
QShort      = 2 bytes
QInt        = 4 bytes
int32_t     = 4 bytes
QLong       = 8 bytes
QReal       = 4 bytes
QFloat      = 8 bytes
QSymbol     = 8 bytes
pointer     = 8 bytes
QSize       = 8 bytes
```

we might initially calculate the union's size as:

```text
max(
    sizeof(QByte),
    sizeof(QShort),
    sizeof(QInt),
    sizeof(QLong),
    sizeof(QReal),
    sizeof(QFloat),
    sizeof(QSymbol),
    sizeof(struct _q0 *),
    sizeof(struct { QSize length; QByte list[]; })
)
= max(1, 2, 4, 8, 4, 8, 8, 8, 8)
= 8
```

The last value is important. Although the list contains both a `QSize` and an array of `QByte` values, `list` is a **flexible array member**. Flexible array members do not contribute to the size reported by `sizeof` applied to the containing structure. Consequently:

```c
sizeof(struct {
    QSize length;
    QByte list[];
})
```

is `sizeof(QSize)`, which is 8 bytes on our platform.

> Note: Strictly speaking, a flexible array member inside an anonymous struct inside a union is a GCC/Clang extension rather than standard C, so the library requires one of those compilers.

Therefore:

```text
sizeof(QObj)
= 1 (_reserved_m) + 1 (_reserved_a) + 1 (type) + 1 (attr) + 4 (refs) + 8 (union)
= 16 bytes
```

In general, `sizeof` includes any alignment padding the compiler inserts, but here none is needed. The four one-byte fields and `refs` together take exactly 8 bytes, so the union, which requires 8-byte alignment, starts at offset 8 without any padding.

We don't have to take this on trust. `obj.h` checks the layout at compile time, so the code will not compile if the layout ever drifts from kdb+'s `K` object:

```c
static_assert(sizeof(QObj) == 16, "QObj size must match kdb+ K object");
static_assert(offsetof(QObj, type) == 2, "QObj type offset must match kdb+ K object");
static_assert(offsetof(QObj, attr) == 3, "QObj attr offset must match kdb+ K object");
static_assert(offsetof(QObj, refs) == 4, "QObj refs offset must match kdb+ K object");
static_assert(offsetof(QObj, length) == 8, "QObj length offset must match kdb+ K object");
static_assert(offsetof(QObj, list) == 16, "QObj list offset must match kdb+ K object");
```

The last assertion shows that list data starts at byte 16, immediately after the header. So an atom needs exactly 16 bytes (a GUID atom, stored in the list data area, is the exception), and a list of `n` elements needs `16 + n * sizeof(element)` bytes, although kdb+'s allocator may round the actual allocation up.

## Q Types

Now that we have seen how a `QObj` stores a Q value, we need to look at the types of values it can represent. These are defined in [`type.h`](https://github.com/jkane17/qlib/blob/main/doc/c/type.md).

At first glance, Q appears to have quite a large number of types: booleans, bytes, shorts, ints, longs, reals, floats, characters, symbols, and several temporal types. However, many of these types share the same underlying representation in C. This makes the C interface relatively simple while still preserving the distinctions made by Q.

### Booleans and Bytes

```c
typedef unsigned char QBoolean;
typedef unsigned char QByte;
```

A Q boolean and byte are both represented by a single unsigned byte. A boolean should only ever hold `0` or `1`, and `qNewBoolean` converts any non-zero input to `1` (see [Atoms](#atoms)).

### Numeric Types

Q provides signed integers of three different sizes:

```c
typedef int16_t QShort;
typedef int32_t QInt;
typedef int64_t QLong;
```

A short is a 16-bit signed integer, an int is a 32-bit signed integer, and a long is a 64-bit signed integer.

Q also has two floating-point types:

```c
typedef float QReal;
typedef double QFloat;
```

A real is represented by a 32-bit `float`, while a float is represented by a 64-bit `double`.

### Characters and Symbols

Q's character type is represented by `QChar`:

```c
typedef char QChar;
```

A Q symbol is different from a character. Symbols are represented by `QSymbol`:

```c
typedef char *QSymbol;
```

A symbol is an interned string. Rather than each Q object storing its own copy of the characters, Q keeps one copy of each distinct symbol in a shared symbol table, and a `QSymbol` points to that copy. A Q char list, by contrast, stores its characters directly in its own list data.

We can see this with an example:

```c
#include <stdio.h>
#include "q.h"

int main(void) {
    QObj *sym0 = qNewSymbol("hello");
    QObj *sym1 = qNewSymbol("hello");

    QObj *str0 = qNewCharListFromString("hello");
    QObj *str1 = qNewCharListFromString("hello");

    printf("sym0: %p\n", (void *)sym0->qsymbol);
    printf("sym1: %p\n", (void *)sym1->qsymbol);
    printf("str0: %p\n", (void *)str0->list);
    printf("str1: %p\n", (void *)str1->list);

    return 0;
}
```

Output:

```
sym0: 0x55555556d2e8
sym1: 0x55555556d2e8
str0: 0x7ffff6b00030
str1: 0x7ffff6b00050
```

The two symbols point to the same memory location because `"hello"` is interned: both `sym0` and `sym1` refer to the same shared symbol data. The two char lists are different, because each call to `qNewCharListFromString` creates its own Q object with its own character storage.

This has a useful practical consequence: **two interned symbols are equal exactly when their pointers are equal**, so symbols can be compared with `==` rather than `strcmp`.

See [Atoms](#atoms) and [Lists](#lists) for more on the functions `qNewSymbol` and `qNewCharListFromString` used in the previous example.

### GUIDs

Q also has a GUID type:

```c
typedef struct {
    unsigned char bytes[16];
} QGuid;
```

A GUID is 16 bytes, or 128 bits, in size. Unlike the other primitive types, it is represented by a small structure containing the raw bytes. As we saw in [The Q Object](#the-q-object-qobj), a GUID atom is too large for the `QObj` union, so its bytes are stored in the list data area.

### Temporal Types

Q has a number of types specifically designed for working with dates and times:

```c
typedef int64_t QTimestamp;
typedef int32_t QMonth;
typedef int32_t QDate;
typedef double  QDatetime;
typedef int64_t QTimespan;
typedef int32_t QMinute;
typedef int32_t QSecond;
typedef int32_t QTime;
```

Each type has its own `typedef` name, but these names are only documentation: they resolve to the same few C types used by the numeric types. An `int32_t` by itself does not tell us whether a value is an int, a date, a month, a minute, a second, or a time. Only the type code stored in the `QObj` tells them apart.

The table below shows each temporal type's C representation and what the number it stores means. Types that represent a point in time count from the Q epoch, `2000.01.01`. The others represent a duration or time of day.

| Q type    | C representation | Value                                          |
| --------- | ---------------- | ---------------------------------------------- |
| timestamp | `int64_t`        | nanoseconds since `2000.01.01D00:00`           |
| month     | `int32_t`        | months since `2000.01m`                        |
| date      | `int32_t`        | days since `2000.01.01`                        |
| datetime  | `double`         | days (with fractional part) since `2000.01.01` |
| timespan  | `int64_t`        | nanoseconds                                    |
| minute    | `int32_t`        | minutes                                        |
| second    | `int32_t`        | seconds                                        |
| time      | `int32_t`        | milliseconds                                   |

For example, the date `2000.01.02` is stored as `1`, and `1999.12.31` is stored as `-1`.

### Type Codes

Q represents types internally using small integer codes. These are exposed by the `QType` and `QTypeCode` definitions (abridged here; see [`type.h`](https://github.com/jkane17/qlib/blob/main/doc/c/type.md) for the full list):

```c
typedef signed char QType;

typedef enum : QType {
    Q_TYPE_ERROR = -128,

    Q_TYPE_MIXED = 0,
    Q_TYPE_BOOLEAN = 1,
    Q_TYPE_GUID = 2,
    Q_TYPE_BYTE = 4,
    Q_TYPE_SHORT = 5,
    Q_TYPE_INT = 6,
    Q_TYPE_LONG = 7,
    Q_TYPE_REAL = 8,
    Q_TYPE_FLOAT = 9,
    Q_TYPE_CHAR = 10,
    Q_TYPE_SYMBOL = 11,
    Q_TYPE_TIMESTAMP = 12,
    Q_TYPE_MONTH = 13,
    Q_TYPE_DATE = 14,
    Q_TYPE_DATETIME = 15,
    Q_TYPE_TIMESPAN = 16,
    Q_TYPE_MINUTE = 17,
    Q_TYPE_SECOND = 18,
    Q_TYPE_TIME = 19,

    // ... enumerations (20-76) and mapped lists (77-97) omitted

    Q_TYPE_TABLE = 98,
    Q_TYPE_DICTIONARY = 99,

    // ... function types (100-112) omitted
} QTypeCode;
```

> Note: An `enum` with a fixed underlying type (`enum : QType`) requires C23.

There is a useful pattern in these values. For the primitive types, `1` to `19`, the positive value represents a list and the negative value represents an atom.

For example:

```text
-7    long atom
 7    long list

-9    float atom
 9    float list
```

This means that the `type` field of a `QObj` carries more information than simply identifying the underlying C representation. It also tells us whether the value is an atom or a list.

The other codes have their own meanings and have no atom/list pair:

- `0` is a mixed list. It contains values of different types, so there is no single primitive type that describes all of its elements.
- `20` to `76` are enumerations. You will meet these when reading real data from kdb+: symbol columns in splayed and partitioned tables are usually enumerated against `sym`, giving type `20`. An enumeration stores integer indices into a symbol list rather than `QSymbol` pointers.
- `77` to `97` are mapped lists, which appear when working with data on disk.
- `98` and `99` are tables and dictionaries.
- `100` to `112` are functions: lambdas, primitives, operators, iterators, projections, and so on.
- `-128` is an error object, which is how kdb+ hands an error back to C (for example, from an IPC call). Errors raised from C are different: they are signalled by returning `NULL` (see [`qNewError`](https://github.com/jkane17/qlib/blob/main/doc/c/errors.md)).

One value is notably absent from the primitive sequence: `3`. This type code is unused.

### Special Values

Q also has special values for null and infinity. These are ordinary values of the underlying C type, and should not be confused with C's `NULL` pointer.

For the integer types, null is the minimum value of the type and infinity is the maximum:

```c
#define Q_SHORT_NULL ((QShort)INT16_MIN) // 0Nh
#define Q_SHORT_INF  ((QShort)INT16_MAX) // 0Wh

#define Q_INT_NULL ((QInt)INT32_MIN) // 0Ni
#define Q_INT_INF  ((QInt)INT32_MAX) // 0Wi

#define Q_LONG_NULL ((QLong)INT64_MIN) // 0N
#define Q_LONG_INF  ((QLong)INT64_MAX) // 0W
```

For floating-point values, Q uses IEEE 754 NaN and infinity:

```c
#define Q_REAL_NULL ((QReal)NAN)       // 0Ne
#define Q_REAL_INF  ((QReal)INFINITY)  // 0We

#define Q_FLOAT_NULL ((QFloat)NAN)      // 0n
#define Q_FLOAT_INF  ((QFloat)INFINITY) // 0w
```

The remaining types have a null but no infinity:

```c
#define Q_CHAR_NULL ((QChar)' ') // " "
#define Q_SYMBOL_NULL ""         // `

static const QGuid Q_GUID_NULL = {{0}}; // 0Ng
```

Negative infinity is simply the negation of infinity, for example `-Q_INT_INF` for `-0Wi`. For the integer types this is one greater than null, so the negation cannot overflow.

The temporal types use the null and infinity values of their underlying type. For example, a null date is `Q_INT_NULL` and a null timestamp is `Q_LONG_NULL`.

Take care when testing for null, because not every null can be tested with `==`:

- **Real and float**: NaN never compares equal to anything, including itself, so `x == Q_FLOAT_NULL` is always false. Use `isnan(x)` instead. Any NaN is treated as null.
- **Symbol**: test with `sym[0] == '\0'` rather than comparing pointers against `Q_SYMBOL_NULL`. `Q_SYMBOL_NULL` is a C string literal, so it is not guaranteed to have the same address as Q's interned null symbol.
- **GUID**: compare the bytes, for example with `memcmp(&g, &Q_GUID_NULL, sizeof(QGuid)) == 0`.

These special values are particularly useful when moving data between Q and C because they allow the C interface to preserve Q's notion of null and infinity rather than having to invent separate representations.

### Attributes and Sizes

There are two additional types used throughout the C interface:

```c
typedef char QAttr;
typedef uint64_t QSize;
```

`QAttr` stores the attribute applied to a Q list. Its values are described in [The Q Object](#the-q-object-qobj).

`QSize` is an unsigned 64-bit value used for sizes and lengths. For example, it is used by `QObj` to store the number of elements in a list. Although `QSize` is unsigned, kdb+ stores lengths as signed 64-bit integers, so the largest valid size is `Q_SIZE_MAX`:

```c
#define Q_SIZE_MAX ((QSize)INT64_MAX)
```

## Atoms

Creating a `QObj` by hand is not recommended. The main reason is that kdb+ owns the memory: every `QObj` comes from kdb+'s allocator and is returned to it by `qDecRef`, so a `QObj` declared on the stack or allocated with `malloc` cannot safely be handed to kdb+ or freed. On top of that, the reserved fields (`_reserved_m` and `_reserved_a`) should never be touched directly. Instead, we use creation functions to create `QObj`s containing specific data types.

All creation functions begin with `qNew` and are defined in [`new.h`](https://github.com/jkane17/qlib/blob/main/doc/c/creating.md). They return `NULL` if the object cannot be created (for example, if memory runs out). To keep them short, the examples below do not check for this.

Functions for creating atoms have the form

```c
QObj *qNewTYPE(QTYPE value);
```

where `TYPE` is replaced with the data type name.

For example, to create a `boolean` we use `qNewBoolean` which has the form

```c
QObj *qNewBoolean(QBoolean value);
```

Once created, we can extract the underlying boolean value from the `QObj` using the boolean accessor function `qGetBoolean`. Accessor functions begin with `qGet` and atom accessor functions have the form

```c
QTYPE qGetTYPE(const QObj *obj);
```

where `TYPE` is replaced with the type name of the underlying value, e.g., `Boolean`.

There are two exceptions to these patterns, both of which follow from how the types are stored (see [Q Types](#q-types)):

- `qNewSymbol` takes a `const QChar *`, a C string, rather than a `QSymbol`. It interns the string and stores the resulting symbol.
- `qGetGuid` returns a `const QGuid *` pointing to the GUID inside the object, rather than a `QGuid` value.

Accessor functions do not convert between types, and they only check the type with an `assert`. Calling the wrong accessor, for example `qGetLong` on a date atom, aborts the program in a debug build. With `NDEBUG` defined, it silently reinterprets whatever is stored in the union. If you are not sure what an object holds, check its type first (see Type Check Functions in Part 2 (link does not exist yet)).

When you have finished with an object, release it with `qDecRef`. For an object that was just created, `refs` is `0`, so `qDecRef` frees it.

All creation functions are documented in [creating.md](https://github.com/jkane17/qlib/blob/main/doc/c/creating.md) and accessor functions in [accessing.md](https://github.com/jkane17/qlib/blob/main/doc/c/accessing.md).

### Example: Booleans

Create some `QObj`s containing booleans:

```c
#include <stdio.h>
#include "q.h"

int main(void) {
    int n = 256;

    QObj *boolObj0 = qNewBoolean(0);
    QObj *boolObj1 = qNewBoolean(1);
    QObj *boolObj2 = qNewBoolean(2);
    QObj *boolObj3 = qNewBoolean(-1);
    QObj *boolObj4 = qNewBoolean(n);

    printf("bool0 = %hhu\n", qGetBoolean(boolObj0));
    printf("bool1 = %hhu\n", qGetBoolean(boolObj1));
    printf("bool2 = %hhu\n", qGetBoolean(boolObj2));
    printf("bool3 = %hhu\n", qGetBoolean(boolObj3));
    printf("bool4 = %hhu\n", qGetBoolean(boolObj4));

    qDecRef(boolObj0);
    qDecRef(boolObj1);
    qDecRef(boolObj2);
    qDecRef(boolObj3);
    qDecRef(boolObj4);

    return 0;
}
```

Output:

```
bool0 = 0
bool1 = 1
bool2 = 1
bool3 = 1
bool4 = 0
```

Every non-zero `QBoolean` becomes `1`. But notice `bool4`: `qNewBoolean` takes a `QBoolean`, which is an `unsigned char`, so the `int` value `256` is truncated to `0` before `qNewBoolean` ever sees it. `-1`, on the other hand, becomes `255`, which is non-zero. If you are converting a wider integer to a boolean, compare it with zero yourself first, e.g. `qNewBoolean(n != 0)`.

### Example: Other Atoms

Creation and access look the same for every type. This example creates a long, a date, a symbol, and a GUID, then prints each one's type code and value:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    QObj *long_ = qNewLong(42);
    QObj *date = qNewDate(0); // 2000.01.01
    QObj *symbol = qNewSymbol("abc");
    QGuid value = {{0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
                    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef}};
    QObj *guid = qNewGuid(value);

    printf("long:   type = %d, value = %" PRId64 "\n", long_->type, qGetLong(long_));
    printf("date:   type = %d, value = %d\n", date->type, qGetDate(date));
    printf("symbol: type = %d, value = %s\n", symbol->type, qGetSymbol(symbol));

    const QGuid *g = qGetGuid(guid);
    printf("guid:   type = %d, value = ", guid->type);
    for (int i = 0; i < 16; i++)
        printf("%02x", g->bytes[i]);
    printf("\n");

    qDecRef(long_);
    qDecRef(date);
    qDecRef(symbol);
    qDecRef(guid);

    return 0;
}
```

Output:

```
long:   type = -7, value = 42
date:   type = -14, value = 0
symbol: type = -11, value = abc
guid:   type = -2, value = 0123456789abcdef0123456789abcdef
```

Each type code is the negative of the corresponding list type, as described in [Type Codes](#type-codes). The date is stored as `0` because it is `2000.01.01`, the Q epoch. The symbol and GUID show the two exceptions described above: `qNewSymbol` takes a C string, and `qGetGuid` returns a pointer.

## Lists

List creation functions have the form

```c
QObj *qNewTYPEList(const QTYPE *values, QSize length);
```

where `TYPE` is replaced with the data type name, `values` is a C array of elements, and `length` is the number of elements to take from it.

The values are **copied** into the new list, so the array remains yours: it can live on the stack, and changing or freeing it afterwards does not affect the list. A few constructors do more than copy:

- `qNewBooleanList` converts each non-zero value to `1`, like `qNewBoolean`.
- `qNewSymbolList` interns each string, so a plain array of C strings such as `{"abc", "def"}` can be passed directly.

An empty list is created by passing a `length` of `0`, in which case `values` may be `NULL`. Passing `NULL` with a non-zero `length` is an error, and returns `NULL`.

Since lists have multiple values, they are accessed by index using accessor functions of the form

```c
QTYPE qGetTYPEAtIndex(const QObj *obj, QSize index);
```

For example, an `int` list can be accessed using `qGetIntAtIndex`. As with atoms, there are exceptions to the pattern: `qGetGuidAtIndex` returns a `const QGuid *`, and `qGetMixedAtIndex` returns a `QObj *` (see Mixed Lists in Part 2 (link does not exist yet)).

Index accessors check both the type and the index with `assert`. An index past the end of the list aborts a debug build, and is undefined behaviour with `NDEBUG` defined, so loop up to `obj->length`.

### Example: Int List

Creating an `int` list with `qNewIntList`:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    QInt values[] = {1, 2, 3};
    QSize length = sizeof(values) / sizeof(values[0]);
    QObj *intList = qNewIntList(values, length);

    // The list holds its own copy, so changing the array does not affect it
    values[0] = 100;

    printf("Type = %d\n", intList->type);
    for (QSize i = 0; i < intList->length; i++) {
        printf("int[%" PRIu64 "] = %d\n", i, qGetIntAtIndex(intList, i));
    }

    qDecRef(intList);
    return 0;
}
```

Output:

```
Type = 6
int[0] = 1
int[1] = 2
int[2] = 3
```

The list still contains `1`, even though `values[0]` was changed after the list was created.

### `char` Lists

A `char` list can be created using `qNewCharList`, but it also has two additional functions for creating a `char` list from a string rather than an array of `char`s:

- `qNewCharListFromString`: create a `char` list from a null-terminated string. The length is taken from `strlen`.
- `qNewCharListFromFixedString`: create a `char` list from exactly `length` characters of a string. This is useful for taking part of a string, or for a buffer that is not null-terminated.

A `char` list is **not null-terminated**: its data is exactly `length` characters. Passing `(char *)obj->list` to a function that expects a C string, such as `printf("%s", ...)`, reads past the end of the list. Use the length instead, for example with `%.*s`:

```c
#include <stdio.h>
#include "q.h"

int main(void) {
    QChar values[] = {'h', 'e', 'l', 'l', 'o'};
    QObj *charList = qNewCharList(values, 5);

    QObj *charListFromString = qNewCharListFromString("hello");

    QObj *charListFromFixedString = qNewCharListFromFixedString("hello world", 5);

    // Char lists are not null-terminated, so print exactly length characters
    printf("%.*s\n", (int)charList->length, (char *)charList->list);
    printf("%.*s\n", (int)charListFromString->length, (char *)charListFromString->list);
    printf("%.*s\n", (int)charListFromFixedString->length, (char *)charListFromFixedString->list);

    qDecRef(charList);
    qDecRef(charListFromString);
    qDecRef(charListFromFixedString);
    return 0;
}
```

Output:

```
hello
hello
hello
```

All three lists contain `hello`. The last one takes only the first 5 characters of `"hello world"`.

### List Allocation

The typed list creation functions use `qNewList` to allocate an uninitialised list of a given type and length:

```c
QObj *qNewList(QTypeCode type, QSize length);
```

It is available to use directly when you want to fill the elements yourself, for example to write computed values straight into the list rather than building an array first and copying it.

The elements are uninitialised, so they hold garbage until they are written. Every element must be set before the list is read or handed to kdb+.

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    // Allocate an int list with uninitialised elements
    QObj *intList = qNewList(Q_TYPE_INT, 5);

    // Initialise every element before the list is used
    QInt *list = (QInt *)intList->list;
    for (QSize i = 0; i < intList->length; i++) {
        list[i] = (QInt)(i * i);
    }

    for (QSize i = 0; i < intList->length; i++) {
        printf("int[%" PRIu64 "] = %d\n", i, qGetIntAtIndex(intList, i));
    }

    qDecRef(intList);
    return 0;
}
```

Output:

```
int[0] = 0
int[1] = 1
int[2] = 4
int[3] = 9
int[4] = 16
```

For a symbol list, every element must be an interned symbol, not a pointer to an ordinary C string. Use `qInternString` or `qInternFixedString` from [`sym.h`](https://github.com/jkane17/qlib/blob/main/doc/c/symbols.md) to intern the strings:

```c
#include <inttypes.h>
#include <stdio.h>
#include "q.h"

int main(void) {
    QObj *symList = qNewList(Q_TYPE_SYMBOL, 2);

    QSymbol *list = (QSymbol *)symList->list;
    list[0] = qInternString("abc");
    list[1] = qInternFixedString("defgh", 3);

    for (QSize i = 0; i < symList->length; i++) {
        printf("sym[%" PRIu64 "] = %s\n", i, qGetSymbolAtIndex(symList, i));
    }

    qDecRef(symList);
    return 0;
}
```

Output:

```
sym[0] = abc
sym[1] = def
```

## Conclusion

In this part, we have looked at how Q values are represented in C and how to create and read the simplest of them. The key points are:

- **Every Q value is a `QObj`.** It is a 16-byte header, with the same layout as kdb+'s `K` object, holding the value's `type`, `attr`, and reference count (`refs`). The header is followed by a union holding either an atom's value or a list's `length` and data.
- **The type code tells us how to read the value.** Many Q types share a C representation, for example a date and an int are both `int32_t`, so only the `type` field tells them apart. A negative type code is an atom, and a positive one is a list.
- **Nulls and infinities are ordinary values.** They are values of the underlying C type, not C's `NULL`, and floating-point nulls must be tested with `isnan()` rather than `==`.
- **Objects are created with the `qNew` functions and read with the `qGet` functions.** The accessors only check the type and index with `assert`, so it is worth checking what an object holds before reading it.
- **List constructors copy their values.** The C array passed in remains yours. Char lists are not null-terminated, and symbol lists hold interned strings, so the elements of a symbol list allocated with `qNewList` must come from `qInternString` or `qInternFixedString`.
- **Objects we create are ours to release** with `qDecRef` when we have finished with them.

### Next Time

So far, every value we have created has been self-contained: an atom, or a list of plain C values. In Part 2 (link does not exist yet), we look at more complex types: mixed lists, dictionaries, tables, and keyed tables. This brings two new ideas: **ownership**, meaning which code is responsible for releasing an object once it is placed inside another, and **error handling**, meaning how to find out why a creation function returned `NULL`.
