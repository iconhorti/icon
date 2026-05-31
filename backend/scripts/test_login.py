"""
Quick diagnostic: test the login endpoint directly.
Run from the backend folder:
  C:\Python311\python.exe test_login.py
"""
import urllib.request, urllib.error, json

BASE = "http://localhost:8000"

def test(url, label=""):
    try:
        req = urllib.request.Request(
            url,
            data=b'{"username":"9888888888","password":"icon123"}',
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read())
            print(f"[OK] {label or url}")
            print(f"     Logged in as: {body.get('first_name')} (role={body.get('role')})")
            print(f"     Token: {body.get('token', '')[:40]}...")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[HTTP {e.code}] {label or url}")
        print(f"     Detail: {body}")
    except Exception as e:
        print(f"[FAIL] {label or url}")
        print(f"       {type(e).__name__}: {e}")

def check_root():
    try:
        with urllib.request.urlopen(f"{BASE}/", timeout=5) as resp:
            body = json.loads(resp.read())
            print(f"[OK] Server is UP — {body.get('status')} v{body.get('version')}")
            return True
    except Exception as e:
        print(f"[FAIL] Server is NOT reachable at {BASE}")
        print(f"       {type(e).__name__}: {e}")
        print()
        print("  >>> FIX: Open run_all.bat (in E:\\ICON\\) or run:")
        print("      cd E:\\ICON\\backend")
        print("      C:\\Python311\\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return False

print("=" * 60)
print("  ICON Login Diagnostic")
print("=" * 60)

if check_root():
    print()
    print("Testing login endpoint...")
    test(f"{BASE}/api/v1/auth/login", "POST /auth/login (admin user 9888888888 / icon123)")
    print()
    print("If login succeeded above, the backend is healthy.")
    print("If you still can't log in via the browser, try:")
    print("  1. Hard-refresh the browser (Ctrl+Shift+R)")
    print("  2. Clear localStorage: Open DevTools > Application > Local Storage > Clear")
    print("  3. Navigate to http://localhost:5173/login")

print("=" * 60)
