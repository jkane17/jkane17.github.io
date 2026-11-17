# C Interface for Q - Part 3

![Cover Image](./images/c_interface.webp "Cover Image")

TODO: Intro

## Adding Elements to Lists

In [Part 1](https://jkane17.github.io/blog/q/c_interface_part_1.html) and [Part 2](https://jkane17.github.io/blog/q/c_interface_part_2.html), we looked at ways to create lists and mixed lists. But, what if we already have a list and we want to add a new element to it? We can do this using one of the below functions.

> NOTE: These functions assume there are no other references to the `QObj`, as it may be reallocated during the call.

### Append a Raw Value

```c
QObj *appendValue(QObj **list, void *value);
```

`appendValue` is used to append a single raw value to a `QObj` containing a simple list.

Append a long to a list of longs:

```c
#include <inttypes.h>
#include <stdio.h>

#include "q.h"

int main(void) {
    // Create the initial list of longs
    QLong longs[] = {1, 12, 123};
    QObj *list = qNewLongList(longs, 3);

    // Append the new long value
    QLong newValue = 1234;
    list = qAppendValue(&list, &newValue);

    // Print the full list
    for (QSize i = 0; i < 4; i++)
        printf("list[%" PRIu64 "] = %" PRId64 "\n", i, qGetLongAtIndex(list, i));

    return 0;
}
```

Output:

```
list[0] = 1
list[1] = 12
list[2] = 123
list[3] = 1234
```

Because the raw value is passed as a void pointer, there is no way to verify it is the correct type and it is blindly appended to the list:

```c
#include <inttypes.h>
#include <stdio.h>

#include "q.h"

int main(void) {
    QBoolean booleans[] = {1, 0, 1};
    QObj *obj = qNewBooleanList(booleans, 3);

    int newValue = -1;
    qAppendValue(&obj, &newValue);

    for (QSize i = 0; i < 4; i++)
        printf("obj[%" PRIu64 "] = %hhu\n", i, qGetBooleanAtIndex(obj, i));

    return 0;
}
```

In the above example we append the integer `-1` to a boolean list, and its raw byte value is seen in the update list as `255` (`-1` cast to unsigned char type).

### Append a `QObj`


TODO



## Building a Shared Library

TODO

## Conclusion

TODO
