const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-KEPh1bJr.js","assets/index-DhE_q3AR.js","assets/buffer-Cq5fL-tY.js","assets/index-BHNR0Rya.css","assets/web-BBNafJl7.js"])))=>i.map(i=>d[i]);
import{_ as K}from"./index-DhE_q3AR.js";var _={};/*! Capacitor: https://capacitorjs.com/ - MIT License */const oe=t=>{const e=new Map;e.set("web",{name:"web"});const r=t.CapacitorPlatforms||{currentPlatform:{name:"web"},platforms:e},o=(n,a)=>{r.platforms.set(n,a)},i=n=>{r.platforms.has(n)&&(r.currentPlatform=r.platforms.get(n))};return r.addPlatform=o,r.setPlatform=i,r},ie=t=>t.CapacitorPlatforms=oe(t),V=ie(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof _<"u"?_:{});V.addPlatform;V.setPlatform;var E;(function(t){t.Unimplemented="UNIMPLEMENTED",t.Unavailable="UNAVAILABLE"})(E||(E={}));class S extends Error{constructor(e,r,o){super(e),this.message=e,this.code=r,this.data=o}}const ae=t=>{var e,r;return t!=null&&t.androidBridge?"android":!((r=(e=t==null?void 0:t.webkit)===null||e===void 0?void 0:e.messageHandlers)===null||r===void 0)&&r.bridge?"ios":"web"},le=t=>{var e,r,o,i,n;const a=t.CapacitorCustomPlatform||null,s=t.Capacitor||{},f=s.Plugins=s.Plugins||{},l=t.CapacitorPlatforms,k=()=>a!==null?a.name:ae(t),P=((e=l==null?void 0:l.currentPlatform)===null||e===void 0?void 0:e.getPlatform)||k,j=()=>P()!=="web",J=((r=l==null?void 0:l.currentPlatform)===null||r===void 0?void 0:r.isNativePlatform)||j,Q=c=>{const d=x.get(c);return!!(d!=null&&d.platforms.has(P())||I(c))},X=((o=l==null?void 0:l.currentPlatform)===null||o===void 0?void 0:o.isPluginAvailable)||Q,Y=c=>{var d;return(d=s.PluginHeaders)===null||d===void 0?void 0:d.find(y=>y.name===c)},I=((i=l==null?void 0:l.currentPlatform)===null||i===void 0?void 0:i.getPluginHeader)||Y,Z=c=>t.console.error(c),N=(c,d,y)=>Promise.reject(`${y} does not have an implementation of "${d}".`),x=new Map,ee=(c,d={})=>{const y=x.get(c);if(y)return console.warn(`Capacitor plugin "${c}" already registered. Cannot register plugins twice.`),y.proxy;const w=P(),L=I(c);let v;const re=async()=>(!v&&w in d?v=typeof d[w]=="function"?v=await d[w]():v=d[w]:a!==null&&!v&&"web"in d&&(v=typeof d.web=="function"?v=await d.web():v=d.web),v),ne=(u,m)=>{var h,p;if(L){const b=L==null?void 0:L.methods.find(g=>m===g.name);if(b)return b.rtype==="promise"?g=>s.nativePromise(c,m.toString(),g):(g,A)=>s.nativeCallback(c,m.toString(),g,A);if(u)return(h=u[m])===null||h===void 0?void 0:h.bind(u)}else{if(u)return(p=u[m])===null||p===void 0?void 0:p.bind(u);throw new S(`"${c}" plugin is not implemented on ${w}`,E.Unimplemented)}},U=u=>{let m;const h=(...p)=>{const b=re().then(g=>{const A=ne(g,u);if(A){const O=A(...p);return m=O==null?void 0:O.remove,O}else throw new S(`"${c}.${u}()" is not implemented on ${w}`,E.Unimplemented)});return u==="addListener"&&(b.remove=async()=>m()),b};return h.toString=()=>`${u.toString()}() { [capacitor code] }`,Object.defineProperty(h,"name",{value:u,writable:!1,configurable:!1}),h},H=U("addListener"),W=U("removeListener"),se=(u,m)=>{const h=H({eventName:u},m),p=async()=>{const g=await h;W({eventName:u,callbackId:g},m)},b=new Promise(g=>h.then(()=>g({remove:p})));return b.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await p()},b},D=new Proxy({},{get(u,m){switch(m){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return L?se:H;case"removeListener":return W;default:return U(m)}}});return f[c]=D,x.set(c,{name:c,proxy:D,platforms:new Set([...Object.keys(d),...L?[w]:[]])}),D},te=((n=l==null?void 0:l.currentPlatform)===null||n===void 0?void 0:n.registerPlugin)||ee;return s.convertFileSrc||(s.convertFileSrc=c=>c),s.getPlatform=P,s.handleError=Z,s.isNativePlatform=J,s.isPluginAvailable=X,s.pluginMethodNoop=N,s.registerPlugin=te,s.Exception=S,s.DEBUG=!!s.DEBUG,s.isLoggingEnabled=!!s.isLoggingEnabled,s.platform=s.getPlatform(),s.isNative=s.isNativePlatform(),s},ce=t=>t.Capacitor=le(t),$=ce(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof _<"u"?_:{}),C=$.registerPlugin;$.Plugins;class z{constructor(e){this.listeners={},this.retainedEventArguments={},this.windowListeners={},e&&(console.warn(`Capacitor WebPlugin "${e.name}" config object was deprecated in v3 and will be removed in v4.`),this.config=e)}addListener(e,r){let o=!1;this.listeners[e]||(this.listeners[e]=[],o=!0),this.listeners[e].push(r);const n=this.windowListeners[e];n&&!n.registered&&this.addWindowListener(n),o&&this.sendRetainedArgumentsForEvent(e);const a=async()=>this.removeListener(e,r);return Promise.resolve({remove:a})}async removeAllListeners(){this.listeners={};for(const e in this.windowListeners)this.removeWindowListener(this.windowListeners[e]);this.windowListeners={}}notifyListeners(e,r,o){const i=this.listeners[e];if(!i){if(o){let n=this.retainedEventArguments[e];n||(n=[]),n.push(r),this.retainedEventArguments[e]=n}return}i.forEach(n=>n(r))}hasListeners(e){return!!this.listeners[e].length}registerWindowListener(e,r){this.windowListeners[r]={registered:!1,windowEventName:e,pluginEventName:r,handler:o=>{this.notifyListeners(r,o)}}}unimplemented(e="not implemented"){return new $.Exception(e,E.Unimplemented)}unavailable(e="not available"){return new $.Exception(e,E.Unavailable)}async removeListener(e,r){const o=this.listeners[e];if(!o)return;const i=o.indexOf(r);this.listeners[e].splice(i,1),this.listeners[e].length||this.removeWindowListener(this.windowListeners[e])}addWindowListener(e){window.addEventListener(e.windowEventName,e.handler),e.registered=!0}removeWindowListener(e){e&&(window.removeEventListener(e.windowEventName,e.handler),e.registered=!1)}sendRetainedArgumentsForEvent(e){const r=this.retainedEventArguments[e];r&&(delete this.retainedEventArguments[e],r.forEach(o=>{this.notifyListeners(e,o)}))}}const R=t=>encodeURIComponent(t).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape),F=t=>t.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent);class de extends z{async getCookies(){const e=document.cookie,r={};return e.split(";").forEach(o=>{if(o.length<=0)return;let[i,n]=o.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");i=F(i).trim(),n=F(n).trim(),r[i]=n}),r}async setCookie(e){try{const r=R(e.key),o=R(e.value),i=`; expires=${(e.expires||"").replace("expires=","")}`,n=(e.path||"/").replace("path=",""),a=e.url!=null&&e.url.length>0?`domain=${e.url}`:"";document.cookie=`${r}=${o||""}${i}; path=${n}; ${a};`}catch(r){return Promise.reject(r)}}async deleteCookie(e){try{document.cookie=`${e.key}=; Max-Age=0`}catch(r){return Promise.reject(r)}}async clearCookies(){try{const e=document.cookie.split(";")||[];for(const r of e)document.cookie=r.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(e){return Promise.reject(e)}}async clearAllCookies(){try{await this.clearCookies()}catch(e){return Promise.reject(e)}}}C("CapacitorCookies",{web:()=>new de});const ue=async t=>new Promise((e,r)=>{const o=new FileReader;o.onload=()=>{const i=o.result;e(i.indexOf(",")>=0?i.split(",")[1]:i)},o.onerror=i=>r(i),o.readAsDataURL(t)}),fe=(t={})=>{const e=Object.keys(t);return Object.keys(t).map(i=>i.toLocaleLowerCase()).reduce((i,n,a)=>(i[n]=t[e[a]],i),{})},me=(t,e=!0)=>t?Object.entries(t).reduce((o,i)=>{const[n,a]=i;let s,f;return Array.isArray(a)?(f="",a.forEach(l=>{s=e?encodeURIComponent(l):l,f+=`${n}=${s}&`}),f.slice(0,-1)):(s=e?encodeURIComponent(a):a,f=`${n}=${s}`),`${o}&${f}`},"").substr(1):null,ge=(t,e={})=>{const r=Object.assign({method:t.method||"GET",headers:t.headers},e),i=fe(t.headers)["content-type"]||"";if(typeof t.data=="string")r.body=t.data;else if(i.includes("application/x-www-form-urlencoded")){const n=new URLSearchParams;for(const[a,s]of Object.entries(t.data||{}))n.set(a,s);r.body=n.toString()}else if(i.includes("multipart/form-data")||t.data instanceof FormData){const n=new FormData;if(t.data instanceof FormData)t.data.forEach((s,f)=>{n.append(f,s)});else for(const s of Object.keys(t.data))n.append(s,t.data[s]);r.body=n;const a=new Headers(r.headers);a.delete("content-type"),r.headers=a}else(i.includes("application/json")||typeof t.data=="object")&&(r.body=JSON.stringify(t.data));return r};class he extends z{async request(e){const r=ge(e,e.webFetchExtra),o=me(e.params,e.shouldEncodeUrlParams),i=o?`${e.url}?${o}`:e.url,n=await fetch(i,r),a=n.headers.get("content-type")||"";let{responseType:s="text"}=n.ok?e:{};a.includes("application/json")&&(s="json");let f,l;switch(s){case"arraybuffer":case"blob":l=await n.blob(),f=await ue(l);break;case"json":f=await n.json();break;case"document":case"text":default:f=await n.text()}const k={};return n.headers.forEach((P,j)=>{k[j]=P}),{data:f,headers:k,status:n.status,url:n.url}}async get(e){return this.request(Object.assign(Object.assign({},e),{method:"GET"}))}async post(e){return this.request(Object.assign(Object.assign({},e),{method:"POST"}))}async put(e){return this.request(Object.assign(Object.assign({},e),{method:"PUT"}))}async patch(e){return this.request(Object.assign(Object.assign({},e),{method:"PATCH"}))}async delete(e){return this.request(Object.assign(Object.assign({},e),{method:"DELETE"}))}}C("CapacitorHttp",{web:()=>new he});const ve=C("App",{web:()=>K(()=>import("./web-KEPh1bJr.js"),__vite__mapDeps([0,1,2,3])).then(t=>new t.AppWeb)});var T;(function(t){t.Dark="DARK",t.Light="LIGHT",t.Default="DEFAULT"})(T||(T={}));var M;(function(t){t.None="NONE",t.Slide="SLIDE",t.Fade="FADE"})(M||(M={}));const pe=C("StatusBar");var B;(function(t){t.Dark="DARK",t.Light="LIGHT",t.Default="DEFAULT"})(B||(B={}));var G;(function(t){t.Body="body",t.Ionic="ionic",t.Native="native",t.None="none"})(G||(G={}));const q=C("Keyboard"),be=C("Preferences",{web:()=>K(()=>import("./web-BBNafJl7.js"),__vite__mapDeps([4,1,2,3])).then(t=>new t.PreferencesWeb)}),we=async()=>{try{await pe.setStyle({style:T.Dark}),q.addListener("keyboardWillShow",()=>{document.body.classList.add("keyboard-visible")}),q.addListener("keyboardWillHide",()=>{document.body.classList.remove("keyboard-visible")}),ve.addListener("appStateChange",async({isActive:t})=>{t||await be.set({key:"lastActiveTime",value:new Date().toISOString()})})}catch(t){console.error("Error initializing mobile app:",t)}},ye=Object.freeze(Object.defineProperty({__proto__:null,initializeMobileApp:we},Symbol.toStringTag,{value:"Module"}));export{z as W,ye as m};
