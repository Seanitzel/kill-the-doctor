// Search-local indexed heap. Decreased scores move an existing node; duplicate
// frontier records cannot accumulate. Equal priorities keep insertion order.
export class PriorityQueue{
 constructor(score){this.score=score;this.items=[];this.indices=new Map();this.order=new Map();this.serial=0;}
 get size(){return this.items.length;}
 before(a,b){const delta=this.score(a)-this.score(b);return delta<0||delta===0&&this.order.get(a)<this.order.get(b);}
 swap(a,b){const items=this.items,t=items[a];items[a]=items[b];items[b]=t;this.indices.set(items[a],a);this.indices.set(items[b],b);}
 push(value){if(this.indices.has(value)){this.update(value);return;}this.order.set(value,this.serial++);this.indices.set(value,this.items.length);this.items.push(value);this.up(this.items.length-1);}
 up(index){while(index){const parent=(index-1)>>1;if(!this.before(this.items[index],this.items[parent]))break;this.swap(index,parent);index=parent;}}
 update(value){const index=this.indices.get(value);if(index!==undefined)this.up(index);}
 pop(){if(!this.items.length)return;const result=this.items[0],last=this.items.pop();this.indices.delete(result);this.order.delete(result);if(this.items.length){this.items[0]=last;this.indices.set(last,0);let index=0;while(true){const left=index*2+1,right=left+1;if(left>=this.items.length)break;const child=right<this.items.length&&this.before(this.items[right],this.items[left])?right:left;if(!this.before(this.items[child],this.items[index]))break;this.swap(index,child);index=child;}}return result;}
}
