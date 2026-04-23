import http.server
import socketserver
import urllib.request
import urllib.error
import json

PORT = 8000

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow requests from the frontend
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy_request('GET')
        else:
            # Serve local files (index.html, app.js, index.css)
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.proxy_request('POST')
        else:
            self.send_error(404)
            
    def proxy_request(self, method):
        url = 'https://app.nx.vet' + self.path
        req = urllib.request.Request(url, method=method)
        
        # Forward necessary headers
        if 'Authorization' in self.headers:
            req.add_header('Authorization', self.headers['Authorization'])
        if 'Content-Type' in self.headers:
            req.add_header('Content-Type', self.headers['Content-Type'])
            
        data = None
        if method == 'POST':
            content_length = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(content_length)

        try:
            with urllib.request.urlopen(req, data=data) as response:
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"Server and Proxy running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
