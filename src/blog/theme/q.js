/*
Language: Q
Description: Q is a vector-based functional paradigm programming language built into the kdb+ database.
             (K/Q/Kdb+ from Kx Systems)
Author: Jonathan Kane <jkane17x@gmail.com>
Category: enterprise, functional, database
*/

export default function(hljs) {
  const KEYWORDS = {
    $pattern: /(`?)[A-Za-z0-9_]+\b/,
    keyword:
      'abs acos aj aj0 ajf ajf0 all and any asc asin asof atan attr avg avgs ' +
      'bin binr ceiling cols cor cos count cov cross csv cut delete deltas desc ' +
      'dev differ distinct div do dsave each ej ema enlist eval except exec exit ' +
      'exp fby fills first fkeys flip floor get getenv group gtime hclose hcount ' +
      'hdel hopen hsym iasc idesc if ij ijf in insert inter inv key keys last ' +
      'like lj ljf load log lower lsq ltime ltrim mavg max maxs mcount md5 mdev ' +
      'med meta min mins mmax mmin mmu mod msum neg next not null or over parse ' +
      'peach pj prd prds prev prior rand rank ratios raze read0 read1 reciprocal ' +
      'reval reverse rload rotate rsave rtrim save scan scov sdev select set ' +
      'setenv show signum sin sqrt ss ssr string sublist sum sums sv svar system ' +
      'tables tan til trim type uj ujf ungroup union update upper upsert value ' +
      'var view views vs wavg where while within wj wj1 wsum xasc xbar xcol xcols ' +
      'xdesc xexp xgroup xkey xlog xprev xrank from by',
    literal:
      '0b 1b'
  };

  return {
    name: 'q',
    aliases: ['k', 'kdb'],
    keywords: KEYWORDS,
    contains: [
      // Line comment starting with / (needs to be at start or after whitespace)
      {
        className: 'comment',
        begin: /(^|\s)\//,
        end: /$/,
        relevance: 0
      },
      // String
      hljs.QUOTE_STRING_MODE,
      // Namespaced functions (.z.w, .Q.hg, .h.ht, etc.)
      {
        className: 'built_in',
        begin: /\.[hjmQzq]\.[a-zA-Z][a-zA-Z0-9]*/
      },
      // Symbol (backtick followed by identifier or path)
      {
        className: 'symbol',
        begin: /`([\w.:]*:[\w.:/]*|[\w.:]*)/
      },
      // Boolean literals
      {
        className: 'literal',
        begin: /\b[01]b\b/
      },
      // Numbers with Q-specific suffixes and special values
      {
        className: 'number',
        begin: /\b(\d+(\.\d+)?(e[+-]?\d+)?[efhij]?|0[NnWw][efhij]?)\b/
      },
      // Standard C-style numbers as fallback
      hljs.C_NUMBER_MODE
    ]
  };
}