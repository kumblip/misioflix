"""Regression checks: MAL counters missing != 0; never zero-out missing user data."""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JS = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/mal.js').read_text(encoding='utf-8')

class MalCounters0434(unittest.TestCase):
    def test_source_of_truth_and_version(self):
        ver = json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version']
        self.assertGreaterEqual(tuple(map(int,ver.split('.'))), (0,4,34,0))
        self.assertIn(f'<AssemblyVersion>{ver}</AssemblyVersion>',(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())

    def test_counter_parsing_missing_vs_zero_and_mal_native(self):
        start = JS.index('  function value(')
        end = JS.index('  let currentUser=',start)
        src=JS[start:end]
        code = src+'''\nconst assert=require('node:assert/strict');
assert.deepEqual((()=>{let x=entryFields({status:'completed',score:10,num_episodes_watched:13,num_times_rewatched:5});return [x.episodesWatched,x.timesRewatched,x.score]})(),[13,5,10]);
assert.deepEqual((()=>{let x=entryFields({my_list_status:{status:'completed',num_episodes_watched:13,num_times_rewatched:5}});return [x.episodesWatched,x.timesRewatched]})(),[13,5]);
assert.deepEqual((()=>{let x=entryFields({Status:'completed',NumWatchedEpisodes:12,NumTimesRewatched:4});return [x.episodesWatched,x.timesRewatched]})(),[12,4]);
assert.deepEqual((()=>{let x=entryFields({status:'completed',score:10});return [x.episodesWatched,x.timesRewatched]})(),[null,null]);
assert.deepEqual((()=>{let x=entryFields({status:'completed',num_episodes_watched:0,num_times_rewatched:0});return [x.episodesWatched,x.timesRewatched]})(),[0,0]);
'''
        subprocess.run(['node','-e',code],check=True,capture_output=True,text=True)

    def test_no_write_of_missing_counters(self):
        self.assertIn("!edited||element.value.trim()===''?null:Number(element.value)", JS)
        self.assertIn('episodesEdited=false,rewatchesEdited=false',JS)
        self.assertIn("episodes.addEventListener('input'",JS)
        self.assertIn("episodesWatched:fields[1],timesRewatched:fields[2]",JS)
        self.assertIn("data?.timesRewatched===null",JS)
        self.assertIn("watchCount===null?'Brak danych'",JS)
        self.assertIn("data?.episodesWatched===null",JS)
        self.assertIn('Puste pole = nie zmieniaj licznika MAL',JS)

    def test_no_background_full_list_refresh(self):
        home=JS.split('function mountHomeButton()',1)[1].split('function closeDialog()',1)[0]
        self.assertNotIn("request('/status",home)
        self.assertNotIn("request('/item",home)

if __name__=='__main__': unittest.main()
