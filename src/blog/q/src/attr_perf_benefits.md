# Performance Benefits of KDB+ Attributes

![Cover Image](./images/attr_perf_benefits.png "Cover Image")

Attributes in KDB+ are powerful performance optimisations that can dramatically accelerate queries on large datasets. In this blog, we'll dive into the tangible performance benefits they offer - measuring real-world improvements in speed and efficiency. If you're new to attributes or want a refresher on their mechanics and use cases, check out my [previous blog post](./attributes.md)  for a detailed introduction.

> [!NOTE]
> * Results were generated using Q/KDB+ version 4.1 (2025.04.28).
> * Times are shown in milliseconds and space in megabytes.
> * Figures are shown to three significant figures.

## Basic List Operations

To understand the impact of attributes on performance, we begin by analysing basic list operations.

Each test followed this methodology:

1) A sorted list of *N* unique elements was created using `til N`.

2) For binary operations, a random element from the list was selected as the second operand.

3) The operation was executed on the list without any attribute, then repeated with each attribute applied.

4) Steps 2–3 were repeated multiple times, and the average execution time was recorded for accuracy.

In addition to the primary list type, I also tested two other structures:
* A unique, unsorted list generated using `neg[N]?N` (list is sorted when applying *sorted* and *parted* attributes).
* A non-unique, unsorted list generated using `N?N div 4` (*unique* attribute excluded for this case).

This allows us to determine if the underlying structure of the list affects performance trends. Unless otherwise noted, the trends were consistent across list types.

### Comparison Operators

KDB+ provides several standard comparison operators, familiar to users of other languages:

| Operator | Description |
| - | - |
| `=` | Equal |
| `<>` | Not Equal |
| `<` | Less Than |
| `>` | Greater Than |
| `<=` | Less Than or Equal |
| `>=` | Greater Than or Equal |

#### How the Sorted Attribute Boosts Performance

The *sorted* attribute enables Q/KDB+ to use binary search instead of linear search, significantly improving performance on large lists. Consider the following example using the less than (`<`) operator:

List: `1 2 3 4 5 6 7 8 9 10`, searching for `< 7`

    1 2 3 4 5 6 7 8 9 10
            ^              // Midpoint: 5 < 7 → Search right half
    1 1 1 1 1 . . . . .

    6 7 8 9 10
        ^                  // Midpoint: 8 > 7 → Search left half
    . . 0 0 0

    6 7
    ^                      // Midpoint: 6 < 7 → Search right
    1 .

    7
    ^                      // 7 = 7 → Done
    0

The full comparison is completed in just a few steps using binary search — far faster than checking each element sequentially.

#### Equal (`=`) and Not Equal (`<>`)

| List Count | No Attribute | Sorted | Unique | Parted | Grouped |
| - | - | - | - | - | - |
| 1,000      | 0.000408 | 0.000409 | 0.000409 | 0.000411 | 0.000407  |
| 10,000     | 0.00330 | 0.00337 | 0.00335 | 0.00333 | 0.00331 |
| 100,000    | 0.0481 | 0.0485 | 0.0477 | 0.0482 | 0.0483 |
| 1,000,000   | 0.649  | 0.634  | 0.680  | 0.603  | 0.640  |
| 10,000,000  | 7.46   | 7.75   | 7.80   | 7.48   | 7.51   |
| 100,000,000 | 76.0   | 76.3   | 76.3   | 75.2   | 76.4   |

Surprisingly, the `=` and `<>` operators do not appear to benefit from any attribute — even on large lists. The operation time scales roughly linearly with list count. This behaviour contrasts sharply with other comparison operators that benefit from the *sorted* attribute.

#### Less Than (`<`) and Greater Than (`>`)

| List Count | No Attribute | Sorted | Unique | Parted | Grouped |
| - | - | - | - | - | - |
| 1,000       | 0.00169 | 0.00137 | 0.00176 | 0.00166 | 0.00168 |
| 10,000      | 0.0128  | 0.00239 | 0.0126  | 0.0121  | 0.0124  |
| 100,000     | 0.121   | 0.0094  | 0.117   | 0.119   | 0.123   |
| 1,000,000   | 1.455   | 0.113   | 1.46    | 1.47    | 1.46    |
| 10,000,000  | 12.8    | 1.06    | 12.8    | 13.0    | 12.9    |
| 100,000,000 | 76.9    | 5.40    | 78.3    | 79.6    | 77.4    |

These results clearly demonstrate the benefit of the *sorted* attribute for range-based comparisons. The performance gain becomes increasingly significant as the data volume grows, thanks to binary search.

#### Less Than Or Equal (`<`=) and Greater Than Or Equal (`>=`)

| List Count | No Attribute | Sorted | Unique | Parted | Grouped |
| - | - | - | - | - | - |
| 1,000       | 0.000724 | 0.000530 | 0.000747 | 0.000712 | 0.000710 |
| 10,000      | 0.0113   | 0.00268  | 0.0113   | 0.0111   | 0.0117   |
| 100,000     | 0.131    | 0.0186   | 0.137    | 0.134    | 0.132    |
| 1,000,000   | 1.633    | 0.312    | 1.651    | 1.661    | 1.658    |
| 10,000,000  | 16.4     | 3.20     | 16.4     | 16.6     | 16.3     |
| 100,000,000 | 79.3     | 16.4     | 77.7     | 78.6     | 78.2     |

These compound comparisons also benefit from the *sorted* attribute, although not as dramatically as their strict counterparts. This is likely because the equality portion of the operation introduces a slight overhead compared to strict inequality.

### The Find Operator (`?`)

The find operator (`?`) searches for an item in a list. If found, it returns the **index of the first occurrence**. If not found, it returns the **count of the list**, which is one past the last index.

| List Count | No Attribute | Sorted | Unique | Parted | Grouped |
| - | - | - | - | - | - |
| 1,000       | 0.000452 | 0.000350 | 0.000302 | 0.000318 | 0.000300 |
| 10,000      | 0.00243  | 0.000435 | 0.000331 | 0.000369 | 0.000348 |
| 100,000     | 0.0196   | 0.000361 | 0.000258 | 0.000269 | 0.000265 |
| 1,000,000   | 0.224    | 0.000361 | 0.000244 | 0.000279 | 0.000250 |
| 10,000,000  | 2.80     | 0.000339 | 0.000240 | 0.000253 | 0.000242 |
| 100,000,000 | 31.1     | 0.000401 | 0.000249 | 0.000256 | 0.000284 |

The find operation shows dramatic performance improvements when using any of the attributes. The *unique*, *parted*, and *grouped* attributes offer nearly 2× better performance than *sorted* for a list with 100 million elements.

However, these three attributes require additional overhead to store internal structures (such as hash maps), whereas the *sorted* attribute does not require any extra space — making it a more lightweight option when applicable.

### Minimum (`min`) and Maximum (`max`)

The `min` and `max` functions return the smallest and largest elements in a list, respectively.

| List Count | No Attribute | Sorted | Unique | Parted | Grouped |
| - | - | - | - | - | - |
| 1,000       | 0.000335 | 0.000102  | 0.000320 | 0.000326 | 0.000320 |  
| 10,000      | 0.00203  | 0.0000990 | 0.00204  | 0.00204  | 0.00204  | 
| 100,000     | 0.0192   | 0.000104  | 0.0192   | 0.0253   | 0.0195   | 
| 1,000,000   | 0.431    | 0.000117  | 0.242    | 0.240    | 0.222    | 
| 10,000,000  | 5.21     | 0.000109  | 4.57     | 6.04     | 4.71     | 
| 100,000,000 | 55.8     | 0.000284  | 53.1     | 59.2     | 49.2     |

When a list is *sorted*, the minimum and maximum values are simply the first and last elements. This makes these operations constant time, regardless of list count, as reflected in the table above.

Other attributes (*unique*, *parted*, *grouped*) do not show meaningful benefit.

#### Special Case: Non-Unique, Unsorted Lists

In the case of a non-unique, unsorted list, we observed a performance gain with the *parted* attribute:

| List Count | No Attribute | Sorted | Parted | Grouped |
| - | - | - | - | - |
| 1,000       | 0.000731 | 0.000259  | 0.000475 | 0.000764 |  
| 10,000      | 0.00457  | 0.000262  | 0.00112  | 0.00428  | 
| 100,000     | 0.0386   | 0.000275  | 0.0102   | 0.0396   | 
| 1,000,000   | 0.937    | 0.000223  | 0.125    | 1.29     | 
| 10,000,000  | 10.6     | 0.000281  | 1.64     | 6.61     | 
| 100,000,000 | 57.9     | 0.000147  | 20.9     | 63.1     |

This improvement likely stems from how the *parted* attribute internally manages buckets of unique values. In a non-unique list, the underlying hash map only needs to examine the keys (i.e., unique values) when computing the minimum or maximum. This subset is often much smaller than the original list, making the operation faster in practice.

### Distinct (`distinct`)

The `distinct` function returns a list of the unique elements from the input list, preserving their first occurrence.

| List Count | No Attribute | Sorted | Unique | Parted | Grouped |
| - | - | - | - | - | - |
| 1,000       | 0.00290 | 0.00370 | 0.000157 | 0.000801 | 0.0150 |  
| 10,000      | 0.0321  | 0.0342  | 0.000135 | 0.00446  | 0.0997 | 
| 100,000     | 0.439   | 0.542   | 0.000228 | 0.183    | 1.50   | 
| 1,000,000   | 6.77    | 5.82    | 0.000209 | 2.24     | 16.5   | 
| 10,000,000  | 50.5    | 40.6    | 0.000212 | 18.2     | 135    | 
| 100,000,000 | 432     | 462     | 0.000207 | 159      | 1360   |

With the *unique* attribute, the `distinct` operation becomes essentially free — the list is already composed of unique elements, so the function simply returns the list as-is. This results in constant-time performance, regardless of the list count.

The *parted* attribute also provides a significant performance boost. This is because a parted list internally maintains a hash map of unique values, so distinct can efficiently return the map’s keys, bypassing a full scan of the list.

The *sorted* attribute, by contrast, offers no substantial benefit. While sorted lists could potentially allow for early exit strategies or linear scanning, this doesn't appear to be leveraged in the current implementation.

Surprisingly, the *grouped* attribute — despite also maintaining a hash map — performs worse than having no attribute at all. The reason for this is unclear. It may be due to internal overheads in the way grouped lists are structured or accessed.

#### Special Case: Non-Unique, Unsorted Lists

When applied to a non-unique, unsorted list, the *parted* attribute once again offers a meaningful advantage:

| List Count | No Attribute | Sorted | Parted | Grouped |
| - | - | - | - | - |
| 1,000       | 0.00341 | 0.00237 | 0.000271 | 0.00219 |  
| 10,000      | 0.0257  | 0.0347  | 0.000685 | 0.0187  | 
| 100,000     | 0.454   | 0.576   | 0.0177   | 0.466   | 
| 1,000,000   | 7.03    | 8.28    | 0.483    | 4.73    | 
| 10,000,000  | 58.9    | 52.0    | 3.76     | 24.1    | 
| 100,000,000 | 1330    | 537     | 34.3     | 347     |

In this case, the *parted* attribute delivers a ~5× improvement compared to the normal case (unique, sorted list). This confirms that *parted* is particularly effective for lists with high duplication, where the internal hash structure enables fast access to the unique keys.

## Disk Read Operations

Up to this point, we’ve explored how attributes affect in-memory lists. While useful for illustration, the more common real-world application of attributes is in on-disk (splayed) tables — particularly to optimise disk reads, which are far more costly than memory access.

In this section, we evaluate a few basic queries to see how disk read performance is affected by applying attributes to specific columns.

For the tests, I created several splayed tables with the following schema, each containing a different number of rows:

```q
// Schema
([] time:`timestamp$(); sym:`symbol$(); price:`float$(); size:`long$(); side:`char$())
```

### Query: `time > randTime`

In time-series data, the *time* column typically arrives in order, making it a good candidate for the *sorted* attribute. This query selects *sym* and *price* for rows where the time is greater than a randomly chosen timestamp:

```q
randTime:exec rand time from table
select sym, price from table where time>randTime
```

Both execution time and memory usage (space) was measured for two cases: with and without the *sorted* attribute on the time column.

| Row Count | No Attribute (Time) | Sorted (Time) | No Attribute (Space) | Sorted (Space) |
| - | - | - | - | - |
| 100,000     | 36.0 | 26.3 | 0.374 | 0.250 |
| 1,000,000   | 168  | 88.7 | 12.0  | 8.00  |
| 10,000,000  | 1780 | 1140 | 192   | 128   |
| 100,000,000 | 7210 | 1098 | 384   | 256   |

The *sorted* attribute yields substantial improvements in both speed and memory efficiency. This is due to the underlying binary search strategy enabled by sorted data, which minimises disk reads.

### Query: `time = randTime`

In earlier in-memory tests, we observed that the `=` operator did not benefit from the *sorted* attribute. Here, we test whether that holds true for on-disk tables:

```q
select sym, price from table where time=randTime
```

| Row Count | No Attribute (Time) | Sorted (Time) | No Attribute (Space) | Sorted (Space) |
| - | - | - | - | - |
| 100,000     | 13.0 | 16.5 | 0.125 | 0.000458 |
| 1,000,000   | 100  | 20.2 | 1.00  | 0.000458 |
| 10,000,000  | 560  | 20.8 | 16.0  | 0.000458 |
| 100,000,000 | 5030 | 18.4 | 128   | 0.000458 |

Interestingly, when querying on-disk data, `=` benefits greatly from the *sorted* attribute — both in speed and memory usage. This is a contrast to the in-memory case, and it highlights how Q's columnar storage and I/O behaviour differ between memory and disk.

### Query: `sym = randSym`

The *sym* column is one of the most commonly queried columns in KDB+, often representing stock tickers or instrument identifiers. Due to its high selectivity and frequent use in filters, it is a natural candidate for attribute optimisation.

In this test, we query for all rows where *sym* equals a randomly selected symbol:

```q
randSym:exec rand sym from table
select time, side from table where sym=randSym
```

We evaluate four cases based on the attribute applied to the *sym* column: No Attribute, *Sorted*, *Parted*, and *Grouped*.

#### Time

| Row Count | No Attribute | Sorted | Parted | Grouped |
| - | - | - | - | - |
| 100,000     | 21.1 | 16.0 | 15.2 | 28.6 |
| 1,000,000   | 106  | 22.4 | 24.7 | 19.9 |
| 10,000,000  | 526  | 17.5 | 16.2 | 15.4 |
| 100,000,000 | 6200 | 22.3 | 14.3 | 31.6 |

All three attributes — *sorted*, *parted*, and *grouped* — offer significant speedups over the unoptimised case. Of these, the *parted* attribute delivers the best performance at scale. This aligns with best practices in KDB+, where the *sym* column in on-disk tables is often *parted* to optimise equality-based filters.

#### Space

| Row Count | No Attribute | Sorted | Parted | Grouped |
| - | - | - | - | - |
| 100,000     | 1.13 | 0.000946 | 0.000946 | 0.00140 |
| 1,000,000   | 9.00 | 0.00259  | 0.00259  | 0.00452 |
| 10,000,000  | 144  | 0.0356   | 0.0356   | 0.0668  |
| 100,000,000 | 1150 | 0.282    | 0.282    | 0.532   |

Using attributes also leads to drastic reductions in memory usage — by orders of magnitude. Notably, *sorted* and *parted* produce identical memory footprints, suggesting similar internal mechanisms in how the filter is executed. *Grouped* shows more memory use but still vastly outperforms the baseline.

### Query: `max price by sym`

A common and often costly query pattern in KDB+ involves performing aggregations by a column — typically *sym*. These `select ... by ...` queries group data based on distinct values of a column, then apply an aggregation such as `max`, `min`, or `avg`.

For this test, we perform a simple aggregation: finding the maximum price for each symbol.

```q
select max price by sym from table
```

We again compare performance across four attribute configurations for the *sym* column: No Attribute, *Sorted*, *Parted*, and *Grouped*.

#### Time

| Row Count | No Attribute | Sorted | Parted | Grouped |
| - | - | - | - | - |
| 100,000     | 31.6  | 38.4  | 15.4 | 30.6  |
| 1,000,000   | 224   | 131   | 76.1 | 134   |
| 10,000,000  | 1130  | 1080  | 543  | 1130  |
| 100,000,000 | 12400 | 12300 | 5090 | 12200 |

The *parted* attribute yields the most significant performance improvement. This is because a *parted* column is already physically grouped by its unique values, allowing the aggregation to operate directly on these pre-formed groups without needing to reorganise the data.

In contrast, *sorted* and *grouped* offer no meaningful performance advantage over the unoptimised case in this scenario.

#### Space

| Row Count | No Attribute | Sorted | Parted | Grouped |
| - | - | - | - | - |
| 100,000     | 1.13 | 1.06 | 0.313 | 1.13 |
| 1,000,000   | 8.13 | 8.06 | 0.313 | 8.13 |
| 10,000,000  | 128  | 128  | 0.313 | 128  |
| 100,000,000 | 1024 | 1024 | 0.313 | 1024 |

When using the *parted* attribute, memory usage remains constant regardless of dataset size. This suggests that no additional memory is consumed during grouping — likely because the data is already partitioned, and aggregation can proceed without intermediate allocation.

## Conclusion

KDB+ attributes offer a powerful way to optimise query performance by influencing how data is accessed and retrieved. As we’ve seen, each attribute — *sorted*, *unique*, *parted*, and *grouped* — serves a specific purpose and can dramatically reduce query times when applied appropriately. Whether it's enabling binary search through a *sorted* list, ensuring fast membership checks via *unique*, or accelerating group-based operations with *parted* and *grouped*, attributes are key to writing high-performance Q code.
