# Recursion vs Iteration in Q/KDB+

![Cover Image](./images/recursion_vs_iteration.png "Cover Image")

Mathematically, recursion and iteration both describe the repeated application of a rule to successive results. In programming, they often produce identical outputs and can frequently be used to express the same algorithms.

However, they are not equivalent in how they are evaluated. The difference lies in how each approach is executed internally — particularly in how state is managed and how the call stack (or lack of it) is used. These implementation details can have significant implications for performance, memory usage, and even correctness in non-trivial cases.

In Q/KDB+, where iteration is a first-class concept and functional constructs are deeply embedded in the language, the distinction becomes especially important. This blog explores the similarities between recursion and iteration, and more importantly, the practical differences in how recursive and iterative functions are defined and executed in Q.

## What is a Recursive Function

A recursive function is one that calls itself within its own body.

A recursive algorithm works by reducing a problem to a smaller (or simpler) version of itself. This process continues until a point is reached where the answer is known directly. This stopping condition is referred to as the base case.

Without a base case, the function would continue calling itself indefinitely — or more realistically, until the program exhausts the call stack and crashes.

When designing a recursive algorithm, there are two key components to consider:
- **Problem reduction**: How can the original problem be transformed into a simpler instance of the same problem?
- **Base case**: At what point can recursion stop and begin returning results back up the call stack?

### Example – Summing a List of Numbers

Suppose we are given a list of numbers and want to compute their sum.

> [!NOTE]
> This is a contrived example, since Q already provides the built-in function `sum`. The purpose here is purely illustrative.

We can define the following recursive function:

```q
// Sum a list of numbers
sumList:{[list]
    $[0<count list;
        (first list)+sumList 1_list;
        0
    ]
 }
```

And use it as follows:

```q
q)sumList 1 2 3 4 5
15
```

The function first checks whether the list contains any elements using `count`. This serves as the base case. If the list is empty (count of the list is zero), the function returns `0`.

Otherwise, the function:
1) Takes the first element (`first list`)
2) Recursively calls `sumList` on the remainder of the list (`1_list` drops the first element)
3) Adds the first element to the result of the recursive call

---

**Visualisation**

To understand what happens internally, consider:

```
sumList 1 2 3 4 5

-> 1 + sumList 2 3 4 5
    -> 2 + sumList 3 4 5
       -> 3 + sumList 4 5
            -> 4 + sumList 5
                -> 5 + sumList ()
                    -> 0
                    <- 0
                <- 5 + 0 = 5
            <- 4 + 5 = 9
        <- 3 + 9 = 12
    <- 2 + 12 = 14
<- 1 + 14 = 15
```

At the top level, we begin with `1 + sumList 2 3 4 5`. However, the addition cannot be performed until `sumList 2 3 4 5` has been evaluated.

What happens behind the scenes is that each pending addition (`1 +`, `2 +`, `3 +`, ...) is stored on the call stack while deeper recursive calls are evaluated. Once the base case is reached and `0` is returned, the function begins to unwind, resolving each stored operation in reverse order.

Each recursive call therefore consumes stack space to store:
- The function arguments
- The return address
- Any intermediate state required to complete the computation

This is the primary disadvantage of naive recursion: stack usage grows linearly with input size. For sufficiently large inputs, this can lead to stack overflow, whereas an iterative approach may avoid this cost.

---

**Improvements to `sumList`**

There are two small improvements we can make to `sumList`. 

**1. Improve the Base Case**

In the original version, the base case occurs when the list is empty. However, we can eliminate one recursive step by using a slightly stronger base case: if the list contains a single element, we simply return that element.

```q
sumList:{[list]
    $[1<count list;
        (first list)+sumList 1_list;
        first list
    ]
 } 
```

This avoids the final recursive call on an empty list.

**2. Use `.z.s` for Self-Reference**

Q provides the built-in `.z.s`, which refers to the currently executing function. Using `.z.s`, we can avoid hard-coding the function name inside its own definition:

```q
sumList:{[list]
    $[1<count list;
        (first list)+.z.s 1_list;
        first list
    ]
 }
```

Here, `.z.s` replaces the explicit call to `sumList`. This has a practical advantage: if the function is later renamed or assigned to a different symbol, the recursive call does not need to be updated. The function becomes self-contained and name-independent. Using `.z.s` is especially helpful if the function is passed around anonymously or stored in different variables.

### Why Use Recursive Algorithms?

The main advantage of recursion is clarity. Recursive solutions often mirror the structure of the problem itself, which can make them easier to design, reason about, and verify.

If input sizes are small, or performance constraints are not critical, recursion can be an elegant and expressive choice. However, when working with large datasets, especially in a performance-sensitive environment like Q/KDB+, the cost of stack growth becomes an important consideration.

## What is an Iterative Function

An iterative function is one that repeatedly applies a rule to successive results until some terminating condition is reached.

With each iteration, the intermediate result moves closer to the final answer. Once the input is exhausted (or the stopping condition is met), the computation terminates and the result is returned.

In some programming languages, particularly Lisp dialects, iteration can look like recursion. A function may call itself, but if that call appears in tail position (i.e. its result is returned directly), the compiler/interpreter can apply tail call optimisation (TCO).

With TCO, the runtime does not allocate a new stack frame for the recursive call. Instead, it reuses the current frame and updates the state. Although the code is written recursively, it executes as an iterative process.

Q/KDB+, however, takes a different approach. Iteration is explicit and built into the language via higher-order functions such as:
- `over` (`/`)
- `scan` (`\`)

These constructs express iteration directly, without relying on recursion.

### Example

Returning to the earlier example of summing a list of numbers, we can define an iterative version:

```q
sumList:({x+y}/)
```

And use it as before:

```q
q)sumList 1 2 3 4 5
15
```

Here:
- `{x+y}` is a small binary lambda.
- Applying `/` transforms it into an iterator using *over*.
- The surrounding parentheses ensure the function is treated as unary, since `/` is overloaded and also has a binary form.

In this case, `/` acts as a left fold (accumulate). Iteration stops once all elements in the list have been consumed.

---

**Visualisation**

To understand what happens conceptually:

```
sumList 1 2 3 4 5

-> {x + y}/ 1 2 3 4 5
-> {1 + y}/ 2 3 4 5
-> {1 + 2}/ 3 4 5
-> {3 + 3}/ 4 5
-> {6 + 4}/ 5
-> {10 + 5}/ ()
-> 15
```

Within the lambda:
- `x` represents the accumulated value so far.
- `y` represents the next element of the list.

On the first step, there is no prior accumulated value, so `x` is set to the first element (`1`). Each subsequent iteration combines the accumulated result with the next value and updates `x` accordingly.

Unlike recursion, there is no growing chain of deferred operations waiting on the call stack. Only the current accumulated value needs to be retained.

---

**Improvements to `sumList`**

The explicit lambda `{x+y}` helps illustrate what is happening, but we can simplify further:

```q
sumList:(+/)
```

This is exactly how `sum` was historically defined.

>[!NOTE]
> From version 4.0, `sum` is implemented internally to allow implicit parellisation.

The related operator `scan` (`\`) performs the same iteration but returns all intermediate accumulated results:

```q
q)(+\) 1 2 3 4 5
1 3 6 10 15

// sums is equivalent
q)sums
(+\)

q)sums 1 2 3 4 5
1 3 6 10 15
```

Where `/` returns only the final result, `\` returns the entire sequence of intermediate states.

### Why Use Iterative Algorithms?

An iterative approach stores only the current state (for example, the accumulated value in `sumList`). It does not require one stack frame per element, and therefore has constant stack usage.

In Q/KDB+, iteration via `/` and `\` is typically:
- More memory-efficient
- Faster
- More idiomatic

Recursive solutions can sometimes feel more direct when modelling a problem structurally. However, for large inputs or performance-sensitive workloads, which are common in KDB+ environments, explicit iteration is generally preferred.

## Comparing Performance of Recursive & Iterative Algorithms

### `sumList`

Let us compare the recursive and iterative implementations of `sumList`:

```q
// Create list
q)list:til 1000

// Results equal
q)sumListRecursive list
499500
q)sumListIterative list
499500

// Time and sapce
q)\ts:1000 sumListRecursive list
234 5468128
q)\ts:1000 sumListIterative list
0 560
```

Both implementations produce the same result. However, the performance characteristics differ dramatically.

The recursive version:
- Takes significantly longer to execute
- Allocates substantially more memory

By contrast, the iterative version using `/` is both faster and far more memory-efficient.

The difference in memory usage reflects stack growth in the recursive implementation. Each recursive call consumes additional stack space, whereas the iterative version maintains only the current accumulated state.

If we increase the size of the input, the problem becomes even clearer:

```q
q)list:til 10000

q)sumListRecursive list
'stack
```

For sufficiently large inputs, the recursive implementation exhausts the stack and fails. The iterative version does not suffer from this limitation.

---

**Confirming That Q Does Not Apply Tail Call Optimisation**

We can further confirm that Q does not perform tail call optimisation (TCO) by testing a tail-recursive version of `sumList`.

```q
sumListRecursive:{sumListAcc[x;0];}

sumListAcc:{[list;acc]
    $[0<count list;
        .z.s[1_list; acc+first list];
        acc
    ]
 }
```

Although this function is structurally tail-recursive (the recursive call is in tail position) it still overflows the stack for large inputs:

```q
q)list:til 10000

q)sumListRecursive list
'stack
```

If Q implemented TCO, this version would execute in constant stack space. The fact that it still fails demonstrates that Q does not eliminate stack frames for tail calls.

### Factorial

The factorial of a number *n*, denoted \\(n!\\), is defined as the product of all positive integers less than or equal to *n*:

\\[
n! = n \times (n - 1) \times (n - 2) \times ... \times 1
\\]

By definition, \\(0! = 1\\).

This mathematical definition translates directly into a recursive algorithm:

```q
factorialRecursive:{[n] $[n>1; n*.z.s n-1; 1]};
```

If `n` is greater than 1, we multiply `n` by the factorial of `n-1`. Otherwise, we return 1.

The iterative version computes the product of all integers from 1 to *n*:

```q
factorialIterative:{[n] (*/) 1+til n};
```

Here:
- `til n` produces `0 1 2 ... n-1`
- `1+til n` shifts this to `1 2 ... n`
- `*/` performs an *over* using multiplication

---

**Comparison**

```q
// Results equal
q)factorialRecursive 20
2432902008176640000
q)factorialIterative 20
2432902008176640000

// Time and sapce
q)\ts:100000 factorialRecursive 20
234 1728
q)\ts:100000 factorialIterative 20
43 672
```

Both implementations produce the same result. However, as with `sumList`, the iterative version is:
- Faster
- More memory-efficient

Even for a relatively small input such as 20, the recursive version allocates more memory due to stack growth.

### Fibonacci sequence

The Fibonacci sequence is defined by the recurrence:

\\[
F_n = F_{n - 1} + F_{n - 2}, \quad n > 1
\\]

with base cases:

\\[
F_0 = 0, \quad F_1 = 1
\\]

Because the definition itself is recursive, it translates directly into a recursive function:

```q
fibRecursive:{[n] $[n>1; .z.s[n-1]+.z.s n-2; n]};
```

If `n > 1`, we sum the two preceding Fibonacci numbers. Otherwise, we return `n`, which correctly handles the base cases `0` and `1`.

**Iterative Form**

The iterative version is less obvious.

Since each term depends only on the previous two, we can maintain a state consisting of the last two values. Starting with:

```q
q)x:0 1
```

The next term is simply:

```q
q)sum x
1
```

To move forward, we update the state by:
- Dropping the first element
- Appending the new sum

Conceptually:

```q
// 1st iteration
q)show x:(x 1;sum x)
1 1

// 2nd iteration
q)show x:(x 1;sum x)
1 2

// 3rd iteration
q)show x:(x 1;sum x)
2 3

// 4th iteration
q)show x:(x 1;sum x)
3 5

..
```

At each step, `x` always holds the two most recent Fibonacci numbers.

**Using the *do* Form of `/`**

If we want the 10th Fibonacci number, we must iterate \\(n − 1\\) times, since the initial state already contains the first two terms (`0 1`).

The *do* form of `/` takes:
- A fixed number of iterations
- An initial state

We can compute:

```q
q){(x 1;sum x)}/[9;0 1]
34 55
```

This returns the 9th and 10th Fibonacci numbers. To obtain the 10th term:

```q
q)last {(x 1;sum x)}/[9;0 1]
55
```

**Handling the Edge Case**

If \\(n = 0\\), we should return `0`. However:

```q
q)last {(x 1;sum x)}/[-1;0 1]
1
```

When the iteration count is zero or negative, `/` simply returns the initial state (`0 1`). Taking `last` therefore returns `1`, which is incorrect for \\(F_0\\).

We handle this explicitly:

```q
fibIterative:{[n] $[n<1; n; last {(x 1;sum x)}/[n-1;0 1]]};
```

---

**Comparison**

```q
// Results equal
q)fibRecursive 25
75025
q)fibIterative 25
75025

// Time and sapce
q)\ts:100 fibRecursive 25
2424 2512
q)\ts:100 fibIterative 25
0 560
```

The iterative version is dramatically more efficient.

This difference is not just due to stack usage.

The naive recursive Fibonacci implementation performs massive recomputation. For example:

```
fib[5]

-> fib[3] + fib[4]
    -> (fib[1] + fib[2]) + (fib[2] + fib[3])
        -> ..
```

The same values are recalculated repeatedly:
- `fib[3]` appears multiple times
- `fib[2]` appears multiple times
- and so on

This leads to exponential time complexity.

By contrast, the iterative version computes each Fibonacci number exactly once, resulting in linear time complexity.

### Exponentiation

Exponentiation is repeated multiplication of a base *b* by itself *n* times:

\\[
    b^n = b \times b \times ... \times b \quad \text{(n times)}
\\]

with the base case:

\\[
    b^0 = 1
\\]

A naive implementation would require \\(O(n)\\) multiplications. However, we can use exponentiation by squaring, which reduces the complexity to \\(O(\log n)\\):

\\[
\begin{align*}
    b^n &= b^\frac{n}{2} \times b^\frac{n}{2} \quad \text{if n is even} \\\\
    b^n &= b \times b^{n - 1} \quad \text{if n is odd} 
\end{align*}
\\]

**Recursive Implementation**

This definition translates naturally into a recursive function:

```q
expRecursive:{[b;n]
    $[
        n=0; 1;
        0=n mod 2; {x*x} .z.s[b;n div 2];
        b*.z.s[b;n-1]
    ]
 };
```

- If \\(n = 0\\), return `1`
- If *n* is even, compute \\(b^\frac{n}{2}\\) and square it
- If *n* is odd, compute \\(b \times b^{n - 1}\\)

Because each recursive step roughly halves *n*, the recursion depth is \\(O(\log ⁡n)\\).

**Iterative Implementation (*while* Form of `/`)**

We can implement the same logic iteratively using the *while* form of `/`.

```q
expIterative:{[b;n]
    last {
        b:x 0; n:x 1; a:x 2; 
        $[0=n mod 2;
            (b*b; n div 2; a);
            (b; n-1; b*a)
        ]
    }/[{0<x 1}; (b;n;1)]
 };
```

Here:
- The state is a list `(b; n; a)` where:
    - `b` is the current base
    - `n` is the remaining exponent
    - `a` is the accumulated result
- The predicate `{0<x 1}` checks whether \\(n > 0\\)
- On each iteration:
    - If `n` is even, we square `b` and halve `n`
    - If `n` is odd, we multiply the accumulator and decrement `n`

This mirrors the recursive structure closely, but expresses it as an explicit state transition.

---

**Comparison**

```q
// Results equal
q)expRecursive[2;10]
1024
q)expIterative[2;10]
1024

// Time and sapce
q)\ts:100000 expRecursive[2;10]
286 928
q)\ts:100000 expIterative[2;10]
402 928
```

Interestingly:
- Both implementations use the same amount of memory.
- The recursive version is slightly faster in this case.

This differs from earlier examples. Why?

Because:
- Recursion depth is only \\(O(\log ⁡n)\\)
- There is no exponential recomputation
- The recursive structure is compact and direct

Here, recursion is not inherently inefficient.

---

**A More Idiomatic Iterative Version**

The previous iterative implementation was intentionally written to mirror the recursive algorithm as closely as possible.

However, in Q we can write a much simpler version:

```q
expIterativeBetter:{[b;n] (*/) n#b};
```

This constructs a list of `n` copies of `b` and multiplies them using `*/`.

While this version:
- Allocates a list of length `n`
- Has \\(O(n)\\) time complexity

it is still highly optimised in Q and performs very well:

```q
// Time and sapce
q)\ts:100000 expIterativeBetter[2;10]
26 960
```

It uses slightly more memory due to `n#b`, but benefits from highly optimised vector operations.

## Conclusion

Recursion and iteration are mathematically equivalent, but in Q/KDB+ they are not equivalent in execution.

From the examples we saw:
- Naive recursion grows the stack linearly (`sumList`).
- Tail recursion does not help, because Q does not implement tail call optimisation.
- Recursive Fibonacci is inefficient both due to stack growth and repeated recomputation.
- Recursive exponentiation performs well because its depth is logarithmic.
- Vectorised primitives are typically the most efficient approach.

The key lesson is not simply that iteration is faster than recursion. Performance depends on:
- Algorithmic complexity
- Recursion depth
- How well the solution maps to Q’s built-in vector operations

In practice, idiomatic Q favours explicit iteration (`/`, `\`) and vector primitives. Recursion can be elegant and expressive, but it must be used with an understanding of its stack behaviour and performance implications.

Writing efficient Q is ultimately about choosing the execution model that fits the problem — not just the mathematical definition.
