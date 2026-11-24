// Minimal tree semantics for source-level DOM regression tests (no browser required).
function treeMethods(El){
  const p=El.prototype;
  p.insertBefore=function(node,ref){
    if(node===ref)return node;
    if(node.parentNode)node.remove();
    const i=ref==null?this.children.length:this.children.indexOf(ref);
    if(i<0)throw Error('reference is not a child');
    this.children.splice(i,0,node);node.parentNode=this;node.isConnected=this.isConnected!==false;return node;
  };
  p.appendChild=function(node){return this.insertBefore(node,null);};
  p.remove=function(){
    if(this.parentNode){const a=this.parentNode.children,i=a.indexOf(this);if(i>=0)a.splice(i,1);}
    this.parentNode=null;this.isConnected=false;
  };
  p.replaceChildren=function(...nodes){for(const n of [...this.children])n.remove();for(const n of nodes)this.appendChild(n);};
  if(!p.querySelectorAll)p.querySelectorAll=function(cls){return this.children.filter(x=>x.className?.split(' ').includes(cls.slice(1)));};
  if(!p.querySelector)p.querySelector=function(cls){return this.querySelectorAll(cls)[0]||null;};
}
function mockRow(El,genre,matching,fullPool){
  return {genre,matching,randomPool:fullPool,base:matching,ordered:matching,mode:'random',
    section:new El('section'),scroll:new El('div'),shuffle:{},reset:{},generation:0,needsLoad:true,renderedCards:new Map()};
}
module.exports={treeMethods,mockRow};
