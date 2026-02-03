# Performance Costs of KDB+ Attributes

![Cover Image](./images/attr_perf_costs.png "Cover Image")

In my [previous blog](attr_perf_benefits.md), we explored how the four KDB+ attributes - _sorted_, _unique_, _parted_, and _grouped_ - can significantly improve query performance by enabling optimised search and aggregation strategies. However, these performance gains are not without cost.

In this blog, we shift focus from performance gains to the performance costs associated with using attributes — specifically, their time and memory overheads. While attributes can make queries faster, they can also introduce additional processing during data updates or loading, and consume extra memory to maintain internal indexing structures such as hash maps.

Through a series of targeted benchmarks and experiments, we'll measure these overheads and derive practical models to help you predict the trade-offs. Whether you’re building real-time systems or managing large volumes of historical data, understanding the full cost profile of attributes is key to making informed design decisions in KDB+.

> [!NOTE]
> Results were generated using Q/KDB+ version 4.1 (2025.04.28).

## Complexity

Firstly, there's increased complexity in managing attributes. Certain list operations can remove an attribute, requiring developers to explicitly reapply it afterward. Failing to do so may result in unexpected performance regressions. It's essential to be aware of such cases and apply proper safeguards.

More on attribute preservation is available in my [previous blog post](attributes.md).

## Time Overhead

In addition to logical complexity, there's a time cost involved when applying or maintaining attributes.

### Applying Attributes

Applying an attribute for the first time involves validation and setup work:

- _sorted_, _unique_, and _parted_ must verify order or uniqueness.
- _unique_, _parted_, and _grouped_ require the creation of internal hash maps, which grow in size with the list.

To quantify this, we apply each attribute to a list created using `til N` and measure the average time taken:

| List Count  | Sorted (ms) | Unique (ms) | Parted (ms) | Grouped (ms) |
| ----------- | ----------- | ----------- | ----------- | ------------ |
| 1,000       | 0.000429    | 0.0246      | 0.0586      | 0.0868       |
| 10,000      | 0.000291    | 0.234       | 0.556       | 0.965        |
| 100,000     | 0.000412    | 3.33        | 9.77        | 16.1         |
| 1,000,000   | 0.000438    | 38.5        | 86.5        | 155          |
| 10,000,000  | 0.000306    | 604         | 1100        | 1610         |
| 100,000,000 | 0.000796    | 8630        | 15600       | 28100        |

These results show:

- _sorted_ is very fast to apply even for large lists.
- _unique_, _parted_, and especially _grouped_ take significantly more time, due to the hash map construction.

We repeat the test on lists of non-unique values, created using `N?N div 4`, to see how this affects performance:

| List Count  | Sorted (ms) | Parted (ms) | Grouped (ms) |
| ----------- | ----------- | ----------- | ------------ |
| 1,000       | 0.000352    | 0.00540     | 0.0247       |
| 10,000      | 0.000335    | 0.0708      | 0.252        |
| 100,000     | 0.000329    | 1.13        | 3.00         |
| 1,000,000   | 0.000542    | 11.9        | 24.8         |
| 10,000,000  | 0.000610    | 304         | 457          |
| 100,000,000 | 0.000357    | 2920        | 4590         |

For a non-unique list, applying _parted_ and _grouped_ is faster — likely due to fewer unique keys, leading to smaller hash maps and lower memory requirements.

> [!NOTE]
> If attributes are applied once at system start-up, these times are usually negligible. But, if attributes must be reapplied repeatedly — such as after frequent modifications — they can introduce real overhead.

### Maintaining Attributes

If you append to a list with an existing attribute and preserve the required structure (e.g., sorted order), the attribute is retained. However, maintaining it still incurs a performance cost, especially due to structure checks and hash map updates.

We measure the average append time over multiple appends, where each append added 1,000 elements until the list reached 100 million elements.

| Attribute | Average Append Time (ms) |
| --------- | ------------------------ |
| None      | 0.0102                   |
| Sorted    | 0.0117                   |
| Unique    | 0.323                    |
| Parted    | 0.0119                   |
| Grouped   | 0.680                    |

The test was also repeated for 100,000 elements appends.

| Attribute | Average Append Time (ms) |
| --------- | ------------------------ |
| None      | 0.648                    |
| Sorted    | 1.08                     |
| Unique    | 44.8                     |
| Parted    | 0.987                    |
| Grouped   | 84.5                     |

These results show that:

- _Grouped_ and _unique_ are most expensive to maintain during appends, largely due to hash map maintenance and uniqueness checks respectively.
- Larger appends incur a larger time cost.

## Space Overhead

In addition to time costs, attributes (except for _sorted_) also introduce space overhead.

The _unique_, _parted_, and _grouped_ attributes each maintain an internal hash map to support fast access, which increases memory usage. The size of this overhead depends on the list count and/or the count of unique elements.

To measure this overhead, we use the following procedure:

1. Create a list.
2. Save it to disk.
3. Record the file size using `hcount`.
4. Apply the attribute.
5. Record the new file size using `hcount`.
6. Subtract the original size to calculate the overhead.

### Unique

The overhead introduced by the _unique_ attribute depends solely on the count of the list, regardless of the data values.

We measured this by applying the _unique_ attribute to lists of increasing count (1 to 10,000 elements), and plotted the results:

![Impact of List Count on Unique Attribute Overhead](../images/unique_attr_overhead.png "Impact of List Count on Unique Attribute Overhead")

The resulting step-wise growth pattern occurs because KDB+ uses a buddy memory allocation system. When the current memory block is insufficient for the hash map, the system allocates a new block twice as large, causing jumps in overhead.

Interestingly, within each step, the overhead decreases linearly as list count increases — likely due to more efficient packing of the hash structure relative to the allocated memory.

A portion of the data is shown below:

| List Count | Overhead (Bytes) |
| ---------- | ---------------- |
| 0          | 0                |
| **1**      | **16**           |
| **2**      | **32**           |
| 3          | 72               |
| **4**      | **64**           |
| 5          | 152              |
| 6          | 144              |
| 7          | 136              |
| **8**      | **128**          |
| 9          | 312              |
| ..         | ..               |
| **16**     | **256**          |
| 17         | 632              |
| ..         | ..               |

**Deriving a Formula**

To generalise the memory overhead of the _unique_ attribute, we begin by defining _p_ as the next power of 2 greater than or equal to the list count _n_:

\\[
p = 2 ^ {\lceil \log_{2}{n} \rceil}
\\]

From the observed data, we note that whenever the list count _n_ is an exact power of 2 (e.g., 1, 2, 4, 8, 16...), the overhead aligns with:

\\[
\text{overhead} = 16n \quad \text{where} \space \space n = 2^k, \space \space k \in \mathbb{Z}_{\ge 0}
\\]

This gives us the base overhead at each power-of-2 boundary. Between those boundaries — that is, for values of _n_ such that \\(n \in (p/2, p)\\) — the overhead decreases by 8 bytes for every step closer to _p_. This decreasing pattern suggests the adjustment term:

\\[
8(n - p)
\\]

To express the general formula for any list count _n_, we substitute the fixed power-of-2 overhead (_16n_) with _16p_, since _p_ is the power of 2 the list will eventually "grow into". Applying the adjustment term, the formula becomes:

\\[
\begin{align*}
    \text{overhead} &= 16p - 8(n - p) \\\\
                    &= 8(3p - n)
\end{align*}
\\]

This can be computed in Q with:

```q
nextPower2:{[n] "j"$2 xexp ceiling 2 xlog n}

uniqueOverhead:{[n] 8*(3*nextPower2 n)-n}
```

Example usage:

```q
q)uniqueOverhead 1+til 10
16 32 72 64 152 144 136 128 312 304
```

### Parted

The overhead of the _parted_ attribute depends primarily on the count of unique elements in the list. This is because the internal hash map stores each unique value along with the index of its first occurrence.

To analyse this, we tested 10,000-element lists with varying counts of unique values, from 1 to 10,000.

![Impact of Unique Value Count on Parted Attribute Overhead](../images/parted_attr_overhead.png "Impact of Unique Value Count on Parted Attribute Overhead")

As with the _unique_ attribute, we observe a step pattern, which results from KDB+ allocating memory in powers of 2 (buddy allocation system).

Between each step, the overhead increases linearly with the count of unique values.

A portion of the results is shown below:

| Count of Unique Values | Overhead (Bytes) |
| ---------------------- | ---------------- |
| 1                      | 72               |
| 2                      | 104              |
| 3                      | 160              |
| 4                      | 168              |
| 5                      | 272              |
| 6                      | 280              |
| 7                      | 288              |
| 8                      | 296              |
| 9                      | 496              |
| ..                     | ..               |
| 15                     | 544              |
| 16                     | 552              |
| 17                     | 944              |
| ..                     | ..               |

From this table, we see that at powers of 2 (1, 2, 4, 8, 16), the overheads are:

    u:           1  2   4   8   16
    overhead:    72 104 168 296 552

Subtracting a constant base of 40 bytes (likely fixed overhead for the hash structure) gives:

    32, 64, 128, 256, 512 = 32 × (1, 2, 4, 8, 16)

This suggests the overhead at powers of 2 follows:

\\[
\text{overhead} = 40 + 32p
\\]

where

\\[
p = 2 ^ {\lceil \log_{2}{u} \rceil}
\\]

and _u_ is the count of unique values in the list.

**General Formula**

For non-power-of-2 _u_, we observe that the overhead increases by 8 bytes with each additional unique value until the next power-of-2 threshold. This incremental cost can be modelled as:

\\[
8(u - p)
\\]

Putting it all together, the complete formula becomes:

\\[
\begin{align*}
    \text{overhead} &= 40 + 32p + 8(u - p) \\\\
                    &= 8(3p + u + 5)
\end{align*}
\\]

In Q, it can be implemented as:

```q
partedOverhead:{[u] 8*5+u+3*nextPower2 u}
```

Example:

```q
q)partedOverhead 1+til 10
72 104 160 168 272 280 288 296 496 504
```

### Grouped

The overhead of the _grouped_ attribute depends on both the total count of the list (_n_) and the count of unique values (_u_). Internally, KDB+ builds a hash map that stores each unique value along with the indices of all its occurrences in the list, which explains this dual dependency.

To measure the overhead, we tested lists of 10,000 and 20,000 elements with varying counts of unique values. For comparability, the 20,000-element list was tested only up to 10,000 unique values.

![Impact of List Count & Unique Value Count on Grouped Attribute Overhead](../images/grouped_attr_overhead.png "Impact of List Count & Unique Value Count on Grouped Attribute Overhead")

The chart shows two lines — one for each total list count. For a given count of unique values, the larger list incurs higher overhead, confirming that the _grouped_ attribute scales with both list count and the count of unique elements.

#### Analysing the Overhead

Let’s look at a small snippet of the results for each total list count.

**Snippet for List Count = 10,0000**

| Count of Unique Values | Overhead (Bytes) |
| ---------------------- | ---------------- |
| 1                      | 80,088           |
| 2                      | 80,120           |
| 3                      | 80,176           |
| 4                      | 80,184           |
| 5                      | 80,288           |
| 6                      | 80,296           |
| 7                      | 80,304           |
| 8                      | 80,312           |
| 9                      | 80,512           |
| ..                     | ..               |
| 15                     | 80,560           |
| 16                     | 80,568           |
| 17                     | 80,960           |
| ..                     | ..               |

At powers of 2 (1, 2, 4, 8, 16), we observe the following overheads:

    u:         1       2       4       8       16
    overhead:  80,088  80,120  80,184  80,312  80,568

Subtracting 80,056 from these values gives:

    32, 64, 128, 256, 512 = 32 × (1, 2, 4, 8, 16)

This suggests that for power-of-2 _u_, the overhead is:

\\[
\text{overhead} = 80,056 + 32𝑝
\\]

We’ll revisit the 80,056 in a moment.

**Snippet for List Count = 20,0000**

| Count of Unique Values | Overhead (Bytes) |
| ---------------------- | ---------------- |
| 1                      | 160,088          |
| 2                      | 160,120          |
| 3                      | 160,176          |
| 4                      | 160,184          |
| 5                      | 160,288          |
| 6                      | 160,296          |
| 7                      | 160,304          |
| 8                      | 160,312          |
| 9                      | 160,512          |
| ..                     | ..               |
| 15                     | 160,560          |
| 16                     | 160,568          |
| 17                     | 160,960          |
| ..                     | ..               |

Again, for powers of 2:

    u:        1        2        4        8        16
    overhead: 160,088  160,120  160,184  160,312  160,568

Subtracting 160,056 yields the same \\(32 × p\\) pattern

**Interpreting the Base Overhead**

Notice that:

- For the 10,000-element list, the offset was 80,056
- For the 20,000-element list, it was 160,056

This suggests the base overhead grows linearly with the list count. Specifically:

\\[
\begin{align*}
80,056 &= 56 + 8 × 10,000 \\\\
160,056 &= 56+8×20,000
\end{align*}
\\]

So, the general base overhead is:

\\[
base = 56 + 8n
\\]

where _n_ is the total count of the list, and 56 is likely a fixed base cost for the internal structure.

#### General Formula

For non-power-of-2 u, we again see 8-byte increments per unique value until the next power-of-2 is reached. Thus, the total overhead can be expressed as:

\\[
\begin{align*}
    \text{overhead} &= 56 + 8n + 32p + 8(u - p) \\\\
                    &= 8(3p + n + u + 7)
\end{align*}
\\]

Where:

- _n_ is the list count.
- _u_ is the count of unique values.
- _p_ is the next power of 2 greater than or equal to _u_.

**Q Implementation**

```q
groupedOverhead:{[n;u] 8*7+n+u+3*nextPower2 u}
```

Examples:

```q
q)groupedOverhead[10000;] 1+til 10
80088 80120 80176 80184 80288 80296 80304 80312 80512 80520

q)groupedOverhead[20000;] 1+til 10
160088 160120 160176 160184 160288 160296 160304 160312 160512 160520
```

> [!NOTE]
> The formulas derived for computing attribute overheads are based on the current internal implementation of KDB+. As such, they may change in future versions if the underlying architecture is modified.
> However, the methodology used to derive these formulas — through systematic measurement and pattern analysis — can still be applied to recalculate overheads if needed. The approach is general and remains valid even if the specific outcomes evolve over time.

## Conclusion

While KDB+ attributes offer powerful query optimisations, we have shown that these benefits come with measurable costs in time and memory.

We’ve seen that attributes like _unique_, _parted_, and _grouped_ maintain internal data structure — typically hash maps — that vary in size depending on both the total count of the list and the count of unique values. This leads to non-trivial memory overhead, which can scale into hundreds of megabytes or more for large datasets.

We also observed that applying attributes can incur time overhead during operations like loading, writing, or updating data — particularly for attributes that require hashing or maintaining metadata during write time.

The key takeaway is that attributes are not free. Their use should be deliberate and informed. If the expected query performance improvement outweighs the storage and update costs, they can be extremely valuable. But for infrequently queried or write-heavy data, the overhead might not justify their use.

As always with performance tuning, measure before and after, and choose the right tool for the workload.
