/*!
  Highlight.js v11.11.1 (git: 5697ae5187)
  (c) 2006-2026 Josh Goebel <hello@joshgoebel.com> and other contributors
  License: BSD-3-Clause
 */
var hljs=function(){"use strict";function e(n){
return n instanceof Map?n.clear=n.delete=n.set=()=>{
throw Error("map is read-only")}:n instanceof Set&&(n.add=n.clear=n.delete=()=>{
throw Error("set is read-only")
}),Object.freeze(n),Object.getOwnPropertyNames(n).forEach((t=>{
const s=n[t],i=typeof s;"object"!==i&&"function"!==i||Object.isFrozen(s)||e(s)
})),n}class n{constructor(e){
void 0===e.data&&(e.data={}),this.data=e.data,this.isMatchIgnored=!1}
ignoreMatch(){this.isMatchIgnored=!0}}function t(e){
return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;")
}function s(e,...n){const t=Object.create(null);for(const n in e)t[n]=e[n]
;return n.forEach((e=>{for(const n in e)t[n]=e[n]})),t}const i=e=>!!e.scope
;class a{constructor(e,n){
this.buffer="",this.classPrefix=n.classPrefix,e.walk(this)}addText(e){
this.buffer+=t(e)}openNode(e){if(!i(e))return;const n=((e,{prefix:n})=>{
if(e.startsWith("language:"))return e.replace("language:","language-")
;if(e.includes(".")){const t=e.split(".")
;return[`${n}${t.shift()}`,...t.map(((e,n)=>`${e}${"_".repeat(n+1)}`))].join(" ")
}return`${n}${e}`})(e.scope,{prefix:this.classPrefix});this.span(n)}
closeNode(e){i(e)&&(this.buffer+="</span>")}value(){return this.buffer}span(e){
this.buffer+=`<span class="${e}">`}}const r=(e={})=>{const n={children:[]}
;return Object.assign(n,e),n};class o{constructor(){
this.rootNode=r(),this.stack=[this.rootNode]}get top(){
return this.stack[this.stack.length-1]}get root(){return this.rootNode}add(e){
this.top.children.push(e)}openNode(e){const n=r({scope:e})
;this.add(n),this.stack.push(n)}closeNode(){
if(this.stack.length>1)return this.stack.pop()}closeAllNodes(){
for(;this.closeNode(););}toJSON(){return JSON.stringify(this.rootNode,null,4)}
walk(e){return this.constructor._walk(e,this.rootNode)}static _walk(e,n){
return"string"==typeof n?e.addText(n):n.children&&(e.openNode(n),
n.children.forEach((n=>this._walk(e,n))),e.closeNode(n)),e}static _collapse(e){
"string"!=typeof e&&e.children&&(e.children.every((e=>"string"==typeof e))?e.children=[e.children.join("")]:e.children.forEach((e=>{
o._collapse(e)})))}}class c extends o{constructor(e){super(),this.options=e}
addText(e){""!==e&&this.add(e)}startScope(e){this.openNode(e)}endScope(){
this.closeNode()}__addSublanguage(e,n){const t=e.root
;n&&(t.scope="language:"+n),this.add(t)}toHTML(){
return new a(this,this.options).value()}finalize(){
return this.closeAllNodes(),!0}}function l(e){
return e?"string"==typeof e?e:e.source:null}function g(e){return h("(?=",e,")")}
function d(e){return h("(?:",e,")*")}function u(e){return h("(?:",e,")?")}
function h(...e){return e.map((e=>l(e))).join("")}function p(...e){const n=(e=>{
const n=e[e.length-1]
;return"object"==typeof n&&n.constructor===Object?(e.splice(e.length-1,1),n):{}
})(e);return"("+(n.capture?"":"?:")+e.map((e=>l(e))).join("|")+")"}
function m(e){return RegExp(e.toString()+"|").exec("").length-1}
const b=/\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./
;function f(e,{joinWith:n}){let t=0;return e.map((e=>{t+=1;const n=t
;let s=l(e),i="";for(;s.length>0;){const e=b.exec(s);if(!e){i+=s;break}
i+=s.substring(0,e.index),
s=s.substring(e.index+e[0].length),"\\"===e[0][0]&&e[1]?i+="\\"+(Number(e[1])+n):(i+=e[0],
"("===e[0]&&t++)}return i})).map((e=>`(${e})`)).join(n)}
const w="[a-zA-Z]\\w*",y="[a-zA-Z_]\\w*",E="\\b\\d+(\\.\\d+)?",_="(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",v="\\b(0b[01]+)",x={
begin:"\\\\[\\s\\S]",relevance:0},N={scope:"string",begin:"'",end:"'",
illegal:"\\n",contains:[x]},k={scope:"string",begin:'"',end:'"',illegal:"\\n",
contains:[x]},S=(e,n,t={})=>{const i=s({scope:"comment",begin:e,end:n,
contains:[]},t);i.contains.push({scope:"doctag",
begin:"[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
end:/(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,excludeBegin:!0,relevance:0})
;const a=p("I","a","is","so","us","to","at","if","in","it","on",/[A-Za-z]+['](d|ve|re|ll|t|s|n)/,/[A-Za-z]+[-][a-z]+/,/[A-Za-z][a-z]{2,}/)
;return i.contains.push({begin:h(/[ ]+/,"(",a,/[.]?[:]?([.][ ]|[ ])/,"){3}")}),i
},O=S("//","$"),M=S("/\\*","\\*/"),j=S("#","$");var R=Object.freeze({
__proto__:null,APOS_STRING_MODE:N,BACKSLASH_ESCAPE:x,BINARY_NUMBER_MODE:{
scope:"number",begin:v,relevance:0},BINARY_NUMBER_RE:v,COMMENT:S,
C_BLOCK_COMMENT_MODE:M,C_LINE_COMMENT_MODE:O,C_NUMBER_MODE:{scope:"number",
begin:_,relevance:0},C_NUMBER_RE:_,END_SAME_AS_BEGIN:e=>Object.assign(e,{
"on:begin":(e,n)=>{n.data._beginMatch=e[1]},"on:end":(e,n)=>{
n.data._beginMatch!==e[1]&&n.ignoreMatch()}}),HASH_COMMENT_MODE:j,IDENT_RE:w,
MATCH_NOTHING_RE:/\b\B/,METHOD_GUARD:{begin:"\\.\\s*"+y,relevance:0},
NUMBER_MODE:{scope:"number",begin:E,relevance:0},NUMBER_RE:E,
PHRASAL_WORDS_MODE:{
begin:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
},QUOTE_STRING_MODE:k,REGEXP_MODE:{scope:"regexp",begin:/\/(?=[^/\n]*\/)/,
end:/\/[gimuy]*/,contains:[x,{begin:/\[/,end:/\]/,relevance:0,contains:[x]}]},
RE_STARTERS_RE:"!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",
SHEBANG:(e={})=>{const n=/^#![ ]*\//
;return e.binary&&(e.begin=h(n,/.*\b/,e.binary,/\b.*/)),s({scope:"meta",begin:n,
end:/$/,relevance:0,"on:begin":(e,n)=>{0!==e.index&&n.ignoreMatch()}},e)},
TITLE_MODE:{scope:"title",begin:w,relevance:0},UNDERSCORE_IDENT_RE:y,
UNDERSCORE_TITLE_MODE:{scope:"title",begin:y,relevance:0}});function A(e,n){
"."===e.input[e.index-1]&&n.ignoreMatch()}function T(e,n){
void 0!==e.className&&(e.scope=e.className,delete e.className)}function I(e,n){
n&&e.beginKeywords&&(e.begin="\\b("+e.beginKeywords.split(" ").join("|")+")(?!\\.)(?=\\b|\\s)",
e.__beforeBegin=A,e.keywords=e.keywords||e.beginKeywords,delete e.beginKeywords,
void 0===e.relevance&&(e.relevance=0))}function B(e,n){
Array.isArray(e.illegal)&&(e.illegal=p(...e.illegal))}function C(e,n){
if(e.match){
if(e.begin||e.end)throw Error("begin & end are not supported with match")
;e.begin=e.match,delete e.match}}function D(e,n){
void 0===e.relevance&&(e.relevance=1)}const L=(e,n)=>{if(!e.beforeMatch)return
;if(e.starts)throw Error("beforeMatch cannot be used with starts")
;const t=Object.assign({},e);Object.keys(e).forEach((n=>{delete e[n]
})),e.keywords=t.keywords,e.begin=h(t.beforeMatch,g(t.begin)),e.starts={
relevance:0,contains:[Object.assign(t,{endsParent:!0})]
},e.relevance=0,delete t.beforeMatch
},z=["of","and","for","in","not","or","if","then","parent","list","value"]
;function P(e,n,t="keyword"){const s=Object.create(null)
;return"string"==typeof e?i(t,e.split(" ")):Array.isArray(e)?i(t,e):Object.keys(e).forEach((t=>{
Object.assign(s,P(e[t],n,t))})),s;function i(e,t){
n&&(t=t.map((e=>e.toLowerCase()))),t.forEach((n=>{const t=n.split("|")
;s[t[0]]=[e,$(t[0],t[1])]}))}}function $(e,n){
return n?Number(n):(e=>z.includes(e.toLowerCase()))(e)?0:1}const U={},H=e=>{
console.error(e)},G=(e,...n)=>{console.log("WARN: "+e,...n)},q=(e,n)=>{
U[`${e}/${n}`]||(console.log(`Deprecated as of ${e}. ${n}`),U[`${e}/${n}`]=!0)
},F=Error();function W(e,n,{key:t}){let s=0;const i=e[t],a={},r={}
;for(let e=1;e<=n.length;e++)r[e+s]=i[e],a[e+s]=!0,s+=m(n[e-1])
;e[t]=r,e[t]._emit=a,e[t]._multi=!0}function K(e){(e=>{
e.scope&&"object"==typeof e.scope&&null!==e.scope&&(e.beginScope=e.scope,
delete e.scope)})(e),"string"==typeof e.beginScope&&(e.beginScope={
_wrap:e.beginScope}),"string"==typeof e.endScope&&(e.endScope={_wrap:e.endScope
}),(e=>{if(Array.isArray(e.begin)){
if(e.skip||e.excludeBegin||e.returnBegin)throw H("skip, excludeBegin, returnBegin not compatible with beginScope: {}"),
F
;if("object"!=typeof e.beginScope||null===e.beginScope)throw H("beginScope must be object"),
F;W(e,e.begin,{key:"beginScope"}),e.begin=f(e.begin,{joinWith:""})}})(e),(e=>{
if(Array.isArray(e.end)){
if(e.skip||e.excludeEnd||e.returnEnd)throw H("skip, excludeEnd, returnEnd not compatible with endScope: {}"),
F
;if("object"!=typeof e.endScope||null===e.endScope)throw H("endScope must be object"),
F;W(e,e.end,{key:"endScope"}),e.end=f(e.end,{joinWith:""})}})(e)}function Z(e){
function n(n,t){
return RegExp(l(n),"m"+(e.case_insensitive?"i":"")+(e.unicodeRegex?"u":"")+(t?"g":""))
}class t{constructor(){
this.matchIndexes={},this.regexes=[],this.matchAt=1,this.position=0}
addRule(e,n){
n.position=this.position++,this.matchIndexes[this.matchAt]=n,this.regexes.push([n,e]),
this.matchAt+=m(e)+1}compile(){0===this.regexes.length&&(this.exec=()=>null)
;const e=this.regexes.map((e=>e[1]));this.matcherRe=n(f(e,{joinWith:"|"
}),!0),this.lastIndex=0}exec(e){this.matcherRe.lastIndex=this.lastIndex
;const n=this.matcherRe.exec(e);if(!n)return null
;const t=n.findIndex(((e,n)=>n>0&&void 0!==e)),s=this.matchIndexes[t]
;return n.splice(0,t),Object.assign(n,s)}}class i{constructor(){
this.rules=[],this.multiRegexes=[],
this.count=0,this.lastIndex=0,this.regexIndex=0}getMatcher(e){
if(this.multiRegexes[e])return this.multiRegexes[e];const n=new t
;return this.rules.slice(e).forEach((([e,t])=>n.addRule(e,t))),
n.compile(),this.multiRegexes[e]=n,n}resumingScanAtSamePosition(){
return 0!==this.regexIndex}considerAll(){this.regexIndex=0}addRule(e,n){
this.rules.push([e,n]),"begin"===n.type&&this.count++}exec(e){
const n=this.getMatcher(this.regexIndex);n.lastIndex=this.lastIndex
;let t=n.exec(e)
;if(this.resumingScanAtSamePosition())if(t&&t.index===this.lastIndex);else{
const n=this.getMatcher(0);n.lastIndex=this.lastIndex+1,t=n.exec(e)}
return t&&(this.regexIndex+=t.position+1,
this.regexIndex===this.count&&this.considerAll()),t}}
if(e.compilerExtensions||(e.compilerExtensions=[]),
e.contains&&e.contains.includes("self"))throw Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.")
;return e.classNameAliases=s(e.classNameAliases||{}),function t(a,r){const o=a
;if(a.isCompiled)return o
;[T,C,K,L].forEach((e=>e(a,r))),e.compilerExtensions.forEach((e=>e(a,r))),
a.__beforeBegin=null,[I,B,D].forEach((e=>e(a,r))),a.isCompiled=!0;let c=null
;return"object"==typeof a.keywords&&a.keywords.$pattern&&(a.keywords=Object.assign({},a.keywords),
c=a.keywords.$pattern,
delete a.keywords.$pattern),c=c||/\w+/,a.keywords&&(a.keywords=P(a.keywords,e.case_insensitive)),
o.keywordPatternRe=n(c,!0),
r&&(a.begin||(a.begin=/\B|\b/),o.beginRe=n(o.begin),a.end||a.endsWithParent||(a.end=/\B|\b/),
a.end&&(o.endRe=n(o.end)),
o.terminatorEnd=l(o.end)||"",a.endsWithParent&&r.terminatorEnd&&(o.terminatorEnd+=(a.end?"|":"")+r.terminatorEnd)),
a.illegal&&(o.illegalRe=n(a.illegal)),
a.contains||(a.contains=[]),a.contains=[].concat(...a.contains.map((e=>(e=>(e.variants&&!e.cachedVariants&&(e.cachedVariants=e.variants.map((n=>s(e,{
variants:null},n)))),e.cachedVariants?e.cachedVariants:X(e)?s(e,{
starts:e.starts?s(e.starts):null
}):Object.isFrozen(e)?s(e):e))("self"===e?a:e)))),a.contains.forEach((e=>{t(e,o)
})),a.starts&&t(a.starts,r),o.matcher=(e=>{const n=new i
;return e.contains.forEach((e=>n.addRule(e.begin,{rule:e,type:"begin"
}))),e.terminatorEnd&&n.addRule(e.terminatorEnd,{type:"end"
}),e.illegal&&n.addRule(e.illegal,{type:"illegal"}),n})(o),o}(e)}function X(e){
return!!e&&(e.endsWithParent||X(e.starts))}class Q extends Error{
constructor(e,n){super(e),this.name="HTMLInjectionError",this.html=n}}
const V=t,J=s,Y=Symbol("nomatch"),ee=t=>{
const s=Object.create(null),i=Object.create(null),a=[];let r=!0
;const o="Could not find the language '{}', did you forget to load/include a language module?",l={
disableAutodetect:!0,name:"Plain text",contains:[]};let m={
ignoreUnescapedHTML:!1,throwUnescapedHTML:!1,noHighlightRe:/^(no-?highlight)$/i,
languageDetectRe:/\blang(?:uage)?-([\w-]+)\b/i,classPrefix:"hljs-",
cssSelector:"pre code",languages:null,__emitter:c};function b(e){
return m.noHighlightRe.test(e)}function f(e,n,t){let s="",i=""
;"object"==typeof n?(s=e,
t=n.ignoreIllegals,i=n.language):(q("10.7.0","highlight(lang, code, ...args) has been deprecated."),
q("10.7.0","Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277"),
i=e,s=n),void 0===t&&(t=!0);const a={code:s,language:i};S("before:highlight",a)
;const r=a.result?a.result:w(a.language,a.code,t)
;return r.code=a.code,S("after:highlight",r),r}function w(e,t,i,a){
const c=Object.create(null);function l(){if(!S.keywords)return void M.addText(j)
;let e=0;S.keywordPatternRe.lastIndex=0;let n=S.keywordPatternRe.exec(j),t=""
;for(;n;){t+=j.substring(e,n.index)
;const i=v.case_insensitive?n[0].toLowerCase():n[0],a=(s=i,S.keywords[s]);if(a){
const[e,s]=a
;if(M.addText(t),t="",c[i]=(c[i]||0)+1,c[i]<=7&&(R+=s),e.startsWith("_"))t+=n[0];else{
const t=v.classNameAliases[e]||e;d(n[0],t)}}else t+=n[0]
;e=S.keywordPatternRe.lastIndex,n=S.keywordPatternRe.exec(j)}var s
;t+=j.substring(e),M.addText(t)}function g(){null!=S.subLanguage?(()=>{
if(""===j)return;let e=null;if("string"==typeof S.subLanguage){
if(!s[S.subLanguage])return void M.addText(j)
;e=w(S.subLanguage,j,!0,O[S.subLanguage]),O[S.subLanguage]=e._top
}else e=y(j,S.subLanguage.length?S.subLanguage:null)
;S.relevance>0&&(R+=e.relevance),M.__addSublanguage(e._emitter,e.language)
})():l(),j=""}function d(e,n){
""!==e&&(M.startScope(n),M.addText(e),M.endScope())}function u(e,n){let t=1
;const s=n.length-1;for(;t<=s;){if(!e._emit[t]){t++;continue}
const s=v.classNameAliases[e[t]]||e[t],i=n[t];s?d(i,s):(j=i,l(),j=""),t++}}
function h(e,n){
return e.scope&&"string"==typeof e.scope&&M.openNode(v.classNameAliases[e.scope]||e.scope),
e.beginScope&&(e.beginScope._wrap?(d(j,v.classNameAliases[e.beginScope._wrap]||e.beginScope._wrap),
j=""):e.beginScope._multi&&(u(e.beginScope,n),j="")),S=Object.create(e,{parent:{
value:S}}),S}function p(e,t,s){let i=((e,n)=>{const t=e&&e.exec(n)
;return t&&0===t.index})(e.endRe,s);if(i){if(e["on:end"]){const s=new n(e)
;e["on:end"](t,s),s.isMatchIgnored&&(i=!1)}if(i){
for(;e.endsParent&&e.parent;)e=e.parent;return e}}
if(e.endsWithParent)return p(e.parent,t,s)}function b(e){
return 0===S.matcher.regexIndex?(j+=e[0],1):(I=!0,0)}function f(e){
const n=e[0],s=t.substring(e.index),i=p(S,e,s);if(!i)return Y;const a=S
;S.endScope&&S.endScope._wrap?(g(),
d(n,S.endScope._wrap)):S.endScope&&S.endScope._multi?(g(),
u(S.endScope,e)):a.skip?j+=n:(a.returnEnd||a.excludeEnd||(j+=n),
g(),a.excludeEnd&&(j=n));do{
S.scope&&M.closeNode(),S.skip||S.subLanguage||(R+=S.relevance),S=S.parent
}while(S!==i.parent);return i.starts&&h(i.starts,e),a.returnEnd?0:n.length}
let E={};function _(s,a){const o=a&&a[0];if(j+=s,null==o)return g(),0
;if("begin"===E.type&&"end"===a.type&&E.index===a.index&&""===o){
if(j+=t.slice(a.index,a.index+1),!r){const n=Error(`0 width match regex (${e})`)
;throw n.languageName=e,n.badRule=E.rule,n}return 1}
if(E=a,"begin"===a.type)return(e=>{
const t=e[0],s=e.rule,i=new n(s),a=[s.__beforeBegin,s["on:begin"]]
;for(const n of a)if(n&&(n(e,i),i.isMatchIgnored))return b(t)
;return s.skip?j+=t:(s.excludeBegin&&(j+=t),
g(),s.returnBegin||s.excludeBegin||(j=t)),h(s,e),s.returnBegin?0:t.length})(a)
;if("illegal"===a.type&&!i){
const e=Error('Illegal lexeme "'+o+'" for mode "'+(S.scope||"<unnamed>")+'"')
;throw e.mode=S,e}if("end"===a.type){const e=f(a);if(e!==Y)return e}
if("illegal"===a.type&&""===o)return a.index===t.length||(j+="\n"),1
;if(T>1e5&&T>3*a.index)throw Error("potential infinite loop, way more iterations than matches")
;return j+=o,o.length}const v=x(e)
;if(!v)throw H(o.replace("{}",e)),Error('Unknown language: "'+e+'"')
;const N=Z(v);let k="",S=a||N;const O={},M=new m.__emitter(m);(()=>{const e=[]
;for(let n=S;n!==v;n=n.parent)n.scope&&e.unshift(n.scope)
;e.forEach((e=>M.openNode(e)))})();let j="",R=0,A=0,T=0,I=!1;try{
if(v.__emitTokens)v.__emitTokens(t,M);else{for(S.matcher.considerAll();;){
T++,I?I=!1:S.matcher.considerAll(),S.matcher.lastIndex=A
;const e=S.matcher.exec(t);if(!e)break;const n=_(t.substring(A,e.index),e)
;A=e.index+n}_(t.substring(A))}return M.finalize(),k=M.toHTML(),{language:e,
value:k,relevance:R,illegal:!1,_emitter:M,_top:S}}catch(n){
if(n.message&&n.message.includes("Illegal"))return{language:e,value:V(t),
illegal:!0,relevance:0,_illegalBy:{message:n.message,index:A,
context:t.slice(A-100,A+100),mode:n.mode,resultSoFar:k},_emitter:M};if(r)return{
language:e,value:V(t),illegal:!1,relevance:0,errorRaised:n,_emitter:M,_top:S}
;throw n}}function y(e,n){n=n||m.languages||Object.keys(s);const t=(e=>{
const n={value:V(e),illegal:!1,relevance:0,_top:l,_emitter:new m.__emitter(m)}
;return n._emitter.addText(e),n})(e),i=n.filter(x).filter(k).map((n=>w(n,e,!1)))
;i.unshift(t);const a=i.sort(((e,n)=>{
if(e.relevance!==n.relevance)return n.relevance-e.relevance
;if(e.language&&n.language){if(x(e.language).supersetOf===n.language)return 1
;if(x(n.language).supersetOf===e.language)return-1}return 0})),[r,o]=a,c=r
;return c.secondBest=o,c}function E(e){let n=null;const t=(e=>{
let n=e.className+" ";n+=e.parentNode?e.parentNode.className:""
;const t=m.languageDetectRe.exec(n);if(t){const n=x(t[1])
;return n||(G(o.replace("{}",t[1])),
G("Falling back to no-highlight mode for this block.",e)),n?t[1]:"no-highlight"}
return n.split(/\s+/).find((e=>b(e)||x(e)))})(e);if(b(t))return
;if(S("before:highlightElement",{el:e,language:t
}),e.dataset.highlighted)return void console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.",e)
;if(e.children.length>0&&(m.ignoreUnescapedHTML||(console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk."),
console.warn("https://github.com/highlightjs/highlight.js/wiki/security"),
console.warn("The element with unescaped HTML:"),
console.warn(e)),m.throwUnescapedHTML))throw new Q("One of your code blocks includes unescaped HTML.",e.innerHTML)
;n=e;const s=n.textContent,a=t?f(s,{language:t,ignoreIllegals:!0}):y(s)
;e.innerHTML=a.value,e.dataset.highlighted="yes",((e,n,t)=>{const s=n&&i[n]||t
;e.classList.add("hljs"),e.classList.add("language-"+s)
})(e,t,a.language),e.result={language:a.language,re:a.relevance,
relevance:a.relevance},a.secondBest&&(e.secondBest={
language:a.secondBest.language,relevance:a.secondBest.relevance
}),S("after:highlightElement",{el:e,result:a,text:s})}let _=!1;function v(){
if("loading"===document.readyState)return _||window.addEventListener("DOMContentLoaded",(()=>{
v()}),!1),void(_=!0);document.querySelectorAll(m.cssSelector).forEach(E)}
function x(e){return e=(e||"").toLowerCase(),s[e]||s[i[e]]}
function N(e,{languageName:n}){"string"==typeof e&&(e=[e]),e.forEach((e=>{
i[e.toLowerCase()]=n}))}function k(e){const n=x(e)
;return n&&!n.disableAutodetect}function S(e,n){const t=e;a.forEach((e=>{
e[t]&&e[t](n)}))}Object.assign(t,{highlight:f,highlightAuto:y,highlightAll:v,
highlightElement:E,
highlightBlock:e=>(q("10.7.0","highlightBlock will be removed entirely in v12.0"),
q("10.7.0","Please use highlightElement now."),E(e)),configure:e=>{m=J(m,e)},
initHighlighting:()=>{
v(),q("10.6.0","initHighlighting() deprecated.  Use highlightAll() now.")},
initHighlightingOnLoad:()=>{
v(),q("10.6.0","initHighlightingOnLoad() deprecated.  Use highlightAll() now.")
},registerLanguage:(e,n)=>{let i=null;try{i=n(t)}catch(n){
if(H("Language definition for '{}' could not be registered.".replace("{}",e)),
!r)throw n;H(n),i=l}
i.name||(i.name=e),s[e]=i,i.rawDefinition=n.bind(null,t),i.aliases&&N(i.aliases,{
languageName:e})},unregisterLanguage:e=>{delete s[e]
;for(const n of Object.keys(i))i[n]===e&&delete i[n]},
listLanguages:()=>Object.keys(s),getLanguage:x,registerAliases:N,
autoDetection:k,inherit:J,addPlugin:e=>{(e=>{
e["before:highlightBlock"]&&!e["before:highlightElement"]&&(e["before:highlightElement"]=n=>{
e["before:highlightBlock"](Object.assign({block:n.el},n))
}),e["after:highlightBlock"]&&!e["after:highlightElement"]&&(e["after:highlightElement"]=n=>{
e["after:highlightBlock"](Object.assign({block:n.el},n))})})(e),a.push(e)},
removePlugin:e=>{const n=a.indexOf(e);-1!==n&&a.splice(n,1)}}),t.debugMode=()=>{
r=!1},t.safeMode=()=>{r=!0},t.versionString="11.11.1",t.regex={concat:h,
lookahead:g,either:p,optional:u,anyNumberOfTimes:d}
;for(const n in R)"object"==typeof R[n]&&e(R[n]);return Object.assign(t,R),t
},ne=ee({});ne.newInstance=()=>ee({});const te={scope:"number",
match:"([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity",
relevance:0};var se=Object.freeze({__proto__:null,grmr_bash:e=>{
const n=e.regex,t={},s={begin:/\$\{/,end:/\}/,contains:["self",{begin:/:-/,
contains:[t]}]};Object.assign(t,{className:"variable",variants:[{
begin:n.concat(/\$[\w\d#@][\w\d_]*/,"(?![\\w\\d])(?![$])")},s]});const i={
className:"subst",begin:/\$\(/,end:/\)/,contains:[e.BACKSLASH_ESCAPE]
},a=e.inherit(e.COMMENT(),{match:[/(^|\s)/,/#.*$/],scope:{2:"comment"}}),r={
begin:/<<-?\s*(?=\w+)/,starts:{contains:[e.END_SAME_AS_BEGIN({begin:/(\w+)/,
end:/(\w+)/,className:"string"})]}},o={className:"string",begin:/"/,end:/"/,
contains:[e.BACKSLASH_ESCAPE,t,i]};i.contains.push(o);const c={begin:/\$?\(\(/,
end:/\)\)/,contains:[{begin:/\d+#[0-9a-f]+/,className:"number"},e.NUMBER_MODE,t]
},l=e.SHEBANG({binary:"(fish|bash|zsh|sh|csh|ksh|tcsh|dash|scsh)",relevance:10
}),g={className:"function",begin:/\w[\w\d_]*\s*\(\s*\)\s*\{/,returnBegin:!0,
contains:[e.inherit(e.TITLE_MODE,{begin:/\w[\w\d_]*/})],relevance:0};return{
name:"Bash",aliases:["sh","zsh"],keywords:{$pattern:/\b[a-z][a-z0-9._-]+\b/,
keyword:["if","then","else","elif","fi","time","for","while","until","in","do","done","case","esac","coproc","function","select"],
literal:["true","false"],
built_in:["break","cd","continue","eval","exec","exit","export","getopts","hash","pwd","readonly","return","shift","test","times","trap","umask","unset","alias","bind","builtin","caller","command","declare","echo","enable","help","let","local","logout","mapfile","printf","read","readarray","source","sudo","type","typeset","ulimit","unalias","set","shopt","autoload","bg","bindkey","bye","cap","chdir","clone","comparguments","compcall","compctl","compdescribe","compfiles","compgroups","compquote","comptags","comptry","compvalues","dirs","disable","disown","echotc","echoti","emulate","fc","fg","float","functions","getcap","getln","history","integer","jobs","kill","limit","log","noglob","popd","print","pushd","pushln","rehash","sched","setcap","setopt","stat","suspend","ttyctl","unfunction","unhash","unlimit","unsetopt","vared","wait","whence","where","which","zcompile","zformat","zftp","zle","zmodload","zparseopts","zprof","zpty","zregexparse","zsocket","zstyle","ztcp","chcon","chgrp","chown","chmod","cp","dd","df","dir","dircolors","ln","ls","mkdir","mkfifo","mknod","mktemp","mv","realpath","rm","rmdir","shred","sync","touch","truncate","vdir","b2sum","base32","base64","cat","cksum","comm","csplit","cut","expand","fmt","fold","head","join","md5sum","nl","numfmt","od","paste","ptx","pr","sha1sum","sha224sum","sha256sum","sha384sum","sha512sum","shuf","sort","split","sum","tac","tail","tr","tsort","unexpand","uniq","wc","arch","basename","chroot","date","dirname","du","echo","env","expr","factor","groups","hostid","id","link","logname","nice","nohup","nproc","pathchk","pinky","printenv","printf","pwd","readlink","runcon","seq","sleep","stat","stdbuf","stty","tee","test","timeout","tty","uname","unlink","uptime","users","who","whoami","yes"]
},contains:[l,e.SHEBANG(),g,c,a,r,{match:/(\/[a-z._-]+)+/},o,{match:/\\"/},{
className:"string",begin:/'/,end:/'/},{match:/\\'/},t]}},grmr_json:e=>{
const n=["true","false","null"],t={scope:"literal",beginKeywords:n.join(" ")}
;return{name:"JSON",aliases:["jsonc","json5"],keywords:{literal:n},contains:[{
className:"attr",begin:/(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,
relevance:1.01},{match:/[{}[\],:]/,className:"punctuation",relevance:0
},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,t,te,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE],
illegal:"\\S"}},grmr_powershell:e=>{const n={$pattern:/-?[A-z\.\-]+\b/,
keyword:"if else foreach return do while until elseif begin for trap data dynamicparam end break throw param continue finally in switch exit filter try process catch hidden static parameter",
built_in:"ac asnp cat cd CFS chdir clc clear clhy cli clp cls clv cnsn compare copy cp cpi cpp curl cvpa dbp del diff dir dnsn ebp echo|0 epal epcsv epsn erase etsn exsn fc fhx fl ft fw gal gbp gc gcb gci gcm gcs gdr gerr ghy gi gin gjb gl gm gmo gp gps gpv group gsn gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi iwr kill lp ls man md measure mi mount move mp mv nal ndr ni nmo npssc nsn nv ogv oh popd ps pushd pwd r rbp rcjb rcsn rd rdr ren ri rjb rm rmdir rmo rni rnp rp rsn rsnp rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select set shcm si sl sleep sls sort sp spjb spps spsv start stz sujb sv swmi tee trcm type wget where wjb write"
},t={begin:"`[\\s\\S]",relevance:0},s={className:"variable",variants:[{
begin:/\$\B/},{className:"keyword",begin:/\$this/},{begin:/\$[\w\d][\w\d_:]*/}]
},i={className:"string",variants:[{begin:/"/,end:/"/},{begin:/@"/,end:/^"@/}],
contains:[t,s,{className:"variable",begin:/\$[A-z]/,end:/[^A-z]/}]},a={
className:"string",variants:[{begin:/'/,end:/'/},{begin:/@'/,end:/^'@/}]
},r=e.inherit(e.COMMENT(null,null),{variants:[{begin:/#/,end:/$/},{begin:/<#/,
end:/#>/}],contains:[{className:"doctag",variants:[{
begin:/\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/
},{
begin:/\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/
}]}]}),o={className:"class",beginKeywords:"class enum",end:/\s*[{]/,
excludeEnd:!0,relevance:0,contains:[e.TITLE_MODE]},c={className:"function",
begin:/function\s+/,end:/\s*\{|$/,excludeEnd:!0,returnBegin:!0,relevance:0,
contains:[{begin:"function",relevance:0,className:"keyword"},{className:"title",
begin:/\w[\w\d]*((-)[\w\d]+)*/,relevance:0},{begin:/\(/,end:/\)/,
className:"params",relevance:0,contains:[s]}]},l={begin:/using\s/,end:/$/,
returnBegin:!0,contains:[i,a,{className:"keyword",
begin:/(using|assembly|command|module|namespace|type)/}]},g={
className:"function",begin:/\[.*\]\s*[\w]+[ ]??\(/,end:/$/,returnBegin:!0,
relevance:0,contains:[{className:"keyword",
begin:"(".concat(n.keyword.toString().replace(/\s/g,"|"),")\\b"),endsParent:!0,
relevance:0},e.inherit(e.TITLE_MODE,{endsParent:!0})]
},d=[g,r,t,e.NUMBER_MODE,i,a,{className:"built_in",variants:[{
begin:"(Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|Search|Select|Set|Show|Skip|Split|Step|Switch|Undo|Unlock|Watch|Backup|Checkpoint|Compare|Compress|Convert|ConvertFrom|ConvertTo|Dismount|Edit|Expand|Export|Group|Import|Initialize|Limit|Merge|Mount|Out|Publish|Restore|Save|Sync|Unpublish|Update|Approve|Assert|Build|Complete|Confirm|Deny|Deploy|Disable|Enable|Install|Invoke|Register|Request|Restart|Resume|Start|Stop|Submit|Suspend|Uninstall|Unregister|Wait|Debug|Measure|Ping|Repair|Resolve|Test|Trace|Connect|Disconnect|Read|Receive|Send|Write|Block|Grant|Protect|Revoke|Unblock|Unprotect|Use|ForEach|Sort|Tee|Where)+(-)[\\w\\d]+"
}]},s,{className:"literal",begin:/\$(null|true|false)\b/},{
className:"selector-tag",begin:/@\B/,relevance:0}],u={begin:/\[/,end:/\]/,
excludeBegin:!0,excludeEnd:!0,relevance:0,contains:[].concat("self",d,{
begin:"(string|char|byte|int|long|bool|decimal|single|double|DateTime|xml|array|hashtable|void)",
className:"built_in",relevance:0},{className:"type",begin:/[\.\w\d]+/,
relevance:0})};return g.contains.unshift(u),{name:"PowerShell",
aliases:["pwsh","ps","ps1"],case_insensitive:!0,keywords:n,
contains:d.concat(o,c,l,{variants:[{className:"operator",
begin:"(-and|-as|-band|-bnot|-bor|-bxor|-casesensitive|-ccontains|-ceq|-cge|-cgt|-cle|-clike|-clt|-cmatch|-cne|-cnotcontains|-cnotlike|-cnotmatch|-contains|-creplace|-csplit|-eq|-exact|-f|-file|-ge|-gt|-icontains|-ieq|-ige|-igt|-ile|-ilike|-ilt|-imatch|-in|-ine|-inotcontains|-inotlike|-inotmatch|-ireplace|-is|-isnot|-isplit|-join|-le|-like|-lt|-match|-ne|-not|-notcontains|-notin|-notlike|-notmatch|-or|-regex|-replace|-shl|-shr|-split|-wildcard|-xor)\\b"
},{className:"literal",begin:/(-){1,2}[\w\d-]+/,relevance:0}]},u)}},grmr_q:e=>({
name:"q",aliases:["k","kdb"],keywords:{$pattern:/(`?)[A-Za-z0-9_]+\b/,
keyword:"abs acos aj aj0 ajf ajf0 all and any asc asin asof atan attr avg avgs bin binr ceiling cols cor cos count cov cross csv cut delete deltas desc dev differ distinct div do dsave each ej ema enlist eval except exec exit exp fby fills first fkeys flip floor get getenv group gtime hclose hcount hdel hopen hsym iasc idesc if ij ijf in insert inter inv key keys last like lj ljf load log lower lsq ltime ltrim mavg max maxs mcount md5 mdev med meta min mins mmax mmin mmu mod msum neg next not null or over parse peach pj prd prds prev prior rand rank ratios raze read0 read1 reciprocal reval reverse rload rotate rsave rtrim save scan scov sdev select set setenv show signum sin sqrt ss ssr string sublist sum sums sv svar system tables tan til trim type uj ujf ungroup union update upper upsert value var view views vs wavg where while within wj wj1 wsum xasc xbar xcol xcols xdesc xexp xgroup xkey xlog xprev xrank from by",
literal:"0b 1b"},contains:[{className:"comment",begin:/(^|\s)\//,end:/$/,
relevance:0},e.QUOTE_STRING_MODE,{className:"built_in",
begin:/\.[hjmQzq]\.[a-zA-Z][a-zA-Z0-9]*/},{className:"symbol",
begin:/`([\w.:]*:[\w.:/]*|[\w.:]*)/},{className:"literal",begin:/\b[01]b\b/},{
className:"number",begin:/\b(\d+(\.\d+)?(e[+-]?\d+)?[efhij]?|0[NnWw][efhij]?)\b/
},e.C_NUMBER_MODE]}),grmr_rust:e=>{
const n=e.regex,t=/(r#)?/,s=n.concat(t,e.UNDERSCORE_IDENT_RE),i=n.concat(t,e.IDENT_RE),a={
className:"title.function.invoke",relevance:0,
begin:n.concat(/\b/,/(?!let|for|while|if|else|match\b)/,i,n.lookahead(/\s*\(/))
},r="([ui](8|16|32|64|128|size)|f(32|64))?",o=["drop ","Copy","Send","Sized","Sync","Drop","Fn","FnMut","FnOnce","ToOwned","Clone","Debug","PartialEq","PartialOrd","Eq","Ord","AsRef","AsMut","Into","From","Default","Iterator","Extend","IntoIterator","DoubleEndedIterator","ExactSizeIterator","SliceConcatExt","ToString","assert!","assert_eq!","bitflags!","bytes!","cfg!","col!","concat!","concat_idents!","debug_assert!","debug_assert_eq!","env!","eprintln!","panic!","file!","format!","format_args!","include_bytes!","include_str!","line!","local_data_key!","module_path!","option_env!","print!","println!","select!","stringify!","try!","unimplemented!","unreachable!","vec!","write!","writeln!","macro_rules!","assert_ne!","debug_assert_ne!"],c=["i8","i16","i32","i64","i128","isize","u8","u16","u32","u64","u128","usize","f32","f64","str","char","bool","Box","Option","Result","String","Vec"]
;return{name:"Rust",aliases:["rs"],keywords:{$pattern:e.IDENT_RE+"!?",type:c,
keyword:["abstract","as","async","await","become","box","break","const","continue","crate","do","dyn","else","enum","extern","false","final","fn","for","if","impl","in","let","loop","macro","match","mod","move","mut","override","priv","pub","ref","return","self","Self","static","struct","super","trait","true","try","type","typeof","union","unsafe","unsized","use","virtual","where","while","yield"],
literal:["true","false","Some","None","Ok","Err"],built_in:o},illegal:"</",
contains:[e.C_LINE_COMMENT_MODE,e.COMMENT("/\\*","\\*/",{contains:["self"]
}),e.inherit(e.QUOTE_STRING_MODE,{begin:/b?"/,illegal:null}),{
className:"symbol",begin:/'[a-zA-Z_][a-zA-Z0-9_]*(?!')/},{scope:"string",
variants:[{begin:/b?r(#*)"(.|\n)*?"\1(?!#)/},{begin:/b?'/,end:/'/,contains:[{
scope:"char.escape",match:/\\('|\w|x\w{2}|u\w{4}|U\w{8})/}]}]},{
className:"number",variants:[{begin:"\\b0b([01_]+)"+r},{begin:"\\b0o([0-7_]+)"+r
},{begin:"\\b0x([A-Fa-f0-9_]+)"+r},{
begin:"\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)"+r}],relevance:0},{
begin:[/fn/,/\s+/,s],className:{1:"keyword",3:"title.function"}},{
className:"meta",begin:"#!?\\[",end:"\\]",contains:[{className:"string",
begin:/"/,end:/"/,contains:[e.BACKSLASH_ESCAPE]}]},{
begin:[/let/,/\s+/,/(?:mut\s+)?/,s],className:{1:"keyword",3:"keyword",
4:"variable"}},{begin:[/for/,/\s+/,s,/\s+/,/in/],className:{1:"keyword",
3:"variable",5:"keyword"}},{begin:[/type/,/\s+/,s],className:{1:"keyword",
3:"title.class"}},{begin:[/(?:trait|enum|struct|union|impl|for)/,/\s+/,s],
className:{1:"keyword",3:"title.class"}},{begin:e.IDENT_RE+"::",keywords:{
keyword:"Self",built_in:o,type:c}},{className:"punctuation",begin:"->"},a]}}})
;const ie=ne;for(const e of Object.keys(se)){
const n=e.replace("grmr_","").replace("_","-");ie.registerLanguage(n,se[e])}
return ie}()
;"object"==typeof exports&&"undefined"!=typeof module&&(module.exports=hljs);