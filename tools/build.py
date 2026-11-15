"""Rebuild the self-contained index.html after editing data, CSS, JS or template."""
from pathlib import Path
import base64
import json

root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'data.json').read_text(encoding='utf-8'))
assert data['sources'] and data['STUDIES'], 'Missing sources or investigations'
template = (root / 'tools/template.html').read_text(encoding='utf-8')
replacements = {
    '/*__STYLES__*/': (root / 'tools/styles.css').read_text(encoding='utf-8'),
    '/*__CORE__*/': (root / 'backend/core.cjs').read_text(encoding='utf-8'),
    '/*__APP__*/': (root / 'tools/app.js').read_text(encoding='utf-8'),
    '__LOGO__': 'data:image/png;base64,' + base64.b64encode((root / 'tools/logo.png').read_bytes()).decode(),
    '__DATA__': json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029'),
}
for token, value in replacements.items():
    template = template.replace(token, value)
(root / 'index.html').write_text(template, encoding='utf-8')
print('Built index.html with', len(data['STUDIES']), 'investigations and', len(data['sources']), 'source files.')
