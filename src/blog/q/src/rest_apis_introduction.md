# An Introduction to Interacting with REST APIs in Q/KDB+

![Cover Image](./images/rest_apis_introduction.png "Cover Image")

In today's interconnected world, many websites and services provide programmatic access to their data through REST APIs. REST (Representational State Transfer) APIs allow different systems to securely exchange data over the internet. The Q programming language includes built-in HTTP request capabilities and, in this blog, we’ll explore how to interact with REST APIs using Q.

## HTTP GET via `.Q.hg`

The `.Q.hg` function in Q is a powerful tool that allows you to perform HTTP GET requests directly from your Q session. By simply passing a URL to `.Q.hg`, you can retrieve raw data, such as the HTML of a webpage, which can then be processed or analysed.

```q
q).Q.hg `:http://www.google.com
"<!doctype html><html itemscope=\"\" itemtype=\"http://schema.org/WebPage\" lang=\"en-GB\"><head>...
```

## HTTPS

HTTPS (Hypertext Transfer Protocol Secure) is an extension of HTTP that uses [SSL/TLS](https://code.kx.com/q/kb/ssl/) protocols to encrypt data, ensuring secure communication between clients and servers. To make HTTPS requests in Q, your environment must be configured to support SSL/TLS. If this configuration is missing, Q will raise an error when attempting an HTTPS request.

```q
q).Q.hg `:https://www.google.com
'conn. OS reports: The requested protocol has not been configured into the system, or no implementation for it exists.
  [0]  .Q.hg `:https://www.google.com
       ^
```

SSL verification can be bypassed by setting the `SSL_VERIFY_SERVER` environment variable to `NO`. This should only be used in trusted environments, as disabling SSL verification can expose your application to security risks.

### Windows Command Prompt

```powershell
set "SSL_VERIFY_SERVER=NO" 
```

### Linux & macOS Terminal

```bash
export SSL_VERIFY_SERVER=NO
```

### Example in Q

Once the environment variable is set, you can verify it and perform an HTTPS request:

```q
q)getenv `SSL_VERIFY_SERVER
"NO"

q).Q.hg `:https://www.google.com
"<!doctype html><html itemscope=\"\" itemtype=\"http://schema.org/WebPage\" lang=\"en-GB\"><head>...
```

## JSON

JSON (JavaScript Object Notation) is a lightweight data interchange format widely used in REST APIs due to its simplicity and ease of parsing. In Q, JSON objects and arrays map naturally to dictionaries and tables, respectively, making it straightforward to work with API data.

### JSON Objects 

JSON objects are structured as a collection of key-value pairs, which directly correspond to Q dictionaries. Each key is a string, and its associated value can be a string, number, array, object, or Boolean.

```JSON
{
    "firstName": "John", 
    "lastName": "Smith"
}
```

In this example, `firstName` and `lastName` are keys, and `"John"` and `"Smith"` are their respective values.

### JSON Arrays 

JSON arrays are ordered collections of values, which can include objects, similar to a list of dictionaries, i.e., a table, in Q.

```JSON
[
    { "firstName": "John", "lastName": "Wick" },
    { "firstName": "Mary", "lastName": "Sue" }
]
```

In this example, the array contains two JSON objects, each representing a person with `firstName` and `lastName` fields.

### Working with JSON in Q

Q simplifies the process of decoding JSON data using the `.j.k` function. This function parses a JSON string into a corresponding Q data structure—dictionaries for objects and tables for arrays of objects.

#### Example 1: Parsing a JSON Object

```q
q).j.k "{ \"firstName\": \"John\", \"lastName\": \"Smith\" }"
firstName| "John"
lastName | "Smith"
```

Here, the JSON object is parsed into a Q dictionary with `firstName` and `lastName` as keys.

#### Example 2: Parsing a JSON Array

```q
q).j.k "[ { \"firstName\": \"John\", \"lastName\": \"Wick\" }, { \"firstName\": \"Mary\", \"lastName\": \"Sue\" } ]"
firstName lastName
------------------
"John"    "Wick"
"Mary"    "Sue"
```

This JSON array is parsed into a Q table, with `firstName` and `lastName` as column names.

JSON is a common format for data exchange in APIs, and Q's built-in capabilities make it easy to decode and manipulate this data efficiently.

## A Real Example: Using the *CheapShark* API

*CheapShark* is a website that aggregates the best deals on PC games from various popular stores like *Steam*, *Humble Bundle*, *Fanatical*, and more. It offers a free, easy-to-use REST API that does not require an authorisation key, making it an excellent resource for learning how to work with real-world APIs.

### Understanding the API

Most sites that provide a REST API will offer documentation to guide users on how to interact with their endpoints. The documentation for the *CheapShark* API can be found [here](https://apidocs.cheapshark.com/).

### Making API Calls

API calls typically begin with a base URL, which serves as the root address that you extend with specific endpoints to access different resources.

```q
q)baseURL:`:https://www.cheapshark.com/api/1.0
```

In this example, `1.0` denotes the API version. API versions can change over time as the service evolves, so it's essential to check the documentation for the correct version.

To request specific data, the base URL is extended with an endpoint. According to the *CheapShark* documentation, one available endpoint is *deals*, which provides information on current game deals.

#### Querying the Deals Endpoint

The base URL can be extended with the *deals* endpoint to retrieve information about ongoing sales:

```q
q).Q.dd[baseURL;`deals]
`:https://www.cheapshark.com/api/1.0/deals
```

The above code constructs the full URL to the deals endpoint. To fetch data from this endpoint, use the `.Q.hg` function to send an HTTP GET request and then parse the JSON response with `.j.k`:

```q
q)deals:.j.k .Q.hg .Q.dd[baseURL;`deals]
```

This command retrieves and decodes the JSON response into a Q table. You can then inspect the data:

```q
q)type deals
98h
q)count deals
60
q)first deals
internalName      | "METAMORPHOSIS"
title             | "Metamorphosis"
metacriticLink    | "/game/metamorphosis/"
dealID            | "oML4oLCz0hlxkKKQpDwVSBwm6NNQUvEBx1igr7uOgWw%3D"
storeID           | ,"1"
gameID            | "218750"
salePrice         | "10.50"
normalPrice       | "34.98"
isOnSale          | ,"1"
savings           | "69.982847"
metacriticScore   | ,"0"
steamRatingText   | "Very Positive"
steamRatingPercent| "83"
steamRatingCount  | "405"
steamAppID        | "1025410"
releaseDate       | 1.724976e+09
lastChange        | 1.724246e+09
dealRating        | "10.0"
thumb             | "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1025410/c..
```

In the `deals` table, each row corresponds to a game deal, with fields like `title`, `salePrice`, and `normalPrice` providing details about the game and its discount.

This example demonstrates how to use Q to interact with a real REST API, retrieving and processing JSON data effectively.

### Schema Mapping

When working with external data, especially from APIs, the incoming data might not always match the desired format or types. In such cases, it's essential to "clean" the data—formatting, casting types, and removing erroneous rows to ensure consistency and usability. A good approach is to define a schema that outlines the expected structure and data types, which can then be applied to the incoming data.

#### Defining the Schema

One effective way to define and manage this schema is by using a CSV file. The schema can specify the column names, data types, whether the columns are required, and any additional attributes.

```CSV
column,origColumn,ty,required,enabled,isKey,attrib,description
internalName,internalName,s,0,0,0,,Game title used internally by CheapShark
title,title,*,1,1,0,,Game title
metacriticLink,metacriticLink,*,0,0,0,,Link to game page on Metacritic 
dealID,dealID,*,1,1,1,u,Deal identifier
storeID,storeID,j,1,1,0,,Game store identifier
gameID,gameID,j,1,1,0,,Game identifier
salePrice,salePrice,f,1,1,0,,Deal/reduced price of game (USD)
normalPrice,normalPrice,f,1,1,0,,Usual/full price of game (USD)
isOnSale,isOnSale,b,0,1,0,,True if game is currently on sale
savings,savings,f,0,1,0,,Percent saved on sale price compared to normal price  
metacriticScore,metacriticScore,j,1,1,0,,Score on Metacritic (0-100)
steamRatingText,steamRatingText,*,1,1,0,,Rating on Steam
steamRatingPercent,steamRatingPercent,j,1,1,0,,Percentage rating on Steam (0-100)
steamRatingCount,steamRatingCount,j,1,1,0,,Number of ratings given on Steam
steamAppID,steamAppID,j,0,0,0,,Application identifier on Steam
releaseDate,releaseDate,j,1,1,0,,Date game was released
lastChange,lastChange,j,0,0,0,,Date of last change made to game
dealRating,dealRating,f,1,1,0,,CheapShark deal rating (0.0-10.0)
thumb,thumb,*,0,0,0,,Link to thumbnail image
```

#### Loading the Schema

Q provides a straightforward way to load a CSV file into a table. For our schema configuration, we can use the following command to load the schema from a CSV file:

```q
q)show schema:("sscbbbs*";enlist ",") 0: `:schema/deals.csv
column             origColumn         ty required enabled isKey attrib description               ..
-------------------------------------------------------------------------------------------------..
internalName       internalName       s  0        0       0            "Game title used internall..
title              title              *  1        1       0            "Game title"              ..
metacriticLink     metacriticLink     *  0        0       0            "Link to game page on Meta..
dealID             dealID             *  1        1       1     u      "Deal identifier"         ..
storeID            storeID            j  1        1       0            "Game store identifier"   ..
gameID             gameID             j  1        1       0            "Game identifier"         ..
..
```

This command reads the `schema/deals.csv` file and displays its contents as a table. Each row in the schema configuration corresponds to a column in the deals table.

* `column`: The desired name for the column in Q.
* `origColumn`: The original column name from the external source.
* `ty`: The expected data type for the column.
* `required`: A flag indicating whether the column is mandatory.
* `enabled`: A flag indicating whether the column should be included in the final table.
* `isKey`: A flag to indicate if the column should be used as a key.
* `attrib`: Any attributes that should be applied to the column (e.g., `u` for unique).
* `description`: A brief explanation of what the column represents.

This schema setup provides a clear structure for managing and validating the data we receive from the deals API.

#### The `applySchema` Function

To ensure the `deals` table conforms to the expected schema, the following function is defined:

```q
// Ensure a table conforms to the given schema
applySchema:{[schema;tab]
    // Select only enabled columns from the schema - useful for excluding unnecessary columns
    schema:select from schema where enabled;
    
    // Ensure all required columns are present in the data
    reqCols:exec origColumn from schema where required;
    if[not all b:reqCols in cols tab; 
        msg:"Required columns missing: ",", " sv string reqCols where not b;
        -1 msg;
        'msg
    ];
    
    // Keep only columns that are both expected and received
    tab:#[;tab] cols[tab] inter exec origColumn from schema;

    // Rename columns to conform to Q's naming conventions
    tab:xcol[;tab] exec origColumn!column from schema;
    
    // Cast columns to their correct data types
    tab:cast[cols tab;exec (column!ty) cols tab from schema;tab];
    
    // Apply attributes to the appropriate columns
    tab:applyAttr[;tab] exec column!attrib from schema where not null attrib;
    
    // Set the specified columns as the key(s) of the table
    tab:xkey[;tab] exec column from schema where isKey;

    // Return the cleaned and formatted table
    tab
 }
```

##### Explanation of the `applySchema` Function:

1. **Selecting Enabled Columns**: The schema may include columns that are not needed for the current operation. This step filters out any columns that are not marked as enabled in the schema.

2. **Checking for Required Columns**: Ensures that all columns marked as required in the schema are present in the incoming data. If any required columns are missing, the function throws an error with a descriptive message.

3. **Filtering Received Columns**: The function retains only those columns in the incoming data that are both expected (as per the schema) and present in the received data. This helps to discard any extraneous columns.

4. **Renaming Columns**: Column names are often inconsistent with Q's conventions when received from external sources (not the case with *CheapShark* data). This step renames the columns to conform to Q's naming conventions, which are specified in the schema.

5. **Casting Columns to Correct Data Types**: The function casts each column to its appropriate data type as specified in the schema. This is important for ensuring that the data can be accurately and efficiently processed.

6. **Applying Attributes**: Certain attributes, like `u` (unique), may need to be applied to specific columns. This step applies those attributes based on the schema configuration.

7. **Setting the Table Key**: The function sets the key for the table using the columns marked as `isKey` in the schema. This is crucial for operations that depend on uniquely identifying rows in the table.

8. **Returning the Cleaned Table**: Finally, the function returns the table with all the above transformations applied, ensuring it is in a clean, consistent, and usable format.

#### Helper Functions Used in `applySchema`

##### Column Type Casting

The `applySchema` function relies on the following helper function to cast columns to their correct data types:

```q
// Cast column types in tab
cast:{[columns;ty;tab]
    col2Ty:columns!ty;
    col2Ty,:exec c!upper col2Ty c from meta tab where t="C";
    col2Ty:{($),x,y}'[col2Ty;key col2Ty];
    ![tab;();0b;col2Ty]
 }
```

Explanation:
* The `cast` function creates a mapping (`col2Ty`) between column names and their intended types.
* For columns that are received as strings, the function checks their actual data type and applies the appropriate casting by converting the type character to its uppercase form.
* The function then generates a list of applicable casting functions and applies these to the corresponding columns in the table. This ensures that each column in the table is correctly typed according to the schema.

##### Applying Attributes to Columns

Another important aspect of schema application is setting the correct attributes for columns. The following helper function is used for this purpose:

```q
// Apply attributes to columns
applyAttr:{[col2Attr;tab] ![tab;();0b;] {(#;enlist x;y)}'[col2Attr;key col2Attr]}
```

Explanation:

* The `applyAttr` function creates a mapping (`col2Attr`) between column names and their associated attributes.
* In the example provided, the mapping could look like ``dealID | `u``, which means that the `u` (unique) attribute should be applied to the `dealID` column within the table.

#### Applying the Schema

Now that we've defined the `applySchema` function, let's put it into action by applying the schema to the `deals` table. This will ensure that the table conforms to the expected structure, with the appropriate data types, column names, and attributes as defined in the schema.

```q
q)deals:applySchema[schema;deals]
```

After applying the schema, we can inspect the first row of the `deals` table to verify that the data has been correctly formatted (note that `dealID` is a key column and is not shown when the `first` keyword is applied):

```q
q)first deals
title             | "Metamorphosis"
storeID           | 1
gameID            | 218750
salePrice         | 10.5
normalPrice       | 34.98
isOnSale          | 1b
savings           | 69.98285
metacriticScore   | 0
steamRatingText   | "Very Positive"
steamRatingPercent| 83
steamRatingCount  | 406
releaseDate       | 1724976000
dealRating        | 10f
```

#### Converting Unix Epoch Timestamps to Q Timestamps

In the `deals` table, the `releaseDate` column is currently a long integer. According to the *CheapShark* documentation, this column represents a Unix Epoch timestamp, which is the number of seconds elapsed since `1970.01.01`.

To make this data more usable, we need to convert these Unix Epoch timestamps into Q timestamps, which are based on the number of nanoseconds since `2000.01.01`.

Q provides a straightforward way to perform this conversion, as shown below:

```q
q)"P"$string 1724976000
2024.08.30D00:00:00.000000000
```

The `"P"$` operation converts a string representation of the Unix Epoch timestamp into a Q timestamp.

This conversion isn't handled within the `applySchema` function because the `releaseDate` column is received as a float. To correctly convert the Unix Epoch timestamp to a Q timestamp, the value must first be cast to a long, then converted from a string representation of that long integer.

We can automate this process with a helper function:

```q
// Convert Unix Epoch timestamps to Q timestamps
convertEpoch:{[epochCols;tab]
    ![tab;();0b;] epochCols!("P"$string@),/:epochCols:(epochCols,()) inter cols tab
 }
```

This function:
* Takes as input the names of the columns (`epochCols`) that store Unix Epoch timestamps and the table (`tab`) containing these columns.
* Converts the values in these columns from Unix Epoch timestamps to Q timestamps.

Now, let's apply this function to the `deals` table:

```q
q)deals:convertEpoch[`releaseDate;deals]
q)first deals
title             | "Metamorphosis"
storeID           | 1
gameID            | 218750
salePrice         | 10.5
normalPrice       | 34.98
isOnSale          | 1b
savings           | 69.98285
metacriticScore   | 0
steamRatingText   | "Very Positive"
steamRatingPercent| 83
steamRatingCount  | 406
releaseDate       | 2024.08.30D00:00:00.000000000
dealRating        | 10f
```

### Example Queries

With the formatted `deals` table, you can now easily extract valuable insights. Below are some examples of useful queries you can perform:

#### Find Games That Are Free

To identify which games are currently free, you can run the following query:

```q
q)select from deals where salePrice=0
dealID                                                  | title                        storeID gameID salePrice normalPrice isOnSale savings ..
--------------------------------------------------------| -----------------------------------------------------------------------------------..
"hnqzhI6mSozJT13ntObN06QUeuLOaArkDyEu%2BiBplK4%3D"      | "Wild Card Football"         25      269270 0         29.99       1        100     ..
"l%2BZiBW2Mu0W4B%2BipW%2FpUJ%2BAn218BfeYzAKecxjhUGO0%3D"| "Fallout Classic Collection" 25      120604 0         19.99       1        100     ..
```

This query filters the `deals` table to return only the rows where the `salePrice` is 0, showing which games are currently available for free.

#### Sort Games by Metacritic Rating

If you want to see the games sorted by their *Metacritic* score, with the highest-rated games first, use this query:

```q
q)`metacriticScore xdesc deals
dealID                                                | title                                        storeID gameID salePrice normalPrice ..
------------------------------------------------------| ----------------------------------------------------------------------------------..
"OGCfBOUZvvl8JPIWeBbYeWvtFw%2BBEy9WgFdO7pM999Q%3D"    | "Deus Ex: Human Revolution - Director's Cut" 2       102249 2.55      19.99       ..
"h1pI0RMkHs6sjcjboS%2FvYhEytAI7XAat%2BSiXmP%2FL0OA%3D"| "Metro 2033 Redux"                           25      109746 1.99      19.99       ..
"Ersqftfht15yRvVi%2BQtYqzHcXHuORprGmyDT0uvo5zc%3D"    | "Homeworld Remastered Collection"            1       141243 3.49      34.99       ..
"3vW2Xy%2BiwEVnQOoN7KB2RlEAYz1%2FqK0IheNSCUA3g64%3D"  | "Shadow Tactics: Blades of the Shogun"       25      158443 3.99      39.99       ..
"chTGFNtThpFwF7mhwKUFmuh101BeXYsHrDyGbnwDLw0%3D"      | "Deus Ex: Mankind Divided"                   2       143165 3.83      29.99       ..
..
```

This query sorts the deals table by the `metacriticScore` in descending order, allowing you to quickly identify the top-rated games.

#### Identify Games with High Discounts

To find games where you can save more than 90%, use the following query:

```q
q)select from deals where savings>90
dealID                                                    | title                                    storeID gameID salePrice normalPrice ..
----------------------------------------------------------| ------------------------------------------------------------------------------..
"hnqzhI6mSozJT13ntObN06QUeuLOaArkDyEu%2BiBplK4%3D"        | "Wild Card Football"                     25      269270 0         29.99       ..
"syEZpIi1rsbwUJ1YU1OKiLx1O3gN1Ax0ei1ANNvNsqI%3D"          | "NHRA: Speed for All - Ultimate Edition" 25      277998 7.99      79.99       ..
"ut1jqPlDrAYP%2BfA%2BWwDTf7DX%2B69aQWre5UlfuOLtLwE%3D"    | "Strange Brigade - Deluxe Edition"       2       186386 6         79.99       ..
"Kp3%2BW%2B6AtA%2FpJ5TzS9HpxUmOT0xZIWoiB%2BEgs%2F9JzpU%3D"| "Sniper Elite 4 Deluxe Edition"          2       158734 6.75      89.99       ..
"l%2BZiBW2Mu0W4B%2BipW%2FpUJ%2BAn218BfeYzAKecxjhUGO0%3D"  | "Fallout Classic Collection"             25      120604 0         19.99       ..
..
```

This query selects games where the savings column shows a discount greater than 90%, helping you to spot the best deals available.

### Filtered Queries

Instead of retrieving all deals from the API (which may be constrained by page size), you can apply filters directly in your API queries to target specific data.

#### Building the Filter

First, we'll create a dictionary that maps filter names to their respective values. In this example, we want to retrieve all deals from `storeID = 1` with a `salePrice` less than or equal to $10:

```q
q)flts:`storeID`upperPrice!("1";"10")
```

#### Composing the Filter String

Next, we'll use a helper function to convert this dictionary into a filter string that can be appended to the API URL:

```q
q)buildFltStr:"&" sv value {[flts] {x,"=",y}'[string key flts;flts]}@
```

This function generates an `&`-delimited string of `key=value` pairs from the dictionary:

```q
q)buildFltStr flts
"storeID=1&upperPrice=10"
```

#### Constructing the API URL

We can now construct the full API URL with the filter string included:

```q
q).Q.dd[baseURL;] `$"deals?",buildFltStr flts
`:https://www.cheapshark.com/api/1.0/deals?storeID=1&upperPrice=10
```

#### Fetching Filtered Data

Let's call the API using the constructed URL to retrieve the filtered deals:

```q
q)filteredDeals:.j.k .Q.hg .Q.dd[baseURL;] `$"deals?",buildFltStr flts
q)first filteredDeals
internalName  | "HOMEWORLDREMASTEREDCOLLECTION"
title         | "Homeworld Remastered Collection"
metacriticLink| "/game/homeworld-remastered-collection/"
dealID        | "Ersqftfht15yRvVi%2BQtYqzHcXHuORprGmyDT0uvo5zc%3D"
storeID       | ,"1"
gameID        | "141243"
salePrice     | "3.49"
..
```

Since this query still uses the deals API endpoint, the data structure returned follows the same schema as before.

#### Applying the Schema and Converting Timestamps

Finally, we'll apply the schema and convert any Unix Epoch timestamps in the retrieved data:

```q
q)filteredDeals:applySchema[schema;filteredDeals]
q)filteredDeals:convertEpoch[`releaseDate;filteredDeals]
q)first filteredDeals
title      | "Homeworld Remastered Collection"
storeID    | 1
gameID     | 141243
salePrice  | 3.49
normalPrice| 34.99
isOnSale   | 1b
savings    | 90.02572
..
```

## Response Header

When making HTTP requests, responses include not only the requested content (like the deals we've seen) but also a header. Headers can contain valuable information, such as the status of the call (e.g., OK, Not Found) and other metadata.

### Extracting the Response Header

The utility function `.Q.hg` simplifies our lives by focusing on the content we need and hiding the header. However, there are cases where the header information is crucial. For example, the *CheapShark* API returns only up to 60 deals per page by default. To retrieve more data, you'll need to know how many pages of deals exist, which is indicated by the `x-total-page-count` header element.

#### How to Access the Header

To access the header, we can bypass `.Q.hg` and use the underlying function `.Q.hmb` directly. Here's a quick look at the definition of `.Q.hg`:

```q
q).Q.hg
k){hmb[x;`GET;()]1}
```

The function `.Q.hg` calls `.Q.hmb`, indexing the second item in the result, which is the content of the response. To access the header, we'll need to capture the first item returned by `.Q.hmb`.

Let's examine what `.Q.hmb` returns:

```q
q)show res:.Q.hmb[;`GET;()] .Q.dd[baseURL;`deals]
"HTTP/1.1 200 OK\r\ndate: Tue, 03 Sep 2024 14:48:26 GMT\r\ncontent-type: application/json\r\ncont..
"[{\"internalName\":\"METAMORPHOSIS\",\"title\":\"Metamorphosis\",\"metacriticLink\":\"\\/game\\/..
```

The first item in `res` is the HTTP header, and the second item is the familiar JSON content. To extract individual elements from the header, we can split the string using `"\r\n"`:

```q
q)show res:"\r\n" vs first res
"HTTP/1.1 200 OK"
"date: Tue, 03 Sep 2024 14:50:13 GMT"
"content-type: application/json"
"content-length: 8548"
"connection: close"
"cf-ray: 8bd68d08e961cca9-MAN"
"cf-cache-status: HIT"
..
```

#### Filtering and Formatting Header Elements

To clean up the header, we remove any empty elements:

```q
q)res@:where 0<count each res
```

The first element in the header is the response status, which we can handle separately:

```q
q)show header:enlist[`status]!enlist first res
status| "HTTP/1.1 200 OK"
```

For the remaining elements, we split them into `key: value` pairs:

```q
q)x:first 1_res
q)(0,x?":") cut x
"date"
": Tue, 03 Sep 2024 14:51:39 GMT"
```

The key should be converted to a symbol and the value should have the leading `":"` removed along with any other leading whitespace:

```q
q)(`$;ltrim 1_)@'(0,x?":") cut x
`date
"Tue, 03 Sep 2024 14:51:39 GMT"
```

We can apply this operation to all elements:

```q
q){(`$;ltrim 1_)@'(0,x?":") cut x} each 1_res
`date            "Tue, 03 Sep 2024 14:51:39 GMT"
`content-type    "application/json"             
`content-length  "8548"                         
`connection      "close"                        
`cf-ray          "8bd68f23fef1b3e7-MAN"         
`cf-cache-status "HIT"                     
..
```

Then, convert the result into a Q dictionary:

```q
q)(!). flip {(`$;ltrim 1_)@'(0,x?":") cut x} each 1_res
date           | "Tue, 03 Sep 2024 14:51:39 GMT"
content-type   | "application/json"
content-length | "8548"
connection     | "close"
cf-ray         | "8bd68f23fef1b3e7-MAN"
cf-cache-status| "HIT"
..
```

Finally, we can merge this with the header status:

```q
q)show header,:(!). flip {(`$;ltrim 1_)@'(0,x?":") cut x} each 1_res
status         | "HTTP/1.1 200 OK"
date           | "Tue, 03 Sep 2024 14:51:39 GMT"
content-type   | "application/json"
content-length | "8548"
connection     | "close"
cf-ray         | "8bd68f23fef1b3e7-MAN"
cf-cache-status| "HIT"
..
```

#### Wrapping It Up in a Function

For convenience, let's encapsulate these steps in a function:

```q
hg:{[url]
    r:.Q.hmb[url;`GET;()];
    h@:where 0<count each h:"\r\n" vs first r;
    header:enlist[`status]!enlist first h;
    header,:(!). flip {(`$;ltrim 1_)@'(0,x?":") cut x} each 1_h;
    `header`content!(header;last r)
 }
```

#### Using the Function

Now, we can use this function to extract the `x-total-page-count` from the header:

```q
q)res:hg .Q.dd[baseURL;`deals]
q)show pageCount:"J"$res[`header]`$"x-total-page-count"
50
```

This initial query retrieves the first page of deals and the total number of pages. The content can be stored in a variable:

```q
q)deals:.j.k res`content
```

For subsequent queries, we can revert to using `.Q.hg` and apply the [filtered query](#filtered-queries) approach:

```q
q)queryPage:.j.k .Q.hg .Q.dd[baseURL;] `$"deals?",buildFltStr enlist[`pageNumber]!enlist string@
q)queryPage 25 // Get 26th page (page numbering starts at 0)
internalName                             title                                             ..
-------------------------------------------------------------------------------------------..
"THETOWNOFLIGHT"                         "The Town Of Light"                               ..
"MXGP2021THEOFFICIALMOTOCROSSVIDEOGAME"  "MXGP 2021 - The Official Motocross Videogame"    ..
"KINGSBOUNTYIIDUKESEDITION"              "Kings Bounty II - Dukes Edition"                 ..
"NINOKUNIWRATHOFTHEWHITEWITCHREMASTERED" "Ni no Kuni: Wrath of the White Witch Remastered" ..
"SIDMEIERSCIVILIZATIONVIANTHOLOGY"       "Sid Meiers Civilization VI Anthology"            ..
..
```

To retrieve all pages, apply `queryPage` across the range of available pages (note that this may take some time):

```q
q)pages:queryPage each 1+til pageCount
q)count pages
50
```

Finally, combine all pages into a single `deals` table by using `raze`:

```q
q)deals,:raze pages
q)deals:applySchema[schema;deals]
q)deals:convertEpoch[`releaseDate;deals]
q)count deals
3060
```

## Conclusion

Integrating external APIs with Q/KDB+ can significantly enhance the data capabilities of your applications, particularly when dealing with large datasets or dynamic content. In this blog, we've explored how to interact with the *CheapShark* API, covering everything from basic API requests to more advanced topics like filtering queries, handling paginated data, and extracting valuable information from HTTP response headers.

By understanding these techniques, you can efficiently pull in and manipulate external data within your Q/KDB+ environment, opening up new possibilities for data analysis, application development, and real-time decision-making. Whether you’re querying for specific information or managing large datasets across multiple pages, these tools provide the flexibility needed to handle a wide range of scenarios.

With the knowledge from this guide, you should be well-equipped to integrate other APIs into your Q/KDB+ workflows, making your data processes even more powerful and versatile.
