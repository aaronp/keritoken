import{d as _,$ as u,y as f,f as i,o as r,g as e,t as a,F as h,Z as g,i as v,e as x,a0 as b}from"../modules/vue-DKCSL9rB.js";import{u as N,j as y,c as m,b as k}from"../index-DELz8oTp.js";import{N as S}from"./NoteDisplay-BEAyUOgZ.js";import"../modules/shiki-D7n-PgBe.js";const w=_({__name:"print",setup(p,{expose:n}){n();const{slides:l,total:o}=N();u(`
@page {
  size: A4;
  margin-top: 1.5cm;
  margin-bottom: 1cm;
}
* {
  -webkit-print-color-adjust: exact;
}
html,
html body,
html #app,
html #page-root {
  height: auto;
  overflow: auto !important;
}
`),y({title:`Notes - ${m.title}`});const d=f(()=>l.value.map(t=>{var s;return(s=t.meta)==null?void 0:s.slide}).filter(t=>t!==void 0&&t.noteHTML!=="")),c={slides:l,total:o,slidesWithNote:d,get configs(){return m},NoteDisplay:S};return Object.defineProperty(c,"__isScriptSetup",{enumerable:!1,value:!0}),c}}),D={id:"page-root"},L={class:"m-4"},T={class:"mb-10"},V={class:"text-4xl font-bold mt-2"},j={class:"opacity-50"},B={class:"text-lg"},H={class:"font-bold flex gap-2"},W={class:"opacity-50"},C={key:0,class:"border-main mb-8"};function F(p,n,l,o,d,c){return r(),i("div",D,[e("div",L,[e("div",T,[e("h1",V,a(o.configs.title),1),e("div",j,a(new Date().toLocaleString()),1)]),(r(!0),i(h,null,g(o.slidesWithNote,(t,s)=>(r(),i("div",{key:s,class:"flex flex-col gap-4 break-inside-avoid-page"},[e("div",null,[e("h2",B,[e("div",H,[e("div",W,a(t==null?void 0:t.no)+"/"+a(o.total),1),b(" "+a(t==null?void 0:t.title)+" ",1),n[0]||(n[0]=e("div",{class:"flex-auto"},null,-1))])]),x(o.NoteDisplay,{"note-html":t.noteHTML,class:"max-w-full"},null,8,["note-html"])]),s<o.slidesWithNote.length-1?(r(),i("hr",C)):v("v-if",!0)]))),128))])])}const O=k(w,[["render",F],["__file","/Users/aaron/dev/sandbox/auctions/docs/node_modules/@slidev/client/pages/presenter/print.vue"]]);export{O as default};
