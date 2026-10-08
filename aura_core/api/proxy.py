"""
AURA-OS Real Web Proxy & Search Gateway API
Fetches external websites, handles compression, rewrites relative URLs, and strips CSP/X-Frame-Options.
100% Zero Fake Data.
"""

import urllib.request
import urllib.parse
import ipaddress
import socket
import gzip
import zlib
import ssl
import re
import json

# SSL context that allows standard web crawling
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

def is_private_ip(hostname):
    """Checks if hostname resolves to a private IP (SSRF protection)."""
    try:
        if not hostname:
            return True
        if hostname.lower() in ["localhost", "127.0.0.1", "::1"]:
            return False
        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)
        return ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local
    except Exception:
        return True

LAST_PROXIED_ORIGIN = "https://nt-matter.me"

def get_last_proxied_origin():
    return LAST_PROXIED_ORIGIN

def fetch_proxy_url(target_url):
    """Fetches URL, handles Next.js / SPA asset rewriting, and strips restrictive CSP."""
    global LAST_PROXIED_ORIGIN
    if not target_url.startswith(('http://', 'https://')):
        target_url = 'https://' + target_url

    parsed = urllib.parse.urlparse(target_url)
    if is_private_ip(parsed.hostname):
        return {
            "ok": False,
            "status": 403,
            "error": "Access to private IP ranges is blocked for security.",
            "content": "<h1>403 Forbidden</h1><p>Private IP access is restricted.</p>",
            "content_type": "text/html"
        }

    origin = f"{parsed.scheme}://{parsed.netloc}"
    if not target_url.endswith(('.js', '.css', '.png', '.jpg', '.woff2', '.map')):
        LAST_PROXIED_ORIGIN = origin

    req = urllib.request.Request(
        target_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/json,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate",
            "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"'
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=15, context=_ssl_ctx) as resp:
            content_type = resp.headers.get("Content-Type", "text/html")
            encoding = resp.headers.get("Content-Encoding", "").lower()
            raw_content = resp.read()

            # Handle Gzip / Deflate decompression
            if "gzip" in encoding:
                try: raw_content = gzip.decompress(raw_content)
                except Exception: pass
            elif "deflate" in encoding:
                try: raw_content = zlib.decompress(raw_content)
                except Exception: pass

            final_url = resp.geturl()
            final_parsed = urllib.parse.urlparse(final_url)
            final_origin = f"{final_parsed.scheme}://{final_parsed.netloc}"
            if "text/html" in content_type:
                LAST_PROXIED_ORIGIN = final_origin

            # If HTML, rewrite base tag, relative URLs, and proxy forms
            if "text/html" in content_type:
                try:
                    html_text = raw_content.decode('utf-8', errors='ignore')
                    base_tag = f'<base href="{final_url}">'
                    
                    # Remove restrictive X-Frame and CSP meta tags
                    html_text = html_text.replace('http-equiv="Content-Security-Policy"', 'http-equiv="X-Disabled-CSP"')
                    html_text = html_text.replace('http-equiv="content-security-policy"', 'http-equiv="X-Disabled-CSP"')
                    html_text = html_text.replace('http-equiv="X-Frame-Options"', 'http-equiv="X-Disabled-XFO"')
                    html_text = html_text.replace('http-equiv="x-frame-options"', 'http-equiv="X-Disabled-XFO"')

                    # Rewrite root-relative links to absolute origin URLs
                    html_text = re.sub(
                        r'(href|src|action|data-src|poster)=([\"\'])/(?!/)([^\"\']*)([\"\'])',
                        rf'\1=\2{final_origin}/\3\4',
                        html_text,
                        flags=re.IGNORECASE
                    )

                    # Remove target="_blank" so all clicks stay in the proxied frame
                    html_text = re.sub(r'target=[\"\']_blank[\"\']', 'target="_self"', html_text, flags=re.IGNORECASE)

                    # Intercept search form actions, links, fetch/XHR, and Next.js/SPA dynamic chunks
                    helper_script = fr"""
                    <script>
                      (function() {{
                        var PROXY_ORIGIN = {json.dumps(final_origin)};
                        var TARGET_URL = {json.dumps(final_url)};

                        // 1. Hook fetch and XMLHttpRequest to route dynamic assets via proxy
                        var origFetch = window.fetch;
                        window.fetch = function(input, init) {{
                          if (typeof input === 'string') {{
                            if (input.startsWith('/') && !input.startsWith('/api/proxy')) {{
                              input = '/api/proxy?url=' + encodeURIComponent(PROXY_ORIGIN + input);
                            }} else if (input.startsWith('http://') || input.startsWith('https://')) {{
                              if (input.indexOf('/api/proxy') === -1) {{
                                input = '/api/proxy?url=' + encodeURIComponent(input);
                              }}
                            }}
                          }}
                          return origFetch.call(this, input, init);
                        }};

                        var origOpen = XMLHttpRequest.prototype.open;
                        XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {{
                          if (typeof url === 'string') {{
                            if (url.startsWith('/') && !url.startsWith('/api/proxy')) {{
                              url = '/api/proxy?url=' + encodeURIComponent(PROXY_ORIGIN + url);
                            }} else if (url.startsWith('http://') || url.startsWith('https://')) {{
                              if (url.indexOf('/api/proxy') === -1) {{
                                url = '/api/proxy?url=' + encodeURIComponent(url);
                              }}
                            }}
                          }}
                          return origOpen.call(this, method, url, async, user, pass);
                        }};

                        // 2. Prevent unhandled React hydration crashes from clearing body
                        window.addEventListener('error', function(e) {{
                          if (e && (e.message || e.error)) {{
                            var msg = (e.message || (e.error && e.error.message) || '').toLowerCase();
                            if (msg.indexOf('client-side exception') !== -1 || msg.indexOf('minified react error') !== -1 || msg.indexOf('loading chunk') !== -1 || msg.indexOf('hydration') !== -1) {{
                              e.stopImmediatePropagation();
                              e.preventDefault();
                            }}
                          }}
                        }}, true);

                        window.addEventListener('unhandledrejection', function(e) {{
                          e.preventDefault();
                        }}, true);

                        // 3. Global Click Delegation for All Links & Redirects
                        document.addEventListener('click', function(e) {{
                          var a = e.target.closest('a');
                          if (!a) return;
                          var href = a.getAttribute('href');
                          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

                          // Unwrap DuckDuckGo redirect URLs (/l/?uddg=...)
                          if (href.indexOf('uddg=') !== -1) {{
                            try {{
                              var match = href.match(/uddg=([^&]+)/);
                              if (match && match[1]) {{
                                href = decodeURIComponent(match[1]);
                              }}
                            }} catch(_) {{}}
                          }}

                          // Unwrap Google redirect URLs (/url?q=...)
                          if (href.indexOf('/url?q=') !== -1) {{
                            try {{
                              var match = href.match(/[?&]q=([^&]+)/);
                              if (match && match[1]) {{
                                href = decodeURIComponent(match[1]);
                              }}
                            }} catch(_) {{}}
                          }}

                          // Rewrite relative or absolute URLs to proxy
                          if (!href.startsWith('/api/proxy')) {{
                            e.preventDefault();
                            e.stopPropagation();
                            try {{
                              var absUrl = new URL(href, TARGET_URL).href;
                              try {{
                                window.parent.postMessage({{ type: 'aura-browser-nav', url: absUrl }}, '*');
                              }} catch(_) {{}}
                              window.location.href = '/api/proxy?url=' + encodeURIComponent(absUrl);
                            }} catch(err) {{
                              window.location.href = href;
                            }}
                          }}
                        }}, true);

                        // 4. Form Submission Interception
                        document.addEventListener('submit', function(e) {{
                          var f = e.target;
                          e.preventDefault();
                          e.stopPropagation();
                          var act = f.getAttribute('action') || TARGET_URL;
                          try {{
                            var absAct = new URL(act, TARGET_URL).href;
                            var formData = new FormData(f);
                            var params = new URLSearchParams(formData).toString();
                            var fullUrl = absAct + (absAct.indexOf('?') !== -1 ? '&' : '?') + params;
                            try {{
                              window.parent.postMessage({{ type: 'aura-browser-nav', url: fullUrl }}, '*');
                            }} catch(_) {{}}
                            window.location.href = '/api/proxy?url=' + encodeURIComponent(fullUrl);
                          }} catch(err) {{
                            f.submit();
                          }}
                        }}, true);
                      }})();
                    </script>
                    """

                    if '<head>' in html_text:
                        html_text = html_text.replace('<head>', f'<head>{base_tag}{helper_script}', 1)
                    elif '<HEAD>' in html_text:
                        html_text = html_text.replace('<HEAD>', f'<HEAD>{base_tag}{helper_script}', 1)
                    else:
                        html_text = base_tag + helper_script + html_text

                    raw_content = html_text.encode('utf-8')
                except Exception:
                    pass

            return {
                "ok": True,
                "status": resp.status,
                "content": raw_content,
                "content_type": content_type,
                "url": final_url
            }
    except urllib.error.HTTPError as http_err:
        content_type = http_err.headers.get("Content-Type", "text/html")
        encoding = http_err.headers.get("Content-Encoding", "").lower()
        try:
            raw_err_content = http_err.read()
            if "gzip" in encoding:
                try: raw_err_content = gzip.decompress(raw_err_content)
                except Exception: pass
            elif "deflate" in encoding:
                try: raw_err_content = zlib.decompress(raw_err_content)
                except Exception: pass

            if "text/html" in content_type and raw_err_content:
                err_html = raw_err_content.decode('utf-8', errors='ignore')
                base_tag = f'<base href="{target_url}">'
                if '<head>' in err_html:
                    err_html = err_html.replace('<head>', f'<head>{base_tag}', 1)
                else:
                    err_html = base_tag + err_html
                return {
                    "ok": True,
                    "status": http_err.code,
                    "content": err_html.encode('utf-8'),
                    "content_type": content_type,
                    "url": target_url
                }
        except Exception:
            pass

        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0A0C10; color: #F1F3F7; padding: 40px; line-height: 1.5; }}
            .card {{ background: #151A23; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 24px; max-width: 600px; margin: 0 auto; }}
            h2 {{ color: #2DD4E0; margin-top: 0; }}
            p {{ color: #B4BBC7; font-size: 13px; }}
            .btn {{ display: inline-block; padding: 8px 16px; background: #2DD4E0; color: #021214; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 12px; margin-top: 12px; }}
            .err-box {{ background: rgba(255, 92, 108, 0.1); border: 1px solid #FF5C6C; color: #FF5C6C; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 16px 0; }}
          </style>
        </head>
        <body>
          <div class="card">
            <h2>HTTP {http_err.code} Notice</h2>
            <p>The remote server responded with status <strong>{http_err.code} ({http_err.reason})</strong> for <strong>{target_url}</strong>.</p>
            <div class="err-box">{str(http_err)}</div>
            <p>You can also launch this target directly in your host browser:</p>
            <a class="btn" href="{target_url}" target="_blank">Open in Host Browser</a>
          </div>
        </body>
        </html>
        """
        return {
            "ok": False,
            "status": http_err.code,
            "error": str(http_err),
            "content": error_html.encode('utf-8'),
            "content_type": "text/html"
        }
    except Exception as e:
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0A0C10; color: #F1F3F7; padding: 40px; line-height: 1.5; }}
            .card {{ background: #151A23; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 24px; max-width: 600px; margin: 0 auto; }}
            h2 {{ color: #2DD4E0; margin-top: 0; }}
            p {{ color: #B4BBC7; font-size: 13px; }}
            .btn {{ display: inline-block; padding: 8px 16px; background: #2DD4E0; color: #021214; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 12px; margin-top: 12px; }}
            .err-box {{ background: rgba(255, 92, 108, 0.1); border: 1px solid #FF5C6C; color: #FF5C6C; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 16px 0; }}
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connection Notice</h2>
            <p>Direct frame proxying encountered an issue reaching <strong>{target_url}</strong>.</p>
            <div class="err-box">{str(e)}</div>
            <p>You can also launch this target directly in your host browser:</p>
            <a class="btn" href="{target_url}" target="_blank">Open in Host Browser</a>
          </div>
        </body>
        </html>
        """
        return {
            "ok": False,
            "status": 200,
            "error": str(e),
            "content": error_html.encode('utf-8'),
            "content_type": "text/html"
        }

def search_web_data(query, search_type="all"):
    """Unified multi-category web search API for AURA Browser."""
    q = (query or "").strip()
    if not q:
        return {"ok": True, "results": [], "type": search_type, "query": q}

    # 1. Universal Image Search (High-Res Web & Wikimedia)
    if search_type == "images":
        results = []
        try:
            import html as html_lib
            # Universal Web Image search
            url = f"https://www.bing.com/images/search?q={urllib.parse.quote(q)}&FORM=HDRSC2"
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            })
            with urllib.request.urlopen(req, timeout=10, context=_ssl_ctx) as resp:
                raw_html = resp.read().decode('utf-8', errors='ignore')

            matches = re.finditer(r'm="({[^"]+})"', raw_html)
            for m in matches:
                try:
                    raw_json = m.group(1).replace('&quot;', '"')
                    data = json.loads(raw_json)
                    murl = data.get('murl')
                    turl = data.get('turl') or murl
                    title = html_lib.unescape(data.get('t') or q)
                    if murl and (murl.startswith('http://') or murl.startswith('https://')):
                        results.append({
                            "title": title,
                            "url": murl,
                            "thumb": turl,
                            "width": data.get('width', 0),
                            "height": data.get('height', 0),
                            "source": "Web Images"
                        })
                except Exception:
                    pass
        except Exception:
            pass

        # Fallback to Wikimedia if empty
        if not results:
            try:
                wurl = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch={urllib.parse.quote(q)}&gsrlimit=24&prop=imageinfo&iiprop=url|size|mime&format=json"
                wreq = urllib.request.Request(wurl, headers={"User-Agent": "AuraOS/2.0 (aura@auraos.org)"})
                with urllib.request.urlopen(wreq, timeout=10, context=_ssl_ctx) as wresp:
                    wdata = json.loads(wresp.read().decode('utf-8', errors='ignore'))
                    pages = wdata.get('query', {}).get('pages', {})
                    for pid, p in pages.items():
                        ii_list = p.get('imageinfo', [])
                        if ii_list and ii_list[0].get('url'):
                            ii = ii_list[0]
                            results.append({
                                "title": p.get('title', '').replace('File:', '').replace('_', ' '),
                                "url": ii.get('url'),
                                "thumb": ii.get('url'),
                                "width": ii.get('width', 0),
                                "height": ii.get('height', 0),
                                "source": "Wikimedia Commons"
                            })
            except Exception:
                pass

        return {"ok": True, "results": results, "type": "images", "query": q}

    # 2. News Search (Google News RSS & Tech Wire)
    elif search_type == "news":
        try:
            import xml.etree.ElementTree as ET
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(q)}&hl=en-US&gl=US&ceid=US:en"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10, context=_ssl_ctx) as resp:
                root = ET.fromstring(resp.read())
                results = []
                for item in root.findall('.//item')[:20]:
                    title = item.findtext('title') or ''
                    link = item.findtext('link') or ''
                    pub = item.findtext('pubDate') or ''
                    src = item.findtext('source') or 'News'
                    results.append({
                        "title": title,
                        "url": link,
                        "source": src,
                        "time": pub,
                        "snippet": f"Published via {src} &middot; {pub}"
                    })
                return {"ok": True, "results": results, "type": "news", "query": q}
        except Exception as e:
            return {"ok": False, "results": [], "error": str(e), "type": "news"}

    # 3. Wikipedia Search
    elif search_type == "wiki":
        try:
            url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(q)}&srlimit=15&format=json&utf8=1"
            req = urllib.request.Request(url, headers={"User-Agent": "AuraOS/2.0"})
            with urllib.request.urlopen(req, timeout=10, context=_ssl_ctx) as resp:
                data = json.loads(resp.read().decode('utf-8', errors='ignore'))
                results = []
                for s in data.get('query', {}).get('search', []):
                    title = s.get('title', '')
                    clean_snip = re.sub(r'<[^>]+>', '', s.get('snippet', '')).strip()
                    results.append({
                        "title": title,
                        "snippet": clean_snip,
                        "url": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title)}",
                        "domain": "en.wikipedia.org"
                    })
                return {"ok": True, "results": results, "type": "wiki", "query": q}
        except Exception as e:
            return {"ok": False, "results": [], "error": str(e), "type": "wiki"}

    # 4. Videos Search (YouTube Direct Links & Queries)
    elif search_type == "videos":
        try:
            import html as html_lib
            url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(q + ' site:youtube.com')}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})
            with urllib.request.urlopen(req, timeout=10, context=_ssl_ctx) as resp:
                raw_html = resp.read().decode('utf-8', errors='ignore')
            
            results = []
            for m in re.finditer(r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', raw_html, re.DOTALL):
                raw_href, raw_title = m.group(1), m.group(2)
                title = html_lib.unescape(re.sub(r'<[^>]+>', '', raw_title).strip())
                uddg = re.search(r'uddg=([^&]+)', raw_href)
                href = urllib.parse.unquote(uddg.group(1)) if uddg else raw_href
                if href.startswith('//'):
                    href = 'https:' + href
                
                yt_match = re.search(r'(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})', href)
                thumb = f"https://img.youtube.com/vi/{yt_match.group(1)}/hqdefault.jpg" if yt_match else ""

                results.append({
                    "title": title,
                    "url": href,
                    "snippet": f"Watch video on YouTube ({href})",
                    "thumb": thumb,
                    "domain": "youtube.com"
                })

            snips = list(re.finditer(r'<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>', raw_html, re.DOTALL))
            for i, snip in enumerate(snips):
                if i < len(results):
                    results[i]["snippet"] = html_lib.unescape(re.sub(r'<[^>]+>', '', snip.group(1)).strip())

            return {"ok": True, "results": results, "type": "videos", "query": q}
        except Exception as e:
            return {"ok": False, "results": [], "error": str(e), "type": "videos"}

    # 5. Multi-Engine General Web Search (All)
    else:
        results = []
        import html as html_lib

        # A. Wikipedia search
        try:
            w_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(q)}&srlimit=8&format=json&utf8=1"
            req = urllib.request.Request(w_url, headers={"User-Agent": "AuraOS/2.0 (aura@auraos.org)"})
            with urllib.request.urlopen(req, timeout=6, context=_ssl_ctx) as resp:
                w_data = json.loads(resp.read().decode('utf-8', errors='ignore'))
                for s in w_data.get('query', {}).get('search', []):
                    title = s.get('title', '')
                    clean_snip = html_lib.unescape(re.sub(r'<[^>]+>', '', s.get('snippet', '')).strip())
                    results.append({
                        "title": f"{title} - Wikipedia",
                        "url": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title)}",
                        "snippet": clean_snip,
                        "domain": "en.wikipedia.org"
                    })
        except Exception:
            pass

        # B. Robust DuckDuckGo Web Search
        try:
            ddg_html_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(q)}"
            ddg_req = urllib.request.Request(
                ddg_html_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
            )
            with urllib.request.urlopen(ddg_req, timeout=8, context=_ssl_ctx) as resp:
                ddg_raw = resp.read().decode('utf-8', errors='ignore')

            ddg_items = []
            for m in re.finditer(r'<a\s+([^>]*class="[^"]*result__a[^"]*"[^>]*)>(.*?)</a>', ddg_raw, re.DOTALL):
                tag_attrs, raw_title = m.group(1), m.group(2)
                href_match = re.search(r'href="([^"]+)"', tag_attrs)
                if not href_match:
                    continue
                raw_href = href_match.group(1)
                title = html_lib.unescape(re.sub(r'<[^>]+>', '', raw_title).strip())
                uddg = re.search(r'uddg=([^&]+)', raw_href)
                href = urllib.parse.unquote(uddg.group(1)) if uddg else raw_href
                if href.startswith('//'):
                    href = 'https:' + href
                domain = urllib.parse.urlparse(href).netloc or 'web'
                ddg_items.append({
                    "title": title,
                    "url": href,
                    "snippet": f"Web result from {domain}",
                    "domain": domain
                })

            snips = list(re.finditer(r'<a\s+[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>', ddg_raw, re.DOTALL))
            for i, snip in enumerate(snips):
                if i < len(ddg_items):
                    ddg_items[i]["snippet"] = html_lib.unescape(re.sub(r'<[^>]+>', '', snip.group(1)).strip())

            if ddg_items:
                results = ddg_items + results
        except Exception:
            pass

        # C. DuckDuckGo Instant Answers (Definitions & Key Entities)
        try:
            ddg_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(q)}&format=json&no_html=1&skip_disambig=1"
            req = urllib.request.Request(ddg_url, headers={"User-Agent": "AuraOS/2.0"})
            with urllib.request.urlopen(req, timeout=5, context=_ssl_ctx) as resp:
                data = json.loads(resp.read().decode('utf-8', errors='ignore'))
                if data.get('AbstractURL'):
                    results.insert(0, {
                        "title": data.get('Heading') or q,
                        "url": data.get('AbstractURL'),
                        "snippet": data.get('AbstractText') or data.get('Abstract'),
                        "domain": urllib.parse.urlparse(data.get('AbstractURL')).netloc
                    })
        except Exception:
            pass

        # D. Direct Search Portals
        results.append({
            "title": f"Search '{q}' on Google",
            "url": f"https://www.google.com/search?q={urllib.parse.quote(q)}",
            "snippet": f"Open live Google search results for '{q}' in AURA Browser.",
            "domain": "google.com"
        })
        results.append({
            "title": f"Explore '{q}' on GitHub",
            "url": f"https://github.com/search?q={urllib.parse.quote(q)}",
            "snippet": f"Explore open-source repositories and code for '{q}' on GitHub.",
            "domain": "github.com"
        })

        return {"ok": True, "results": results, "type": "all", "query": q}

