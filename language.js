(function(){
"use strict";
var STORAGE_KEY="wh-site-language-v1",CACHE_KEY="wh-translation-cache-v2",DEFAULT_LANGUAGE="ar";
var RTL_LANGUAGES=new Set(["ar","ar-SA","he","iw","fa","ur","ps","sd","ug","yi","dv"]);
var FALLBACK_LANGUAGES=[
{code:"en",name:"English"},{code:"zh",name:"简体中文"},{code:"hi",name:"हिन्दी"},
{code:"es",name:"Español"},{code:"ar",name:"العربية"},{code:"fr",name:"Français"},
{code:"bn",name:"বাংলা"},{code:"pt",name:"Português"},{code:"id",name:"Bahasa Indonesia"},
{code:"ur",name:"اردو"},{code:"ru",name:"Русский"},{code:"de",name:"Deutsch"},
{code:"ja",name:"日本語"},{code:"tr",name:"Türkçe"},{code:"ko",name:"한국어"},
{code:"vi",name:"Tiếng Việt"},{code:"th",name:"ไทย"},{code:"fa",name:"فارسی"},
{code:"ms",name:"Bahasa Melayu"},{code:"it",name:"Italiano"},{code:"sw",name:"Kiswahili"},
{code:"tl",name:"Filipino"},{code:"pl",name:"Polski"},{code:"nl",name:"Nederlands"},
{code:"zh-Hant",name:"繁體中文"},{code:"ta",name:"தமிழ்"},{code:"uk",name:"Українська"}
];
var currentLanguage=readLanguage(),languageName=readStoredName(),generation=0;
var textOriginals=new Map(),textTranslations=new Map(),attributeOriginals=new Map(),attributeTranslations=new Map();
var translationCache=readCache(),currentModal=null,modalStatus=null,languageListNode=null,searchNode=null;
var languageList=[],languageListTarget=null,translating=false,translationQueued=false;
function readLanguage(){try{var v=localStorage.getItem(STORAGE_KEY)||DEFAULT_LANGUAGE;return FALLBACK_LANGUAGES.some(function(item){return item.code===v;})?v:DEFAULT_LANGUAGE;}catch(_e){return DEFAULT_LANGUAGE;}}
function readStoredName(){try{var code=localStorage.getItem(STORAGE_KEY)||DEFAULT_LANGUAGE;var match=FALLBACK_LANGUAGES.find(function(item){return item.code===code;});return match?match.name:"العربية";}catch(_e){return"العربية";}}
function readCache(){try{return new Map(Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY)||"{}")));}catch(_e){return new Map();}}
function saveCache(){try{while(translationCache.size>900)translationCache.delete(translationCache.keys().next().value);localStorage.setItem(CACHE_KEY,JSON.stringify(Object.fromEntries(translationCache)));}catch(_e){}}
function isUsefulText(value){return Boolean(value&&value.trim()&&/\p{L}/u.test(value)&&value.trim().length<=5000);}
function skipElement(element){
if(!element||element.nodeType!==1)return false;
return Boolean(element.closest('script,style,noscript,svg,canvas,code,pre,textarea,[contenteditable="true"],.material-icons,.material-icons-round,.material-symbols-outlined,.notranslate,[translate="no"],[data-no-translate],#wh-language-list'));
}
function setStatus(message,isError){
if(modalStatus){modalStatus.textContent=message||"";modalStatus.classList.toggle("is-error",Boolean(isError));}
if(isError&&message){
var notice=document.getElementById("whLanguageNotice");
if(notice){notice.textContent=message;notice.classList.add("is-visible");clearTimeout(notice.timer);notice.timer=setTimeout(function(){notice.classList.remove("is-visible");},6500);}
}
}
function originalForNode(node){
if(textOriginals.has(node)){
var last=textTranslations.get(node);
if(node.nodeValue===last)return null;
textOriginals.set(node,node.nodeValue);textTranslations.delete(node);
}
return node.nodeValue;
}
function collectTextNodes(){
var found=[],root=document.documentElement;if(!root)return found;
var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),node;
while((node=walker.nextNode())){if(skipElement(node.parentElement))continue;var original=originalForNode(node);if(original!==null&&isUsefulText(original))found.push({node:node,original:original});}
return found;
}
function attributeMapFor(element,store){var map=store.get(element);if(!map){map=new Map();store.set(element,map);}return map;}
function collectAttributes(){
var found=[];if(!document.body)return found;
document.body.querySelectorAll("[placeholder],[title],[aria-label]").forEach(function(element){
if(skipElement(element))return;
["placeholder","title","aria-label"].forEach(function(attribute){
if(!element.hasAttribute(attribute))return;
var value=element.getAttribute(attribute)||"",originals=attributeMapFor(element,attributeOriginals),translations=attributeMapFor(element,attributeTranslations);
if(originals.has(attribute)){if(value===translations.get(attribute))return;originals.set(attribute,value);translations.delete(attribute);}else originals.set(attribute,value);
if(isUsefulText(originals.get(attribute)))found.push({element:element,attribute:attribute,original:originals.get(attribute)});
});
});
return found;
}
function cacheKey(text,target){return (target||currentLanguage)+"|"+text;}
async function translateBatch(items,requestGeneration,target){
var texts=items.map(function(item){return item.original;});
var response=await fetch("/api/translate",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({target:target,texts:texts})});
var data=await response.json().catch(function(){return{};});
if(!response.ok||!data.success||!Array.isArray(data.translations))throw new Error(data.message||"تعذر الاتصال بخدمة الترجمة المجانية.");
if(requestGeneration!==generation)return;
items.forEach(function(item,index){
var translated=String(data.translations[index]===undefined?item.original:data.translations[index]);
translationCache.set(cacheKey(item.original,target),translated);
if(item.node&&item.node.isConnected&&item.node.nodeValue===item.original){textOriginals.set(item.node,item.original);textTranslations.set(item.node,translated);item.node.nodeValue=translated;}
else if(item.element&&item.element.isConnected&&item.element.getAttribute(item.attribute)===item.original){attributeMapFor(item.element,attributeOriginals).set(item.attribute,item.original);attributeMapFor(item.element,attributeTranslations).set(item.attribute,translated);item.element.setAttribute(item.attribute,translated);}
});
saveCache();
}
async function applyPendingTranslations(){
if(translating){translationQueued=true;return;}
if(currentLanguage===DEFAULT_LANGUAGE){setStatus("تم عرض الموقع باللغة العربية.",false);return;}
translating=true;
var requestGeneration=generation,target=currentLanguage;
try{
do{
translationQueued=false;
var nodes=collectTextNodes(),attrs=collectAttributes(),all=nodes.concat(attrs),pending=[];
all.forEach(function(item){
var cached=translationCache.get(cacheKey(item.original,target));
if(cached!==undefined){
if(item.node&&item.node.isConnected&&item.node.nodeValue===item.original){textOriginals.set(item.node,item.original);textTranslations.set(item.node,cached);item.node.nodeValue=cached;}
else if(item.element&&item.element.isConnected&&item.element.getAttribute(item.attribute)===item.original){attributeMapFor(item.element,attributeOriginals).set(item.attribute,item.original);attributeMapFor(item.element,attributeTranslations).set(item.attribute,cached);item.element.setAttribute(item.attribute,cached);}
}else pending.push(item);
});
var batches=[],batch=[],chars=0;
pending.forEach(function(item){var length=item.original.length;if(batch.length>=8||chars+length>1800){batches.push(batch);batch=[];chars=0;}batch.push(item);chars+=length;});
if(batch.length)batches.push(batch);
for(var i=0;i<batches.length;i+=2){
if(requestGeneration!==generation)break;
var results=await Promise.allSettled(batches.slice(i,i+2).map(function(items){return translateBatch(items,requestGeneration,target);}));
var failed=results.find(function(result){return result.status==="rejected";});
if(failed)throw failed.reason;
}
}while(translationQueued&&requestGeneration===generation);
if(requestGeneration===generation)setStatus("تم تطبيق اللغة المختارة على واجهة الموقع.",false);
}catch(error){if(requestGeneration===generation){console.warn("WallpaperHub translation error:",error);setStatus(error.message||"تعذر تطبيق الترجمة.",true);}}
finally{translating=false;if(translationQueued){translationQueued=false;applyPendingTranslations();}}
}
function restoreOriginalContent(){
textOriginals.forEach(function(original,node){if(node&&node.isConnected)node.nodeValue=original;});
attributeOriginals.forEach(function(map,element){if(element&&element.isConnected)map.forEach(function(original,attribute){element.setAttribute(attribute,original);});});
textOriginals.clear();textTranslations.clear();attributeOriginals.clear();attributeTranslations.clear();
}
function applyDocumentLanguage(){
document.documentElement.lang=currentLanguage;
document.documentElement.dir=RTL_LANGUAGES.has(currentLanguage)||RTL_LANGUAGES.has(currentLanguage.split("-")[0])?"rtl":"ltr";
document.documentElement.setAttribute("data-wh-language",currentLanguage);
var nameNode=document.getElementById("languageCurrentValue");if(nameNode)nameNode.textContent=languageName;
}
function saveLanguage(code,name){
generation++;currentLanguage=code;languageName=name||code;
try{localStorage.setItem(STORAGE_KEY,code);localStorage.setItem(STORAGE_KEY+":name",languageName);}catch(_e){}
restoreOriginalContent();applyDocumentLanguage();
if(languageListTarget!==currentLanguage){languageList=[];languageListTarget=null;}
if(currentLanguage===DEFAULT_LANGUAGE){setStatus("تمت إعادة اللغة الأصلية للموقع.",false);return;}
setStatus("جاري ترجمة الموقع إلى "+languageName+"...",false);applyPendingTranslations();
}
function ensureModal(){
if(document.getElementById("whLanguageModal"))return;
var overlay=document.createElement("div");overlay.id="whLanguageModal";overlay.className="wh-language-overlay";overlay.hidden=true;
overlay.innerHTML='<section class="wh-language-dialog" role="dialog" aria-modal="true" aria-labelledby="whLanguageTitle">'+
'<header class="wh-language-header"><div><span class="wh-language-kicker">WALLPAPERHUB</span><h2 id="whLanguageTitle">اختر لغة الموقع</h2><p>سيتم تطبيق اختيارك على صفحات الموقع.</p></div><button type="button" class="wh-language-close" id="whLanguageClose" aria-label="إغلاق"><span class="material-icons">close</span></button></header>'+
'<label class="wh-language-search"><span class="material-icons">search</span><input id="whLanguageSearch" type="search" placeholder="ابحث عن لغة أو رمزها" autocomplete="off"></label>'+
'<div class="wh-language-meta"><span id="whLanguageCount">جاري تحميل اللغات...</span><button type="button" id="whLanguageOriginal">اللغة الأصلية: العربية</button></div>'+
'<div class="wh-language-list" id="wh-language-list" data-no-translate></div><p class="wh-language-status" id="whLanguageStatus" role="status" aria-live="polite"></p>'+
'<p class="wh-language-footnote">الترجمة آلية، وتُحفظ نتائجها لاستخدامها لاحقاً دون إعادة ترجمتها.</p></section>';
document.body.appendChild(overlay);
var notice=document.createElement("div");notice.id="whLanguageNotice";notice.className="wh-language-toast";notice.setAttribute("role","status");notice.setAttribute("aria-live","polite");document.body.appendChild(notice);
currentModal=overlay;modalStatus=overlay.querySelector("#whLanguageStatus");languageListNode=overlay.querySelector("#wh-language-list");searchNode=overlay.querySelector("#whLanguageSearch");
overlay.querySelector("#whLanguageClose").addEventListener("click",closePicker);
overlay.querySelector("#whLanguageOriginal").addEventListener("click",function(){saveLanguage(DEFAULT_LANGUAGE,"العربية");closePicker();});
overlay.addEventListener("click",function(event){if(event.target===overlay)closePicker();});
searchNode.addEventListener("input",renderLanguageList);
document.addEventListener("keydown",function(event){if(event.key==="Escape"&&currentModal&&!currentModal.hidden)closePicker();});
}
function closePicker(){if(currentModal)currentModal.hidden=true;var trigger=document.getElementById("languageSettingButton");if(trigger)trigger.focus();}
function renderLanguageList(){
if(!languageListNode)return;
var query=(searchNode.value||"").trim().toLocaleLowerCase();
var filtered=languageList.filter(function(item){return item.name.toLocaleLowerCase().includes(query)||item.code.toLowerCase().includes(query);});
languageListNode.replaceChildren();
filtered.forEach(function(item){
var button=document.createElement("button");button.type="button";button.className="wh-language-option"+(item.code===currentLanguage?" is-selected":"");
var name=document.createElement("span");name.className="wh-language-option-name";name.textContent=item.name;
var code=document.createElement("small");code.textContent=item.code;
var mark=document.createElement("span");mark.className="wh-language-option-check";mark.textContent=item.code===currentLanguage?"✓":"";
button.append(name,code,mark);button.addEventListener("click",function(){saveLanguage(item.code,item.name);closePicker();});languageListNode.appendChild(button);
});
var count=document.getElementById("whLanguageCount");if(count)count.textContent=filtered.length+" لغة متاحة";
if(!filtered.length){var empty=document.createElement("p");empty.className="wh-language-empty";empty.textContent="لم يتم العثور على لغة بهذا الاسم.";languageListNode.appendChild(empty);}
}
async function loadLanguageList(){
if(languageList.length&&languageListTarget===currentLanguage)return;
setStatus("جاري تحميل قائمة اللغات...",false);
languageList=FALLBACK_LANGUAGES.slice();
languageListTarget=currentLanguage;
languageList.sort(function(a,b){return new Intl.Collator(currentLanguage).compare(a.name,b.name);});
renderLanguageList();
}
function openPicker(){ensureModal();currentModal.hidden=false;searchNode.value="";renderLanguageList();searchNode.focus();loadLanguageList();}
function init(){
ensureModal();applyDocumentLanguage();
document.querySelectorAll("[data-wh-language-open]").forEach(function(node){
node.addEventListener("click",openPicker);
node.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();openPicker();}});
});
if(currentLanguage!==DEFAULT_LANGUAGE)setTimeout(applyPendingTranslations,0);
if(window.MutationObserver&&document.body){
var observer=new MutationObserver(function(records){
var hasNew=false;
records.forEach(function(record){
if(record.type==="childList"&&record.addedNodes.length)hasNew=true;
if(record.type==="characterData"&&!textOriginals.has(record.target))hasNew=true;
if(record.type==="attributes"){
var map=attributeTranslations.get(record.target);
if(!map||map.get(record.attributeName)!==record.target.getAttribute(record.attributeName))hasNew=true;
}
});
if(hasNew&&currentLanguage!==DEFAULT_LANGUAGE)applyPendingTranslations();
});
observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});
}
}
window.WallpaperHubLanguage={open:openPicker,getLanguage:function(){return currentLanguage;},setLanguage:saveLanguage};
window.openLanguagePicker=openPicker;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();