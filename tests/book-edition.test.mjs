import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditionStorage, BOOK_EDITION, FULL_PAGE_COUNT } from '../src/bookEdition.js';
const memory = () => {
 const values = new Map();
 return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),key:i=>[...values.keys()][i]??null,get length(){return values.size}};
};
test('2027 storage leaves both legacy bindings and another edition untouched', () => {
 const native=memory(); const old=createEditionStorage(()=>native); const newer=createEditionStorage(()=>native,'book2027:');
 old.setItem('bindCode','OLD2026');old.setItem('client_id','OLDDEVICE');old.setItem('bookVersion','full');
 newer.setItem('follow_bindCode','NEW2027');newer.setItem('follow_client_id','NEWDEVICE');newer.setItem('bookVersion','mini');
 assert.equal(old.getItem('bindCode'),'OLD2026');assert.equal(newer.getItem('bindCode'),null);
 assert.equal(old.getItem('bookVersion'),'full');assert.equal(newer.getItem('bookVersion'),'mini');
 newer.clear();assert.equal(newer.length,0);assert.equal(old.getItem('bindCode'),'OLD2026');assert.equal(old.getItem('client_id'),'OLDDEVICE');
});
test('2027 removal and key enumeration stay in their namespace', () => {
 const native=memory();native.setItem('bindCode','OLD');const newer=createEditionStorage(()=>native,'book2027:');
 newer.setItem('bindCode','NEW');assert.equal(newer.length,1);assert.equal(newer.key(0),'bindCode');
 newer.removeItem('bindCode');assert.equal(native.getItem('bindCode'),'OLD');assert.equal(newer.key(0),null);
});
test('ordinary builds retain the legacy edition defaults',()=>{assert.equal(BOOK_EDITION,2026);assert.equal(FULL_PAGE_COUNT,456)});
