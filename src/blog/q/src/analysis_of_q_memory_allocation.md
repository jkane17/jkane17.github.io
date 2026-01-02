# Analysis of Q Memory Allocation

![Analysis of Q Memory Allocation Cover Image](./images/analysis_of_q_memory_allocation.png "Analysis of Q Memory Allocation Cover Image")

Memory allocation is a crucial aspect of any programming language, affecting performance and resource management. This blog delves into how the Q programming language handles memory allocation using the buddy memory allocation system.

## Buddy Memory Allocation in Q

Q uses a form of [buddy memory allocation](https://en.wikipedia.org/wiki/Buddy_memory_allocation) for its memory management. Memory is requested in chunks whose sizes are powers of two, regardless of the actual memory required by an object.

For instance, if an object needs 1,000 bytes, a block of 1,024 bytes (\\(2^{10}\\)) will be allocated. If the object grows to need 1,025 bytes, the allocated block size will increase to 2,048 bytes (\\(2^{11}\\)). This system allows efficient memory usage by minimising the frequency of allocations as objects grow.

## List Memory Usage

A long integer in Q is an 8-byte value. Thus, a list of *N* long integers requires \\(8 \times N\\) bytes of memory. We can use the `-22!` command to check the uncompressed length (in bytes) of a list.

**Example**

Creating a list of 10,000,000 long integers and viewing its memory usage:

```q
q)mylist:til 10000000

q)-22!mylist 
80000014
```

The list requires 80,000,014 bytes. The extra 14 bytes store metadata about the list, such as type, count, reference count, and attributes. This overhead is consistent across lists in Q.

```q
// A list of 2 longs : (2 * 8) + 14 = 30
q)-22!til 2
30

// A list of 5 chars : (5 * 1) + 14 = 19
q)-22!"hello"
19
```

## Heap Allocation

### Initial Memory Usage

In a fresh Q session, we can check the initial used and heap memory:

```q
q)show before:`used`heap#.Q.w[]
used| 362736
heap| 67108864
```

* **Used Memory**: Total memory currently used by all defined objects in the Q process, including internal structures.

* **Heap Memory**: Total system memory allocated to the Q process, initially 64 MB (\\(2^{26}\\) bytes).

### Dynamic Memory Allocation

As memory demands increase, the heap size will adjust accordingly. For instance, creating a list of 10,000,000 longs:

```q
q)mylist:til 10000000

q)show after:`used`heap#.Q.w[]
used| 134580608
heap| 201326592
```

The heap size increased to accommodate the list. The heap size formula in Q is:

\\[
2^{26} + 2^{n} \times x
\\]

where \\(n \ge 26\\) and *x* is 0 or 1 depending on whether the initial memory is sufficient or not.

### Example Calculation

Creating a list of 10,000,000 longs requires 80,000,014 bytes. Initially, the heap size is 64 MB. After creating the list, the heap increases to 192 MB, i.e., \\(2^{26} + 2^{27}\\) bytes.

## Used Allocation

Used memory represents the actual memory required by objects, while allocated blocks follow the buddy system.

**Example**

Comparing memory before and after list creation:

```q
q)after-before
used| 134217872
heap| 134217728
```

The increase in used memory by 134,217,872 bytes indicates the buddy system's allocation, where the block size must be a power of two, plus some overhead and memory to store the `before` dictionary (\\(134,217,872 = 134,217,728 + 144\\), where the 144 bytes is the overhead to store the `before` dictionary).

## Object Reserved Memory

Q reserves memory blocks as powers of two for objects, allowing efficient growth without frequent reallocations.

**Example**

Appending 1,000,000 longs to a list of 10,000,000 longs:

```q
q)mylist:til 10000000

q)show before:`used`heap#.Q.w[]
used| 134580512
heap| 201326592

q)mylist,:til 1000000

q)show after:`used`heap#.Q.w[]
used| 134580608
heap| 201326592

q)after-before
used| 96
heap| 0
```

The used memory barely changes, as the additional longs fit into the reserved memory of the list.

### New List Allocation

If we create a new list, Q must allocate a different memory block for it, causing a significant increase in used memory:

```q
q)newlist:til 1000000

q)show afterNewList:`used`heap#.Q.w[];
used| 142968208
heap| 201326592

q)afterNewList-after
used| 8387600
heap| 0
```

The creation of `newlist` increases the used memory by 8,387,600 bytes, reflecting the allocation of a new memory block.

## Releasing Reserved Memory

Clearing data from an object releases its memory back to the heap.

**Example**

Clearing a list:

```q
q)mylist:til 10000000

q)show before:`used`heap#.Q.w[]
used| 134579200
heap| 201326592

q)mylist:0#mylist

q)show after:`used`heap#.Q.w[]
used| 361584
heap| 201326592

q)after-before
used| -134217616
heap| 0
```

The used memory returns to its initial state.

## Garbage Collection

Q's default garbage collection mode is deferred, meaning it triggers in two cases:

* `.Q.gc[]` is called manually.
* Memory limit is hit (set with `-w` on the command line).

It is important to think about how certain operations in Q work behind the scenes when it comes to memory.

When we join items to a list using the join operator (`,`) Q will copy data from one list to the other. Therefore, at some stage, we will have two copies of the list, requiring double the memory of the original list to perform the operation.

**Example**

In a fresh Q session, we create an empty list of longs, then join 10,000,000 longs:

```q
q)mylist:"j"$()

q)show before:`used`heap#.Q.w[]
used| 362800
heap| 67108864

q)\ts mylist,:til 10000000
28 268435680

q)show after:`used`heap#.Q.w[]
used| 134580608
heap| 335544320
```

Previously, a heap size of 201,326,592 bytes was enough to accommodate our list of 10,000,000 longs. However, at one point in the join operation we will have two copies of 10,000,000 longs (20,000,000 longs in total). Therefore, we require more memory. Using the `\ts` command confirms this by showing us that the join operation used 268,435,680 bytes of memory to perform.

After this operation, the heap is unnecessarily big, consuming system resources that we do not need. We can release this unused memory back to the OS by invoking `.Q.gc[]`:

```q
q).Q.gc[] // Manual garbage collection
134217728

q)show afterGC:`used`heap#.Q.w[]
used| 134579456
heap| 201326592
```

The heap size reduces after garbage collection, freeing up system resources.

## Conclusion

Understanding memory allocation in Q, particularly through the buddy memory allocation system, provides insight into efficient memory management and helps in optimising performance. The examples illustrate how Q handles memory for lists, the impact of heap allocation, and the benefits of manual garbage collection. Moreover, it is essential to consider how operations like joining lists impact memory usage, potentially doubling the memory required during the operation and necessitating periodic garbage collection to free up resources.
