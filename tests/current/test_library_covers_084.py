"""Doładowane karty must use original MisioFlix styling without moving native React DOM."""
from version_contract import CURRENT_RELEASE
from pathlib import Path
import json
import unittest
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'

class LibraryCovers084(unittest.TestCase):
    def test_new_images_but_same_existing_cards(self):
        src=(WEB/'library-scroll.js').read_text()
        self.assertIn("container.insertAdjacentElement('afterend',pane)",src)
        self.assertIn("image.className='mf-library-cover-img'",src)
        self.assertIn("surface.replaceChildren()",src)
        self.assertIn("imageCandidates(item)",src)
        self.assertIn("node.setAttribute('data-mf-card','1')",src)
        self.assertIn("s.animeLibrary",src)
        self.assertIn("node.querySelectorAll('a[href]')",src)
        self.assertNotIn("container.appendChild(batch)",src)
    def test_metadata_data_path(self):
        src=(WEB/'client.js').read_text()
        self.assertIn("window.addEventListener('misioflix-library-cards-added'",src)
        self.assertIn("const added=card.matches?",src)
        self.assertIn("queueMetadata(card);",src)
        self.assertIn("card.hasAttribute('data-mf-library-infinite-card')",src)
        self.assertIn('mixedActiveList?.contains(card)',src)
    def test_version(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],CURRENT_RELEASE)
        self.assertIn(f'<AssemblyVersion>{CURRENT_RELEASE}</AssemblyVersion>',(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())

if __name__=='__main__':unittest.main()
