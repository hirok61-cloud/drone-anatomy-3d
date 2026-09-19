#!/usr/bin/env python3
"""検証用: ブラウザの canvas を画像として受け取り docs/review/ に保存する小さなサーバ。
ブラウザペインが隠れていても canvas.toDataURL() は取れるので、これで見た目を確かめる。
  POST http://127.0.0.1:8943/?name=foo   本文 = dataURL（jpeg/png）
"""
import http.server, base64, urllib.parse, os, re
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'review')
class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    def do_OPTIONS(self): self.send_response(204); self._cors(); self.end_headers()
    def do_GET(self): self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = re.sub(r'[^A-Za-z0-9_.-]', '_', q.get('name', ['shot'])[0])   # 保存先は docs/review の直下だけ
        n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n).decode()
        head, data = body.split(',', 1) if body.startswith('data:') else ('', body)
        ext = '.png' if 'image/png' in head else '.jpg'
        os.makedirs(OUT, exist_ok=True)
        path = os.path.join(OUT, name + ext); open(path, 'wb').write(base64.b64decode(data))
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(path.encode())
    def log_message(self, *a): pass
http.server.HTTPServer(('127.0.0.1', 8943), H).serve_forever()
