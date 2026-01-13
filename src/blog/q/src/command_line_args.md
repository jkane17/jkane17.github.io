# Command Line Arguments in Q/KDB+

![Cover Image](./images/command_line_args.png "Cover Image")

In Q/KDB+, command line arguments allow users to customise the behaviour of a session when it is started. By passing specific arguments, you can configure memory usage, port bindings, and even pre-load scripts, among other settings. This can be especially useful in automated environments or when dealing with large data sets that require specific resources.

Typically, a Q session is started by simply typing `q` in the command line or terminal:

```powershell
C:\> q
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)
```

However, Q also supports additional arguments that can be passed after the `q` invocation to modify its behaviour. The general syntax looks like this:

```powershell
q [file] [-option [params] … ]
```

## Loading Files and Directories

One of the simplest ways to initialise a Q session is by loading files or directories at start-up. The first argument you provide after invoking q is a file or directory that Q will automatically load upon launch. This is especially useful for preloading variables or scripts when starting a Q session.

For example, let's consider a file called `test.q` with the following content:

```q
a:10
```

To load this file when starting Q, simply pass it as the first argument:

```q
C:\> q test.q
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)a
10
```

As you can see, the variable `a` from `test.q` is now available in the session.

### Loading Multiple Files from a Directory

Q also allows you to load multiple scripts from a directory by passing the directory name as the argument. In this case, all Q scripts in the directory will be executed in alphabetical order.

For example, consider a directory called `test` with the following files:

```q
// test1.q
a:10
```

```q
// test2.q
b:20
```

By passing the directory `test` to the Q command, both files are loaded:

```q
C:\> q test\
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)a
10
q)b
20
```

Here, both variables `a` and `b` are accessible because `test1.q` and `test2.q` were loaded sequentially.

### Handling Non-Q Files

If the directory contains non-Q compatible files (files without `.q`, `.k`, or `.s` extensions), Q will raise an error and halt the loading process:

```q
C:\> ls test\

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        13/09/2024     12:09              4 test1.q
-a----        13/09/2024     12:09              4 test2.q
-a----        13/09/2024     12:14             17 test3.txt


C:\> q test\
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

'./test3.txt
  [0]  (.Q.lo)

 .Q )
```

To avoid such errors, ensure that all files in the directory have valid extensions like `.q`, `.k`, or `.s`.

#### File Extensions Explained

* `.q` – Extension used for Q scripts. Files with the `.q` extension contain Q code that can be executed or loaded directly into the session.

* `.k` – Extension associated with K scripts, the predecessor of Q. Files ending in `.k` can still be executed within Q, ensuring backward compatibility with older K code.

* `.s` – Extension for SQL code (not to be confused with the more common use of `.s` for assembly source code files). For more information on using SQL in Q, see [here](https://code.kx.com/insights/1.11/core/sql.html#running-sql).

### Use Case: Loading Databases

One practical and common use case for command-line arguments in Q is loading splayed or partitioned databases directly into a session. By passing the root directory of the database as an argument when launching Q, the system will automatically memory-map the data, making its contents available for immediate querying without needing to fully load it into memory.

This approach is particularly useful when working with large datasets, as memory-mapping allows Q to efficiently handle data on disk while still providing high-speed access. Here's an example:

```powershell
C:\> ls db/t

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        16/09/2024     09:55             12 .d
-a----        16/09/2024     09:55             40 a
-a----        16/09/2024     09:55             40 b
```

```q
C:\> q db/
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)t
a b
---
1 4
2 5
3 6
```

In the above example, a splayed database located at the `db/` directory is loaded. The database contains a table `t`, which is instantly available in the Q session. This makes it possible to interact with large tables or partitions of data without the overhead of fully loading them into memory, which is crucial when working with vast amounts of time-series data or transactional records.

By leveraging memory-mapping, Q ensures that only the necessary parts of the data are accessed, optimising performance while maintaining minimal memory usage. This functionality makes Q an efficient choice for handling large-scale databases, especially in financial and real-time data environments where speed and resource management are critical.

This example demonstrates how easy it is to load a splayed or partitioned database with a simple command-line argument, highlighting Q's ability to streamline database management and access.


## Built-in Options

Q provides several [built-in command line options](https://code.kx.com/q/basics/cmdline/) that allow you to control various aspects of a Q session. These options follow the format:

```
-? [param/s]
```

where `?` is replaced by a single lowercase or uppercase letter, and `[param/s]` represents optional parameters that configure the behaviour of the option.

### Example 1: Set a Listening Port with `-p`

The `-p` option allows you to set a listening port for your Q process, which is essential when running Q as a server to handle client queries. For instance, to set the port to 5000, you would use:

```q
C:\> q -p 5000
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)\p // Verify the port setting
5000i
```

To let Q choose any available ephemeral port, pass `0W` as the argument:

```q
C:\> q -p 0W
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)\p // Check which port was automatically assigned
61411i
```

Alternatively, setting `-p 0` means Q will not listen on any port (which is also the default behaviour):

```q
C:\> q -p 0
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)\p
0i
```

### Example 2: Set a Workspace Memory Limit with `-w`

Since Q is an in-memory database, it’s important to manage memory usage carefully, especially in long-running processes. The `-w` option allows you to set a memory limit, preventing the Q process from consuming excessive system resources.

To set a memory limit of 1 GB, pass `1024` (since the value is in megabytes) as an argument to `-w`:

```q
C:\> q -w 1024
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q).Q.w[]`wmax // Check memory limit (in bytes)
1073741824
```

If the process attempts to use more memory than the specified limit, it will terminate with a `-w abort` error. For example:

```q
q)til 100000000 // Create a large list of longs
'-w abort
C:\>
```

The default memory limit is 0, meaning no limit is enforced:

```q
C:\> q
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q).Q.w[]`wmax
0
```

### Example 3: Set a Query Timeout with `-T`

In server setups, Q processes can execute queries from external clients. Ill-formed or long-running queries can monopolise resources, so the `-T` option is used to set a timeout for client queries. Any query exceeding this time limit will be aborted automatically.

To set a timeout of 5 seconds, along with a listening port on 5000, you would use:

```q
C:\> q -T 5 -p 5000
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)\T // Verify the timeout setting
5i
```

Now, let’s set up another Q process to act as a client and query the server:

```q
C:\> q
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)h:hopen 5000
q)h"(0<){1+x}/1" // Infinite loop query
'stop
  [0]  h"(0<){1+x}/1"
```

The server automatically killed the query after 5 seconds and returned a `'stop` error to the client.

> **Note:** The timeout only applies to client queries. If you execute an infinite loop directly on the server itself, it will not be interrupted.

The default timeout is 0, which means no timeout is enforced:

```q
C:\> q
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)\T
0i
```

### Example 4: Changing Values After Start-Up

The built-in command-line options provided during the start of a Q session are set automatically and persist throughout the session. However, the values of most options can be modified dynamically after the session starts using *system commands*, without restarting Q. This feature adds flexibility when working in Q environments, particularly when it’s necessary to adjust settings based on runtime conditions.

For example, you can adjust the listening port (`-p`) during a session:

```q
C:\> q -p 5000
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)\p // Initially set to 5000
5000i 
q)\p 8000
q)\p // Now changed to 8000
8000i 
q).z.X // Raw command line unchanged
,"q"
"-p"
"5000"
```

In the above example, the port was initially set to 5000 using the command line, and then dynamically changed to 8000 within the Q session. Importantly, the raw command line (`.z.X`) remains unchanged, preserving the initial values passed during start-up (see [below](#example-3-custom-and-built-in-options-together) for more on `.z.X`).

You can achieve the same result using the `system` keyword to invoke system commands:

```q
C:\> q -p 5000
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)system"p" // Check current port
5000i
q)system"p 8000"
q)system"p" // Port changed to 8000
8000i
```

This approach provides more flexibility by allowing you to modify system settings dynamically, based on the needs of your application or environment. Whether you need to change the port number or other built-in options, using system commands within Q gives you control and adaptability during runtime.


## Custom Options

Q also provides the flexibility to define your own custom command line options, which follow a similar syntax to the built-in options:

```powershell
-myOpt [param/s]
```

### Reserved Single-Letter Option Names

It is important to note that Q reserves single-letter names exclusively for its built-in options. Even if a specific single-letter option is not currently in use, attempting to assign it as a custom option will result in an error. This ensures that future Q updates do not conflict with user-defined options.

```powershell
C:\> q -a 1 2 3
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

'a invalid
```

In this case, the single-letter option `-a` is reserved, and Q throws an error when trying to use it. To avoid such issues, always use multi-letter names for custom options to ensure compatibility.

### Example 1: A Single Custom Option

In this example, we pass a custom option `-myOpt` with a value of `10`:

```q
C:\> q -myOpt 10
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)
```

You can inspect the custom command line option using the `.z.x` system variable, which captures the custom options passed during start-up:

```q
q).z.x
"-myOpt"
"10"
```

Here, `.z.x` shows that the custom option `-myOpt` and its value 10 were correctly passed to the Q session.

### Example 2: Multiple Custom Options

You can also pass multiple custom options. In this example, we use two custom options, `-myOpt1` and `-myOpt2`, with values of `10` and `hello world`, respectively:

```q
C:\> q -myOpt1 10 -myOpt2 hello world
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q).z.x
"-myOpt1"
"10"
"-myOpt2"
"hello"
"world"
```

Notice that `.z.x` splits `hello world` into two separate arguments. On the command line, spaces are treated as argument separators. If you intended to pass `hello world` as a single argument, you need to wrap the argument in quotes:

```q
C:\> q -myOpt1 10 -myOpt2 'hello world'
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q).z.x
"-myOpt1"
"10"
"-myOpt2"
"hello world"
```

Now `.z.x` correctly captures `hello world` as a single argument.

### Example 3: Custom and Built-in Options Together

You can mix custom options with Q’s built-in options. In this example, we pass a custom option `-myOpt` and the built-in `-p` option to set a listening port:

```q
C:\> q -myOpt 10 -p 5000
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q).z.x
"-myOpt"
"10"
```

Here, `.z.x` only displays the custom option `-myOpt`. This is because `.z.x` is designed to capture only the custom command line options, not the built-in ones.

To view the entire command line, including built-in options, you can use `.z.X` (uppercase X), which provides the raw command line used to start the Q session:

```q
q).z.X
"C:\\q\\w64\\q.exe"
"-myOpt"
"10"
"-p"
"5000"
```

The first item in this list is the path to the Q executable, followed by all the options passed in the command line, including both custom and built-in options, in the order they were provided.


## Parsing the Command Line

`.z.x` and `.z.X` provide a way to view the options and arguments supplied at the command line. However, extracting the values manually from these strings can be cumbersome.

Fortunately, Q offers a more convenient way to parse the command line options.

### Converting to a Dictionary with `.Q.opt`

In the following example, we pass a script file `test.q`, two custom options `-myOpt1` and `-myOpt2` with values `10` and `'Hello World'`, and the built-in `-p` option with a value of `5000`:

```q
C:\> q test.q -myOpt1 10 -p 5000 -myOpt2 'Hello World'
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q).z.x
"-myOpt1"
"10"
"-myOpt2"
"Hello World"
q).Q.opt .z.x
myOpt1| "10"
myOpt2| "Hello World"
```

Applying `.Q.opt` to `.z.x` converts the options into a dictionary, mapping the option names (as symbols) to their respective values (as strings).

`.Q.opt` also works with `.z.X`, even when the first two items are the Q binary and a script file:

```q
q).z.X
"C:\\q\\w64\\q.exe"
"test.q"
"-myOpt1"
"10"
"-p"
"5000"
"-myOpt2"
"Hello World"
q).Q.opt .z.X
myOpt1| "10"
p     | "5000"
myOpt2| "Hello World"
```

### Casting and Providing Defaults with `.Q.def`

`.Q.def` allows you to provide default values for command line options. It also casts the option values to the same type as the default.

`.Q.def` takes two arguments:
* A dictionary mapping option names to their default values.
* A dictionary mapping provided option names to their values (i.e., `.Q.opt .z.X`).

#### Example 1: Casting

```q
q)show defaults:`myOpt1`myOpt2`p!(100f;`Nothing;1234)
myOpt1| 100f
myOpt2| `Nothing
p     | 1234
q).Q.def[defaults;.Q.opt .z.X]
myOpt1| 10f
myOpt2| `Hello World
p     | 5000
```

In this example, the value for `myOpt1` is cast to a float (`10f`) because the default value is a float. The value for `myOpt2` is cast to a symbol (`` `Hello World``) since the default is a symbol.

#### Example 2: Defaulting

In this example, we provide values for `myOpt2` and `p`, but omit `myOpt1`. The missing option uses the default:

```q
C:\> q test.q -p 5000 -myOpt2 'Hello World'
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)show defaults:`myOpt1`myOpt2`p!(100f;`Nothing;1234)
myOpt1| 100f
myOpt2| `Nothing
p     | 1234
q).Q.def[defaults;.Q.opt .z.X]
myOpt1| 100f
myOpt2| `Hello World
p     | 5000
```

Since `myOpt1` was not provided on the command line, `.Q.def` uses the default value `100f`.

#### Example 3: List of Arguments

`myOpt2` is cast to a symbol because its default value was a symbol (`` `Nothing``). However, it would be better if it were a string since the user’s input might include spaces.

```q
q)show defaults:`myOpt1`myOpt2`p!(100f;"Nothing";1234)
myOpt1| 100f
myOpt2| "Nothing"
p     | 1234
q)show args:.Q.def[defaults;.Q.opt .z.X]
myOpt1| 100f
myOpt2| ," "
p     | 5000
```

The value of `myOpt2` has been replaced with an enlisted null char.

When providing a default for a string type, we must ensure that the default value is enlisted so it is handled correctly by `.Q.def`:

```q
q)show defaults:`myOpt1`myOpt2`p!(100f;enlist "Nothing";1234)
myOpt1| 100f
myOpt2| ,"Nothing"
p     | 1234
q).Q.def[defaults;.Q.opt .z.X]
myOpt1| 100f
myOpt2| ,"Hello World"
p     | 5000
```

This issue does not affect other list types, for example:

```q
C:\> q -longs 1 2 3 -syms abc xyz
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)show defaults:`longs`missingLongs`syms`missingSyms!(10 20 30;8 9;`123`789;`hey`ho)
longs       | 10 20 30
missingLongs| 8 9
syms        | `123`789
missingSyms | `hey`ho
q).Q.def[defaults;.Q.opt .z.X]
longs       | 1 2 3
missingLongs| 8 9
syms        | `abc`xyz
missingSyms | `hey`ho
```

However, if you want to default to a single value but expect a list from the user, you must ensure the default is enlisted:

```q
C:\> q -longs 1 2 3
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)show defaults:`longs`missingLongs!(100;10 20 30)
longs       | 100
missingLongs| 10 20 30
q).Q.def[defaults;.Q.opt .z.X]
longs       | 1
missingLongs| 10 20 30
```

The provided values `1 2 3` were truncated to just `1` because the default was not enlisted.

```q
q)show defaults:`longs`missingLongs!(enlist 100;10 20 30)
longs       | ,100
missingLongs| 10 20 30
q).Q.def[defaults;.Q.opt .z.X]
longs       | 1  2  3
missingLongs| 10 20 30
```

### Applying Defaults to Built-in Options

In a previous example, we set `5000` as the default value for the `-p` option. If the value is not provided, we may specify a default, but it’s up to the user to actually apply these defaults:

```q
C:\> q
KDB+ 4.1 2024.03.12 Copyright (C) 1993-2024 Kx Systems
w64/ 8(24)core 32448MB ..

q)\p
0i
q)show defaults:enlist[`p]!enlist 5000
p| 5000
q).Q.def[defaults;.Q.opt .z.X]
p| 5000
q)\p
0i
q)"p ",string .Q.def[defaults;.Q.opt .z.X]`p
"p 5000"
q)system "p ",string .Q.def[defaults;.Q.opt .z.X]`p // Set the listening port
q)\p
5000i
```

## Conclusion

Parsing and handling command-line options in Q can significantly enhance the flexibility and configurability of your scripts. By using the built-in functions `.z.x`, `.z.X`, `.Q.opt`, and `.Q.def`, you can easily access, process, and apply default values to both custom and built-in options. These tools allow you to convert command-line arguments into structured data like dictionaries, cast values to appropriate types, and handle multiple arguments efficiently.

Understanding these features not only improves the maintainability of your Q code but also allows you to build scripts that can adapt to various input configurations seamlessly. Whether you are working with custom options or using default values for built-in commands, Q provides the mechanisms needed to simplify these processes, making it easier to develop dynamic and reusable Q scripts.

Incorporating these best practices into your development workflow will help ensure that your Q scripts remain robust, adaptable, and user-friendly.
