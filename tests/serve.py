# Static server for the Playwright tests (1.264.4): `python3 tests/serve.py [port]` serves the repo root like
# `python3 -m http.server`, but with a long listen queue. The stock server queues only 5 connections; Windows refuses
# the rest at once (Linux makes them wait), so on the PC a service worker filling its cache (~300 files), or 4 test
# workers opening the app at the same time, lost requests with ERR_CONNECTION_REFUSED and the tests timed out.
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with Server(('', port), Handler) as httpd:
        print(f'Serving {ROOT} on port {port}', flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
