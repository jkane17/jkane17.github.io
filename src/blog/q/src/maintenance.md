# Database Maintenance in KDB+

![Cover Image](./images/maintenance.png "Cover Image")

KDB+ requires ongoing maintenance as datasets evolve and schemas change. KX provides [`dbmaint.q`](https://github.com/KxSystems/kdb/blob/master/utils/dbmaint.q) — a widely-used utility for partitioned databases. This blog walks through the original functions and re-implements them with improved efficiency, readability, and use of more modern language features.

## dbm KDB-X Module

We’ll make this script an importable module using the KDB-X module system. To use the script as a module:
1. Copy or download the [`dbm.q`](https://github.com/jkane17/qlib/blob/main/src/dbm.q) script and place it within your module search path (e.g. `/home/user/.kx/mod/qlib/dbm.q`).
2. Define the module namespace in your KDB session:
    ```q
    dbm:use`qlib.dbm // Assuming dbm.q is within .../.kx/mod/qlib/
    ```
You can find out more information about KDB-X modules in [my other blog](./kdbx_modules.md). 

### Notable Improvements

The modernised `dbm.q` provides:
* Clearer function and variable names.
* Supports splayed, partitioned, and segmented databases.
* Nested column type support.
* Parallelisation for large datasets.

## Creating a Test Database

To demonstrate the functionality, we’ll first set up a small test environment. This will include both a splayed database and a partitioned database, each containing a simple `trade` table.

```q
// Define a sample trade table
trade:([]
    time:5#.z.P;
    sym:`IBM`AMZN`GOOGL`META`SPOT;
    size:1 2 3 4 5;
    price:10 20 30 40 50f;
    company:(
        "International Business Machines Corporation";
        "Amazon.com, Inc.";
        "Alphabet Inc.";
        "Meta Platforms, Inc.";
        "Spotify Technology S.A."
    );
    moves:3 cut -5+15?10
 );

// Create a splayed DB
`:splayDB/trade/ set .Q.en[`:splayDB;trade];

// Create a partitioned database (two partitions)
{[db;dt;tname] 
    .Q.dd[db;dt,tname,`] set .Q.en[db;get tname]
 }[`:partDB;;`trade] each 2026.02.03 2026.02.04;
```

## Listing Column Names

Let’s start with something simple: returning the list of column names from a table.

In a splayed table, the column names are stored in the `.d` file inside the table’s directory (`tdir`). Reading this file gives us the column list directly.

```q
get tdir,`.d
```

For example:

```q
q)get `:splayDB/trade,`.d
`time`sym`size`price`company`moves
```

To make this reusable, we can wrap the logic in a helper function, `getColNames`. This function checks whether the `.d` file exists and, if so, reads it. Otherwise, it returns an empty symbol list.

```q
getColNames:{[tdir] $[count key .Q.dd[tdir;`.d]; get tdir,`.d; `$()]};
```

```q
q)getColNames `:splayDB/trade
`time`sym`size`price`company`moves
```

### Wrapping for General Use

Public functions are intended to work across different database layouts (splayed, partitioned, segmented). To achieve this, we usually wrap helper functions so they can be applied to every partition where needed.

For listing column names, however, it’s enough to read from just one partition (assuming schema consistency across partitions). Here’s the public version:

```q
// List all column names of the given table
listCols:{[db;tname] getColNames last allTablePaths[db;tname]};
```

where 
* `db` - Path to database root.
* `tname` - Table name.

`allTablePaths[db;tname]` retrieves all paths to the table within the database. We’ll define this utility in the next section.

### Examples

```q
q)listCols[`:splayDB;`trade]
`time`sym`size`price`company`moves

q)listCols[`:partDB;`trade]
`time`sym`size`price`company`moves
```

### Why not just use `cols`?

The built-in `cols` function works perfectly well when a table is already mapped into memory. However, `listCols` avoids having to map a database into memory unnecessarily.

## Listing Table Paths

When dealing with different database layouts, the path to a table depends on the type of database:

* **Splayed**: each table has a single directory in the database root.
* **Partitioned** (or **segmented**): the same table name usually appears once per partition.

Our "base" functions, such as `getColNames`, operate on a single splayed table path. To support partitioned and segmented databases, we first need a way to collect all table paths within a given database. This is the role of `allTablePaths`.

### Inspecting the Database Root

We can start by listing the contents of a database root (`db`) using `key`:

```q
// Files/directories in a splayed database
q)key `:splayDB
`s#`sym`trade

// Files/directories in a partitioned database
q)key `:partDB
`s#`2026.02.03`2026.02.04`sym
```

If `key` returns an empty list, the database does not exist and we can return early:

```q
if[0=count files:key db; :`$()];
```

### Identifying Partitions

Partition directories always start with a digit, since partition values must be of an integral type. We can detect these with a simple regex:

```q
where files like "[0-9]*"
```

For a splayed database this yields nothing:

```q
q)where key[`:splayDB] like "[0-9]*"
`long$()
```

For a partitioned database we get the indices of partition directories:

```q
q)where key[`:partDB] like "[0-9]*"
0 1
```

Filtering `files` down to only partitions looks like:

```q
files:key db;
files@:where files like "[0-9]*";
```

### Handling Splayed vs Partitioned

If no partitions are found, we must have a splayed database. In that case, just return the single table path (wrapped in enlist to ensure the result is always a list):

```q
enlist .Q.dd[db;tname]
```

If partitions exist, construct paths for each partition:

```q
(.Q.dd[db;] ,[;tname]@) each files
```

### Handling Segmented Databases

Segmented databases introduce one additional wrinkle: the root contains a file `par.txt` listing the paths of all underlying partitioned databases. We can handle this by reading the file and recursively calling our function for each listed path:

```q
if[any files like "par.txt"; :raze (.z.s[;tname] hsym@) each `$read0 .Q.dd[db;`par.txt]];
```

### Final Cleanup

Up to this point, we’ve blindly appended the table name to each partition path. To avoid returning non-existent directories, we filter to keep only paths that actually exist:

```q
paths where 0<(count key@) each paths
```

```q
// Get all paths to a table within a database
allTablePaths:{[db;tname]
    if[0=count files:key db; :`$()];
    if[any files like "par.txt"; :raze (.z.s[;tname] hsym@) each `$read0 .Q.dd[db;`par.txt]];
    files@:where files like "[0-9]*";
    paths:$[count files; (.Q.dd[db;] ,[;tname]@) each files; enlist .Q.dd[db;tname]];
    paths where 0<(count key@) each paths
 };
```

```q
q)allTablePaths[`:splayDB;`trade]
,`:splayDB/trade

q)allTablePaths[`:partDB;`trade]
`:partDB/2026.02.03/trade`:partDB/2026.02.04/trade

q)allTablePaths[`:nonExistingDB;`trade]
`symbol$()

q)allTablePaths[`:splayDB;`nonExistingTable]
`symbol$()

q)allTablePaths[`:partDB;`nonExistingTable]
`symbol$()
```

## Adding a New Column

To add a column to a table, create a helper `add1Col` that adds it to a single splayed directory:

```q
// Add a column to a single splayed table
add1Col:{[tdir;cname;default]
    if[not cname in colNames:getColNames tdir;
        len:count get tdir,first colNames;
        .[.Q.dd[tdir;cname];();:;len#default];
        @[tdir;`.d;,;cname]
    ]
 };
```

Line-by-line breakdown:
1) Checks that the new column name does not already exist within the table.
2) Get the count/length of the table.
3) Create the new column file, filling it with the correct number of default values to match the table count.
4) Add the new column name to the `.d` file.

### The `addCol` Wrapper

Our wrapper function will do the following:

**1. Validate the Column Name**

A name is valid if it:
- adheres to Q name formatting (no spaces, special chars, etc.); and
- is not a reserved word.

```q
isValidName:{[name] (name=.Q.id name) and not name in .Q.res,key`.q};

validateName:{[name] if[not isValidName name; '"Invalid name: ",string name]};
```

We use `.Q.id` to sanitise the name and, if it changed, then the given name did not adhere to Q name formatting. If a name is invalid, we reject it and signal an error.

**2. Handle Symbol Enumeration**

If the new column’s default values are of type symbol, they must be enumerated against the database’s symbol domain before being written to disk.

This is handled by `enum`:

```q
default:enum[db;domain;default]
```

where

```q
enum:{[db;domain;vals] $[11h=abs type vals; .Q.dd[db;domain]?vals; vals]};
```

**3. Add the Column Across All Partitions**

Finally, we apply `add1Col` to each table path.

If the database is partitioned, this will add the column to every partition directory — in parallel — using `peach`:

```q
add1Col[;cname;default] peach allTablePaths[db;tname]
```

---

Bringing it all together, we have:

```q
addCol:{[db;domain;tname;cname;default]
    validateName cname;
    default:enum[db;domain;default];
    add1Col[;cname;default] peach allTablePaths[db;tname];
 };
```

```q
q)addCol[`:splayDB;`sym;`trade;`side;`b]

q)addCol[`:partDB;`sym;`trade;`side;`b]
```

### The Symbol File

In KDB+, the symbol type is an [interned string](https://en.wikipedia.org/wiki/String_interning) — meaning that only one copy of each distinct string value is stored in memory, and all references point to that single instance.

On disk, this concept is mirrored through **enumeration**. Any symbol columns in splayed or partitioned tables must be enumerated against the **symbol file** (often referred to as sym). This file stores a global list of unique symbols used across the database.

When enumerating, KDB+ converts symbol values into integer indices corresponding to their positions in the symbol file. This ensures consistency and compactness across tables.

If a symbol column is not enumerated before saving, KDB+ will raise an error — hence why enumeration is an essential part of the column addition process.

## Deleting a Column

To delete a column, we only need to remove the column file and update the table metadata accordingly.

The process involves three straightforward steps:

1) Confirm that the column exists
    ```q
    cname in colNames:getColNames tdir
    ```
2) Delete the column file:
    ```q
    hdel .Q.dd[tdir;cname]
    ```
3) Update the `.d` file
    ```q
    @[tdir;`.d;:;colNames except cname]
    ```

### Nested Columns

The original `dbmaint.q` script did not handle nested column types, which require a bit of extra care.

In KDB+, nested columns can be splayed as long as they contain only simple lists (e.g. strings, longs). When a nested column is splayed, it’s actually stored as two files:
* one named after the column itself, and
* another with the same name suffixed by the `#` character.

For example, our `trade` table contains two nested columns — `company` (a list of strings) and `moves` (a list of longs):

```q
q)key `:splayDB/trade
`s#`.d`company`company#`moves`moves#`price`size`sym`time
```

As shown, each nested column (`company`, `moves`) has two associated files: the main column file and the hash-suffixed file (`company#`, `moves#`).

When adding nested columns, we did not need to explicitly handle this case — KDB+ automatically creates both files when saving a nested column to disk.

However, when deleting a column, we must ensure that the accompanying "hash column" (`colname#`) is also removed.

We can achieve this by checking if the hash file exists and deleting it:

```q
if[(hname:`$string[cname],"#") in key tdir; hdel .Q.dd[tdir;hname]]
```

### Putting It All Together

We can now define a helper function to delete a column — including nested columns — from a **single splayed table**:

```q
// Delete a column from a single splayed table
del1Col:{[tdir;cname]
    if[cname in colNames:getColNames tdir;
        hdel .Q.dd[tdir;cname];
        if[(hname:`$string[cname],"#") in key tdir; hdel .Q.dd[tdir;hname]];
        @[tdir;`.d;:;colNames except cname]
    ]
 };
```

If the database is partitioned, we need to repeat this operation for every partition.

To handle that, we define a simple wrapper function `delCol` that applies `del1Col` across all partition paths:

```q
delCol:{[db;tname;cname] del1Col[;cname] peach allTablePaths[db;tname];};
```

```q
q)delCol[`:splayDB;`trade;`side]

q)delCol[`:partDB;`trade;`side]

// Delete nested
q)delCol[`:splayDB;`trade;`moves]

q)delCol[`:partDB;`trade;`moves]
```

## Copying a Column

Copying a column involves three steps:

**1. Verify that the column can be copied**
- The source column must exist.
- The destination column must not already exist.

```q
(srcCol in colNames) and not dstCol in colNames:getColNames tdir
```

**2. Copy the underlying column files**
- For simple columns, this is a single file.
- For nested columns, the corresponding hash file must also be copied.
- The column copy itself is performed at the filesystem level:
    - Linux/macOS/Solaris: `cp`
    - Windows: `copy /v /z`

A helper flag identifies the operating system:

```q
isWindows:.z.o in `w32`w64;
```

Next, we define a platform-aware path formatter:

```q
convertPath:{[path]
    path:string path;
    if[isWindows; path[where"/"=path]:"\\"];
    (":"=first path)_ path
 };
```

And a wrapper to invoke the appropriate command:

```q
copy:{[src;dst] system $[isWindows; "copy /v /z "; "cp "]," " sv convertPath each src,dst;};
```

For nested columns, also copy the hash file:

```q
if[(hname:`$string[srcCol],"#") in key tdir; 
    copy . .Q.dd[tdir;] each hname,`$string[dstCol],"#"
 ];
```

**3. Update the table’s metadata (`.d` file)**
```q
@[tdir;`.d;,;dstCol]
```

---

The full `copy1Col` function:

```q
// Copy srcCol → dstCol within a single on-disk table directory
copy1Col:{[tdir;srcCol;dstCol]
    if[(srcCol in colNames) and not dstCol in colNames:getColNames tdir;
        copy . .Q.dd[tdir;] each srcCol,dstCol;
        if[(hname:`$string[srcCol],"#") in key tdir; 
            copy . .Q.dd[tdir;] each hname,`$string[dstCol],"#"
        ];
        @[tdir;`.d;,;dstCol]
    ]
 };
```

### Apply to All Partitions

The wrapper performs name validation and applies the operation across all table partitions:

```q
copyCol:{[db;tname;srcCol;dstCol] 
    validateName dstCol;
    copy1Col[;srcCol;dstCol] peach allTablePaths[db;tname];
 };
```

```q
q)copyCol[`:splayDB;`trade;`size;`sizeCopy]

q)copyCol[`:partDB;`trade;`size;`sizeCopy]

// Copy nested
q)copyCol[`:splayDB;`trade;`company;`companyCopy]

q)copyCol[`:partDB;`trade;`company;`companyCopy]
```

## Checking if a Column Exists

Determining whether a column exists is straightforward: we simply check whether the column name appears in the table’s `.d` file, which we access via `getColNames`.

```q
// Does the given column exist in a single partition directory?
has1Col:{[tdir;cname] cname in getColNames tdir};
```

For a partitioned table, the presence of a column should be consistent across all partitions.

We therefore apply `has1Col` to every partition directory and confirm that the result is true for all of them.

```q
// Does the given column exist in all partitions of the table?
hasCol:{[db;tname;cname] 
    $[count paths:allTablePaths[db;tname]; all has1Col[;cname] peach paths; 0b]
 };
```

Note that we check if we get any paths. If not, we simply return `0b` as the table does not exist within the database.

```q
q)hasCol[`:splayDB;`trade;`size]
1b

q)hasCol[`:splayDB;`trade;`nonExistingCol]
0b

q)hasCol[`:splayDB;`nonExistingTab;`size]
0b
```

## Renaming Columns

Renaming a column follows a similar pattern as copying a column:

**1. Validating Column Names**

We begin by checking that the column we want to rename (`old`) exists and that the proposed name (`new`) does not:

```q
(old in colNames) and not new in colNames:getColNames tdir
```

**2. Renaming the Column File**

The file-level rename operation uses the OS’s native move command (`mv` on Unix-like systems, `move` on Windows).

We wrap this in a helper that handles platform-specific behaviour and path formatting:

```q
rename:{[src;dst] system $[isWindows; "move "; "mv "]," " sv convertPath each src,dst;}
```

Renaming the column's data file is then simply:

```q
rename . .Q.dd[tdir;] each old,new;
```

For nested columns:

```q
if[(hname:`$string[old],"#") in key tdir; 
    rename . .Q.dd[tdir;] each hname,`$string[new],"#"
 ];
```

**4. Updating .d**

Finally, we update the `.d` metadata file.

Unlike copying, where we append, renaming requires modifying the existing list while preserving its order:

```q
@[tdir;`.d;:;.[colNames;where colNames=old;:;new]]
```

---

The full `rename1Col` function:

```q
// Rename a column in a single on-disk table directory.
rename1Col:{[tdir;old;new]
    if[(old in colNames) and not new in colNames:getColNames tdir
        rename . .Q.dd[tdir;] each old,new;
        if[(hname:`$string[old],"#") in key tdir; 
            rename . .Q.dd[tdir;] each hname,`$string[new],"#"
        ];
        @[tdir;`.d;:;.[colNames;where colNames=old;:;new]]
    ]
 };
```

Apply across all partitions:

```q
// Rename a column across all partitions of a table.
renameCol:{[db;tname;old;new] 
    validateName new;
    rename1Col[;old;new] peach allTablePaths[db;tname];
 };
```

```q
q)renameCol[`:splayDB;`trade;`sizeCopy;`sizeRenamed]

q)renameCol[`:splayDB;`trade;`companyCopy;`companyRenamed]
```

## Reordering Columns

Reorder columns by updating the `.d` file (no data changes needed):

**1. Validating User Input**

Before applying a new order, we confirm that every name provided by the user corresponds to an existing column:

```q
if[not all exists:order in colNames:getColNames tdir;
    '"Unknown column(s): ","," sv string order where not exists
 ];
```

This raises an informative error listing only the invalid names.

**2. Constructing the New Order**

We reorder the `.d` file by placing the user-specified columns first, followed by any remaining columns in their original order:

```q
@[tdir;`.d;:;order,colNames except order];
```

This mirrors the behaviour of `xcols`: the caller only needs to specify the priority columns, not the full list of column names.

**3. Putting It Into a Function**

```q
// Reorder the columns in a single database table
reorder1Cols:{[tdir;order]
    if[not all exists:order in colNames:getColNames tdir;
        '"Unknown column(s): ","," sv string order where not exists
    ];
    @[tdir;`.d;:;order,colNames except order];
 };
```

**4. Applying the Reorder Across All Partitions**

For partitioned tables, the column order must be updated consistently everywhere:

```q
// Reorder the columns across all partitions of a table
reorderCols:{[db;tname;order] reorder1Cols[;order] peach allTablePaths[db;tname];};
```

```q
q)getColNames .Q.dd[`:splayDB;`trade]
`time`sym`size`price`company`sizeRenamed`companyRenamed

q)reorderCols[`:splayDB;`trade;`time`sym`price`company]

q)getColNames .Q.dd[`:splayDB;`trade]
`time`sym`price`company`size`sizeRenamed`companyRenamed
```

## Applying a Function To a Column

Another useful operation is being able to apply some function to column data and persisting the updated data. For example, we want to scale the values in a column by 100, so we apply a function that multiplies all values in the column by 100, and then saves these values back into the column file.

We start by checking that the column we want to update actually exists within the table:

```q
cname in getColNames tdir
```

Next, we load the column values into memory:

```q
oldVal:get tdir,cname;
```

We only want to do the on-disk update if something actually changed. This could be the values in the column, but also, the attribute on the column (for example when the function we are applying is to set/remove a column attribute). Thus, we store the current attribute for later comparison:

```q
oldAttr:attr oldVal
```

Apply the function to the column values:

```q
newVal:fn oldVal
```

Note that the function (`fn`) is a unary function that takes the column values as its argument and returns the new column values (count of list must be maintained).

Then, we get the attribute of the updated column:

```q
newAttr:attr newVal
```

Next, check if anything actually changed:

```q
$[oldAttr~newAttr;not oldVal~newVal;1b]
```

This conditional says: if the attributes changed, return `1b`, since we have a change and want to write the update to disk. Otherwise, check if the column values changed, if so, we also want to do the on-disk update.

If the above if-else returns `1b` we proceed with the on-disk update:

```q
.[.Q.dd[tdir;cname];();:;newVal]
```

### Putting it All Together

```q
// Apply a function to a single database table
fn1Col:{[tdir;cname;fn]
    if[cname in getColNames tdir;
        oldAttr:attr oldVal:get tdir,cname;
        newAttr:attr newVal:fn oldVal;
        if[$[oldAttr~newAttr;not oldVal~newVal;1b];
            .[.Q.dd[tdir;cname];();:;newVal]
        ]
    ]
 };
```

and the wrapper function:

```q
// Apply a function to a column across all partitions of a table
fnCol:{[db;tname;cname;fn] fn1Col[;cname;fn] peach allTablePaths[db;tname];};
```

```q
q)get `:splayDB`trade`size
1 2 3 4 5

q)fnCol[`:splayDB;`trade;`size;100*] 

q)get `:splayDB`trade`size
100 200 300 400 500
```

### Using `fnCol`

We can make use of `fnCol` to derive a few more useful functions:

```q
// Cast a column to a given type
castCol:{[db;tname;cname;typ] fnCol[db;tname;cname;typ$];};

// Set an attribute on a column
setAttr:{[db;tname;cname;attrb] fnCol[db;tname;cname;attrb#];};

// Remove an attribute from a column
rmAttr:{[db;tname;cname] setAttr[db;tname;cname;`];};
```

`castCol` casts a column to a new data type. It does this by passing `typ$` as the `fn` argument to `fnCol`, where `typ` is the new data type and can be any of the values that can be the left argument of the `$` operator when casting (i.e., `short`, `char`, or `symbol`).

`setAttr` is used to set an attribute on a table column. It does this by passing `attrb#` as the `fn` argument to `fnCol`, where `attrb` is the attribute to apply (`` ` ``, `` `s ``, `` `u ``, `` `p ``, `` `g ``).

`rmAttr` is used to remove an attribute from a table column and it simply passed `` ` `` to `setAttr` to achieve this.

## Adding Missing Columns

Over time, it is common for a database to accumulate schema drift: earlier partitions may be missing columns that were added later as the schema evolved.

To maintain consistency across the database, it is often necessary to retrofit older partitions so that all partitions share the same set of columns. A practical way to do this is to treat a “good” table — typically from a recent partition — as a schema template, and add any missing columns to older partitions using appropriate default values.

**1. Identifying Missing Columns**

Given:
- `goodTdir`: the directory of the template table (with the complete schema)
- `tdir`: the directory of a table we want to fix

We determine which columns are missing by comparing their `.d` files:

```q
goodCols:getColNames goodTdir
missing:goodCols except getColNames tdir
```

This produces the list of columns that exist in the good table but not in the target table.

**2. Generating Default Values**

Each missing column must be added with a correctly typed default value.

We infer the column’s type from the template table’s metadata:

```q
t:"*"^meta[goodTdir][cname;`t]
```

Here:
- ``meta[goodTdir][cname;`t]`` returns the column’s type character
- `"*"` is used as a fallback when the type is null (`" "`), which represents a general list

We then construct an empty value of the correct type:

```q
t$()
```

**3. Handling Nested Columns**

Nested columns (lists of lists) require special handling. These are identified by:

- an uppercase type character (`"A"` – `"Z"`), or
- `"*"` for general nested lists

For these cases, the default value must itself be **enlisted**, producing a list of empty lists:

```q
$[(t="*") or t within "AZ";enlist;] t$()
```

**4. Reorder Columns**

To maintain consistency, the columns of the table that had the missing column(s) are reordered to match the ordering of the good table:

```q
reorder1Cols[tdir;goodCols]
```

**5. Adding Missing Columns to a Single Table**

We can now combine the above logic into a helper that adds all missing columns to a single table directory:

```q
// Add missing columns to a single database table
add1MissingCols:{[tdir;goodTdir]
    goodCols:getColNames goodTdir;
    if[count missing:goodCols except getColNames tdir;
        {[d;g;c] 
            add1Col[d;c;] $[(t="*") or t within "AZ";enlist;] (t:"*"^meta[g][c;`t])$()
        }[tdir;goodTdir;] each missing;
        reorder1Cols[tdir;goodCols]
    ]
 };
```

**6. Applying Across All Partitions**

Finally, we wrap this helper to apply it across all partitions of a table — excluding the template partition itself:

```q
// Add missing columns across all partitions of a table
addMissingCols:{[db;tname;goodTdir]
    add1MissingCols[;goodTdir] peach allTablePaths[db;tname] except goodTdir;
 };
```

```q
// Remove column from older partition
q)hdel .Q.dd[`:partDB;2026.02.03,`trade`size]
`:partDB/2026.02.03/trade/size
q){@[x;`.d;:;get[x,`.d] except `size]} .Q.dd[`:partDB;2026.02.03,`trade]
`:partDB/2026.02.03/trade

// size column gone
q)getColNames .Q.dd[`:partDB;2026.02.03,`trade]
`time`sym`price`company`sizeCopy`companyCopy

q)addMissingCols[`:partDB;tname;.Q.dd[`:partDB;2026.02.04,`trade]]

// size column back and in correct position
q)getColNames .Q.dd[`:partDB;2026.02.03,`trade]
`time`sym`size`price`company`sizeCopy`companyCopy

// Values are null and of the correct type
q)get .Q.dd[`:partDB;2026.02.03,`trade`size]
0N 0N 0N 0N 0N
```

## Adding a Table

To add a new table, we create an empty schema in every partition where it should exist.

**1. Creating a Table in a Single Partition**

We begin by defining a helper that creates an empty table schema at a given table directory:

```q
// Add a single new table
add1Tab:{[db;domain;tdir;schema] @[tdir;`;:;.Q.ens[db;0#schema;domain]];};
```

Here:
- `schema` is a table definition (column names and types)
- `0#schema` ensures the schema is empty
- `.Q.ens` enumerates any symbol columns against the chosen domain

If the schema contains no symbol columns, `.Q.ens` is effectively a no-op and simply returns the table unchanged.

Writing this empty table to `tdir` creates the table’s on-disk structure.

**2. Building Paths for Tables That Don’t Yet Exist**

To create a new table across all partitions, we need to generate table paths even when the table does not yet exist.

Previously, `allTablePaths` filtered out non-existing tables, which prevents table creation. To solve this, we split the logic into two functions:
- `buildTablePaths`: constructs all possible table paths
- `allTablePaths`: filters those paths to only existing tables

```q
buildTablePaths:{[db;tname]
    if[0=count files:key db; :`$()];
    if[any files like "par.txt"; :raze (.z.s[;tname] hsym@) each `$read0 .Q.dd[db;`par.txt]];
    files@:where files like "[0-9]*";
    $[count files; (.Q.dd[db;] ,[;tname]@) each files; enlist .Q.dd[db;tname]]
 };

allTablePaths:{[db;tname] paths where 0<(count key@) each paths:buildTablePaths[db;tname]};
```

This preserves the original behaviour of `allTablePaths` for operations that should only apply to existing tables.

**3. Creating the Table Across All Partitions**

With `buildTablePaths`, we can now create a new table everywhere it should exist by applying `add1Tab` to each generated path:

```q
// Add a new table to all partitions of a database
addTab:{[db;domain;tname;schema] add1Tab[db;domain;;schema] peach buildTablePaths[db;tname];};
```

```q
q)key `:splayDB
`s#`sym`trade

q)addTab[`:splayDB;`sym;`quote;([] ask:"f"$(); bid:"f"$())]

q)key `:splayDB
`s#`quote`sym`trade

q)get `:splayDB`quote
ask bid
-------
```

## Deleting a Table

Deleting a table is a filesystem operation: we remove all files belonging to the table and then delete the table directory itself.

**1. Checking That the Table Exists**

Before attempting deletion, we verify that the table directory exists and is non-empty:

```q
not ()~files:key tdir
```

**2. Deleting Files and the Directory**

Q’s `hdel` function can only remove directories once they are empty, so we must first delete all files within the table directory and then remove the directory itself.

```q
(hdel .Q.dd[tdir;]@) each files,`
```

The trailing backtick ensures that the directory itself is deleted after its contents.

**3. Deleting a Table in a Single Partition**

```q
del1Tab:{[tdir] if[not ()~files:key tdir; (hdel .Q.dd[tdir;]@) each files,`]};
```

**4. Deleting a Table Across All Partitions**

```q
delTab:{[db;tname] del1Tab peach allTablePaths[db;tname];};
```

```q
q)delTab[`:splayDB;`quote]

q)key `:splayDB
`s#`sym`trade
```

## Renaming a Table

Renaming a table involves renaming its directory in each partition directory. As with column renaming, this is done using the filesystem rather than modifying any metadata files.

**1. Validating the New Table Name**

First, we ensure the new name is not already being used within the database:

```q
()~key new
```

**2. Renaming the Table Directory**

```q
rename[old;new]
```

**3. Renaming a Table in a Single Partition**

```q
rename1Tab:{[old;new] if[()~key new; rename[old;new]]};
```

**4. Applying the Rename Across All Partitions**

To rename a table consistently across a partitioned database, we:
1) Validate the new name
2) Build old/new table paths for each partition
3) Apply the rename in parallel

```q
renameTab:{[db;old;new] 
    validateName new;
    .[rename1Tab;] peach flip buildTablePaths[db;] each old,new;
 };
```

Wrapping `rename1Tab` with `.[;]` allows it to be used as a binary function with peach.

```q
q)renameTab[`:splayDB;`trade;`tradeRenamed]

q)key `:splayDB
`s#`sym`tradeRenamed
```

## Conclusion

Maintaining on-disk KDB+ databases is fundamentally a filesystem problem, and the utilities explored in this post embrace that reality directly. By operating at the directory and file level, we can perform structural changes—adding, removing, renaming, and reshaping tables and columns—without mapping data into memory or relying on fragile, ad hoc scripts. The resulting approach is explicit, predictable, and scalable across splayed, partitioned, and segmented layouts.

The reworked `dbm.q` module aims to modernise the original `dbmaint.q` ideas by improving readability, performance via parallel execution, and extending support to nested columns. More importantly, it provides a composable toolkit for database evolution: one that can be safely automated, reasoned about, and adapted as schemas inevitably change over time. As databases grow and operational requirements become stricter, having well-defined, filesystem-aware maintenance primitives becomes not just convenient, but essential.
