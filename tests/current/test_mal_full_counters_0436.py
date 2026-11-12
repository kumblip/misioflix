"""Regression: per-title MAL counters are read in full, not fabricated from a list snapshot."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src/Jellyfin.Plugin.MisioFlix'
SERVICE = (SRC/'Services/MisioFlixMalService.cs').read_text(encoding='utf-8')
CTRL = (SRC/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')
JS = (SRC/'Web/mal.js').read_text(encoding='utf-8')

class FullCounters0436(unittest.TestCase):
    def test_version_and_project_are_consistent(self):
        v = json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version']
        self.assertGreaterEqual(tuple(map(int,v.split('.'))),(0,4,36,0))
        p=(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertIn(f'<AssemblyVersion>{v}</AssemblyVersion>',p)

    def test_per_title_uses_authenticated_mal_detail_not_entire_list(self):
        body=CTRL.split('MalItem(',1)[1].split('[HttpGet("api/mal/connect")]',1)[0]
        self.assertIn('AuthorizedMalIdAsync',body)
        self.assertIn('GetAuthenticatedUserIdAsync',body)
        self.assertIn('ReadItemAsync(user, malId, refresh, cancel)',body)
        self.assertNotIn('ReadAllAsync(user, refresh, cancel)',body)
        detail=SERVICE.split('ReadItemAsync(',1)[1].split('public async Task<MalEntry> UpdateAsync',1)[0]
        self.assertIn('anime/{malId}?fields=my_list_status',detail)
        self.assertIn('JsonValueKind.Object',detail)
        self.assertIn('ListLock(user)',detail)
        self.assertIn('AddHours(1)',detail)
        self.assertIn('ItemCacheKey(user, malId)',detail)

    def test_count_fields_remain_nullable_when_mal_omits_them(self):
        self.assertIn('int? episodes_watched, int? times_rewatched',SERVICE)
        body=SERVICE.split('private static MalEntry ReadEntry(',1)[1]
        self.assertIn('OptionalCount(e, "num_episodes_watched")',body)
        self.assertIn('OptionalCount(e, "num_times_rewatched")',body)
        self.assertNotIn('Int(e, "num_times_rewatched")',body)

    def test_written_fields_are_explicit_and_caches_invalidated(self):
        body=SERVICE.split('public async Task<MalEntry> UpdateAsync(',1)[1].split('private static MalEntry ReadEntry',1)[0]
        self.assertIn('if (value.EpisodesWatched.HasValue)',body)
        self.assertIn('fields["num_watched_episodes"]',body)
        self.assertIn('if (value.TimesRewatched.HasValue)',body)
        self.assertIn('fields["num_times_rewatched"]',body)
        self.assertIn('ItemCache.TryRemove(ItemCacheKey(user, malId)',body)
        self.assertIn('ReadItemAsync(user, malId, refresh: true',body)
        self.assertIn('ClearItemCache(pending.UserId)',SERVICE)
        self.assertIn('ClearItemCache(user)',SERVICE)

    def test_actual_csharp_dto_keys_and_native_mal_shapes(self):
        start=JS.index('  function value(')
        end=JS.index('  let currentUser=',start)
        src=JS[start:end]
        check=r'''
const assert=require('node:assert/strict');
function counters(v){const x=entryFields(v);return [x.status,x.score,x.episodesWatched,x.timesRewatched]}
assert.deepEqual(counters({mal_id:1195,status:'completed',score:10,episodes_watched:13,times_rewatched:5}),['completed',10,13,5]);
assert.deepEqual(counters({entry:{mal_id:1195,status:'completed',score:10,episodes_watched:13,times_rewatched:5}}),['completed',10,13,5]);
assert.deepEqual(counters({my_list_status:{status:'completed',score:8,num_episodes_watched:12,num_times_rewatched:3}}),['completed',8,12,3]);
assert.deepEqual(counters({status:'completed',score:10,episodes_watched:null,times_rewatched:null}),['completed',10,null,null]);
assert.deepEqual(counters({status:'completed',score:10,episodes_watched:0,times_rewatched:0}),['completed',10,0,0]);
assert.deepEqual(counters({status:'completed',score:10}),['completed',10,null,null]);
'''
        subprocess.run(['node','-e',src+check],check=True,text=True,capture_output=True)

    def test_old_local_cache_not_reused(self):
        self.assertIn('misioflix-mal-v2:',JS)
        self.assertIn('misioflix-mal-index-v2:',JS)
        self.assertIn('cacheTime=60*60*1000',JS)
        self.assertIn("!edited||element.value.trim()===''?null:Number(element.value)",JS)

if __name__=='__main__': unittest.main()
