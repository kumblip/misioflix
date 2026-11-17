import json
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PAGE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text(encoding='utf-8')

class CollectionPrimaryPoster099(unittest.TestCase):
    def test_version_uses_active_metadata(self):
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        self.assertEqual(meta['version'],'0.4.99.0')
        self.assertIn('<Version>0.4.99</Version>',(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8'))
    def test_no_automatic_upload_and_user_confirmation(self):
        self.assertIn('button.addEventListener(\'click\',()=>{void run();});',PAGE)
        self.assertIn('window.confirm(',PAGE)
        self.assertIn('No automatic write or background operation',PAGE)
    def test_native_upload_requires_no_existing_primary(self):
        self.assertIn("await request('Items/'+id+'/Images/Primary',{method:'POST'",PAGE)
        self.assertIn("await hasNativePoster(id)",PAGE)
        self.assertIn("blob.type.startsWith('image/')",PAGE)
        self.assertIn("Content-Type':'image/jpeg'",PAGE)
        self.assertIn("canvas.toDataURL('image/jpeg'",PAGE)
    def test_safe_scoping(self):
        self.assertIn("if(actual?.Type!=='BoxSet')",PAGE)
        self.assertIn("image?.ImageType||image?.Type",PAGE)
        self.assertNotIn('DELETE',PAGE.split('const permanentCollectionPosters=',1)[1].split('view.addEventListener(\'pageshow\'',1)[0])
    def test_original_collection_and_media_logic_unchanged(self):
        home=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
        self.assertIn('queueHomeCollectionPreview',home)
        service=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNfoCollectionsService.cs').read_text(encoding='utf-8')
        self.assertIn('SynchronizeAsync',service)
