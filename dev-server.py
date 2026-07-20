#!/usr/bin/env python3
"""dev-server.py — Root-level dev server with full routing."""
import http.server
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

class RootHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.strip('/')

        # /rsvp-admin -> rsvp-admin/super-adm.html
        if path in ('rsvp-admin', 'rsvp-admin/'):
            self.path = '/rsvp-admin/super-adm.html'
            return super().do_GET()

        # /rsvp-client -> rsvp-client/client-adm.html
        if path in ('rsvp-client', 'rsvp-client/'):
            self.path = '/rsvp-client/client-adm.html'
            return super().do_GET()

        return super().do_GET()

    def log_message(self, format, *args):
        print(f"[DEV] {args[0]}")

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', 8080), RootHandler)
    print('Dev server running on http://localhost:8080')
    server.serve_forever()
