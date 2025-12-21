# met-game

Met Museum Artwork Year Guesser - A game where you guess if artworks are from before or after 1800.

## Running the Project

### Option 1: Python Proxy Server (Recommended)

Use the included proxy server to avoid CORS issues with the MET API:

```bash
python3 proxy_server.py
```

Then open your browser and navigate to `http://localhost:8000`

**Note:** This proxy server handles CORS headers and serves both static files and API requests.

### Option 2: Python HTTP Server (CORS issues)

Python comes with a built-in HTTP server, but it will have CORS issues with the MET API:

**Python 3:**
```bash
python3 -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

Then open your browser and navigate to `http://localhost:8000`

**Note:** Python's built-in server doesn't auto-reload and doesn't handle CORS. Use `proxy_server.py` instead.

### Option 2: live-server (Auto-reload)

For automatic page reloading when files change, use `live-server`:

**Installation:**
```bash
npm install -g live-server
```

**Run:**
```bash
live-server
```

By default, `live-server` will:
- Start a server on port 8080
- Automatically open your browser
- Reload the page whenever you save changes to HTML, CSS, or JavaScript files

**Custom port:**
```bash
live-server --port=8000
```

**Specify directory:**
```bash
live-server --open=index.html
```

Then open your browser and navigate to `http://localhost:8080` (or your specified port).
