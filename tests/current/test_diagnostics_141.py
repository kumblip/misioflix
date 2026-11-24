"""Source contracts; C# build and authorization runtime require Jellyfin CI/NAS."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
class Diagnostics141(unittest.TestCase):
    def test_admin_only_no_store(self):
        code=(ROOT/'Controllers/MisioFlixDiagnosticsController.cs').read_text()
        self.assertIn('[Authorize(Policy = Policies.RequiresElevation)]',code)
        self.assertIn('private, no-store',code)
        self.assertNotIn('[AllowAnonymous]',code)
        self.assertEqual(code.count('[HttpPost('),2)
    def test_bounded_opt_in_aggregate(self):
        code=(ROOT/'Services/MisioFlixDiagnostics.cs').read_text()
        for phrase in ['Capacity = 256','private static bool _enabled;', 'generation != _generation', 'queue.Dequeue()', 'Allowed.Contains(operation)', 'RequestAborted.IsCancellationRequested']:
            self.assertIn(phrase,code)
        for forbidden in ['Request.Headers','Request.Query','File.Write','AccessToken']:
            self.assertNotIn(forbidden,code)
    def test_asset_order_and_measured_actions(self):
        code=(ROOT/'Services/ScriptInjection.cs').read_text()
        self.assertLess(code.index('assets/diagnostics.js'),code.index('assets/home.js'))
        code=(ROOT/'Controllers/MisioFlixController.cs').read_text()
        self.assertEqual(code.count('[MisioFlixMeasure('),8)
        self.assertIn('"diagnostics.js" => ("Web.diagnostics.js"',code)
    def test_panel_export_and_default_no_activation(self):
        code=(ROOT/'Web/configPage.html').read_text()
        self.assertIn('id="mf-diagnostics-panel"',code)
        self.assertIn('if(panel.open)void run(\'refresh\')',code)
        self.assertIn('MisioFlix-diagnostics.json',code)
        self.assertIn("api.getUrl('MisioFlix/api/diagnostics'+path)",code)
        self.assertIn('DeviceId="misioflix-diagnostics"',code)
        self.assertIn('active.controller.abort()',code)
