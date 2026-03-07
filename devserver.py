#!/usr/bin/env python3
# Simple dev server for UI preview — serves project files over HTTP
# Usage: python3 devserver.py [port]
import sys
import os
import http.server

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3737
ROOT = os.path.dirname(os.path.abspath(__file__))

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
}

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        url = self.path.split('?')[0]
        if url == '/':
            url = '/index.html'

        file_path = os.path.realpath(os.path.join(ROOT, url.lstrip('/')))

        # Security: prevent path traversal
        if not file_path.startswith(ROOT):
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b'Forbidden')
            return

        try:
            with open(file_path, 'rb') as f:
                data = f.read()
        except OSError:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Not found: {url}'.encode())
            return

        ext = os.path.splitext(file_path)[1].lower()
        mime = MIME.get(ext, 'application/octet-stream')
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass  # suppress request logs

server = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
print(f'SQS dev server listening on http://127.0.0.1:{PORT}', flush=True)
server.serve_forever()
