"""Regressions for v0.4.96 bidirectional NFO reconciliation (static source checks)."""
from pathlib import Path
import json, re, unittest

ROOT=Path(__file__).resolve().parents[2]
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNfoCollectionsService.cs').read_text('utf8')
CONFIG=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text('utf8')

class NfoCollections096(unittest.TestCase):
    def test_version(self):
        version=json.loads((ROOT/'meta.json').read_text())['version']
        proj=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertIn('<AssemblyVersion>'+version+'</AssemblyVersion>',proj)
        self.assertEqual(version,'0.4.96.0')
    def test_delete_removed_tag_but_only_prior_managed_membership(self):
        self.assertIn('ledger.ManagedMembers.ToArray()',SERVICE)
        self.assertIn('!current.Contains(id)',SERVICE)
        self.assertIn('_collections.RemoveFromCollectionAsync(boxId, actual)',SERVICE)
        self.assertIn('prior.Value.RemoveAll',SERVICE)
        self.assertIn('await SaveLedgerAsync(ledger, cancellationToken)',SERVICE)
    def test_empty_collection_deletion_requires_proven_ownership_and_zero_children(self):
        self.assertIn('foreach (var boxIdText in ledger.CreatedBoxSetIds.ToArray())',SERVICE)
        self.assertIn('box.LinkedChildren.Length != 0 || box.GetLinkedChildren().Count != 0',SERVICE)
        self.assertIn('IsChildOf(folder.Path, box.Path)',SERVICE)
        self.assertIn('new DeleteOptions { DeleteFileLocation = true, DeleteFromExternalProvider = false }',SERVICE)
        self.assertIn('ledger.CreatedBoxSetIds.Remove',SERVICE)
        self.assertNotIn('Directory.Delete(',SERVICE)
    def test_never_prune_when_scan_is_unsafe(self):
        self.assertIn('if (items.Count >= MaxMediaItems)',SERVICE)
        self.assertIn('canRemove = false;',SERVICE)
        self.assertIn('if (canRemove)',SERVICE)
        self.assertIn('!existingBox.LinkedChildrenLoaded',SERVICE)
        self.assertIn('if (!box.LinkedChildrenLoaded) continue;', SERVICE)
        self.assertIn('File.Exists(preferred)',SERVICE)
        self.assertIn('DtdProcessing = DtdProcessing.Prohibit',SERVICE)
        self.assertIn('throw new InvalidDataException("Too many <set> tags")',SERVICE)
    def test_persistent_cached_state_and_atomic_file(self):
        self.assertIn('"nfo-collections-state.json"',SERVICE)
        self.assertIn('ModifiedTicks',SERVICE)
        self.assertIn('LastFullParseUtc', SERVICE)
        self.assertIn('TimeSpan.FromHours(24)', SERVICE)
        self.assertIn('File.Move(tmp, _statePath, true)',SERVICE)
        self.assertIn('throw new InvalidDataException("Pamięć kolekcji NFO jest uszkodzona;',SERVICE)
    def test_multiple_sorttitles_are_mapped_positionally(self):
        self.assertIn('sets.Length == sorts.Length',SERVICE)
        self.assertIn('sortBySet[sets[i]!] = sorts[i]',SERVICE)
        self.assertIn('OrderBy(pair =>',SERVICE)
        self.assertIn('box.DisplayOrder = "Default";',SERVICE)
        self.assertIn('box.LinkedChildren = arranged;',SERVICE)
        self.assertIn('UpdateToRepositoryAsync(ItemUpdateType.MetadataEdit, cancellationToken)',SERVICE)
        self.assertIn('if (!ledger.CreatedBoxSetIds.Contains(box.Id.ToString("N"))) continue;',SERVICE)
        self.assertNotIn('ForcedSortName =',SERVICE)
    def test_admin_exposes_delete_and_sort_results(self):
        self.assertIn('removedMemberships', CONFIG)
        self.assertIn('deletedCollections', CONFIG)
        self.assertIn('reorderedCollections', CONFIG)
        self.assertIn('Synchronizuj kolekcje z NFO teraz', CONFIG)

if __name__ == '__main__': unittest.main()
