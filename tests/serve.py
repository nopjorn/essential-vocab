# Static server for the Playwright tests (1.264.4): `python3 tests/serve.py [port]` serves the repo root like
# `python3 -m http.server`, but with a long listen queue. The stock server queues only 5 connections; Windows refuses
# the rest at once (Linux makes them wait), so on the PC a service worker filling its cache (~300 files), or 4 test
# workers opening the app at the same time, lost requests with ERR_CONNECTION_REFUSED and the tests timed out.
#
# 1.264.8: index.html goes out with its Content-Security-Policy as an HTTP header instead of the <meta> tag (the same
# policy, still enforced: an inline script the page adds is refused either way). Chromium does not fetch ahead while a
# page holds a CSP <meta>, so the ~80 scripts came one after another; with the header they load side by side and the app
# starts in ~0.65 s instead of ~1 s, in every test. GitHub Pages cannot send headers, so the real app keeps the <meta>.
import http.server
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSP_META = re.compile(rb'<meta http-equiv="Content-Security-Policy" content="([^"]*)">\r?\n?')


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        if self.path.split('?', 1)[0].split('#', 1)[0] not in ('/', '/index.html'):
            return super().send_head()
        with open(os.path.join(ROOT, 'index.html'), 'rb') as f:
            body = f.read()
        m = CSP_META.search(body)
        if m:
            body = body[:m.start()] + body[m.end():]
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        if m:
            self.send_header('Content-Security-Policy', m.group(1).decode('utf-8'))
        self.end_headers()
        return io.BytesIO(body)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with Server(('', port), Handler) as httpd:
        print(f'Serving {ROOT} on port {port}', flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
