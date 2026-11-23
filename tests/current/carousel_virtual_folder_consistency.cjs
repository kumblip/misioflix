const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const text=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const start=text.indexOf('const classified=libraries.filter(x=>{');
const end=text.indexOf('const anime=classified.filter(',start);
assert(start>0 && end>start,'carousel classification expression missing');
const section=text.slice(start,end);
const classify=new Function('libraries','mapping','normalizedId',section+'return classified;');
const norm=x=>String(x||'').replace(/-/g,'').toLowerCase();
const libraries=[
  {ItemId:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',Name:'Anime PL',Locations:['/media/raid/anime_lektor']},
  {ItemId:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',Name:'Anime ENG',CollectionType:null,Locations:['/media/raid/anime']},
  {ItemId:'cccccccccccccccccccccccccccccccc',Name:'Filmy PL',CollectionType:'movies',Locations:['/media/raid/filmy_lektor']},
  {ItemId:'dddddddddddddddddddddddddddddddd',Name:'Music',CollectionType:'music',Locations:['/media/raid/muzyka']}
];
const mapping=new Map([
  ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',{Role:'anime_pl',Paths:['/media/raid/anime_lektor']}],
  ['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',{Role:'anime_eng',Paths:['/media/raid/anime']}]
]);
const result=classify(libraries,mapping,norm);
assert.deepEqual(result.map(x=>x.name),['Anime PL','Anime ENG','Filmy PL']);
assert.equal(result[0].paths[0],'/media/raid/anime_lektor');
assert.equal(result[1].role,'anime_eng');
process.stdout.write('Carousel library detection: OK\n');
