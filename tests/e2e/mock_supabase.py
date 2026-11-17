"""Tiny stand-in for Supabase Auth + the user_state table, for end-to-end tests only.

Implements just what ALL uses: password sign-up/sign-in, user, logout, TOTP factors
(any 6-digit code '123456' is valid), and GET/POST on /rest/v1/user_state with the
same rules as supabase/schema.sql (own row only; aal2 required once a factor is verified).
"""
import base64
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

USERS = {}      # email -> {id, email, password, factors: [..]}
TOKENS = {}     # access_token -> {user_id, aal}
ROWS = {}       # user_id -> {state, updated_at}
CHALLENGES = {}


def b64(d):
    return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b'=').decode()


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec='microseconds')


def user_json(u):
    return {
        'id': u['id'], 'aud': 'authenticated', 'role': 'authenticated', 'email': u['email'],
        'email_confirmed_at': now_iso(), 'created_at': now_iso(), 'updated_at': now_iso(),
        'app_metadata': {'provider': 'email'}, 'user_metadata': {}, 'identities': [],
        'factors': [{'id': f['id'], 'factor_type': 'totp', 'status': f['status'], 'friendly_name': f['name'],
                     'created_at': now_iso(), 'updated_at': now_iso()} for f in u['factors']],
    }


def session_for(u, aal='aal1'):
    exp = int(time.time()) + 3600
    payload = {'sub': u['id'], 'email': u['email'], 'aud': 'authenticated', 'role': 'authenticated', 'exp': exp,
               'iat': int(time.time()), 'aal': aal, 'amr': [{'method': 'password', 'timestamp': int(time.time())}],
               'session_id': str(uuid.uuid4())}
    token = b64({'alg': 'HS256', 'typ': 'JWT'}) + '.' + b64(payload) + '.' + b64({'s': str(uuid.uuid4())})
    TOKENS[token] = {'user_id': u['id'], 'aal': aal}
    return {'access_token': token, 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': exp,
            'refresh_token': str(uuid.uuid4()), 'user': user_json(u)}


def by_id(uid):
    return next((u for u in USERS.values() if u['id'] == uid), None)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def cors(self):
        self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin') or '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        self.send_header('Access-Control-Expose-Headers', '*')

    def reply(self, code, body=None, ctype='application/json'):
        data = b'' if body is None else json.dumps(body).encode()
        self.send_response(code)
        self.cors()
        if body is not None:
            self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'{}') if n else {}

    def auth(self):
        h = self.headers.get('Authorization', '')
        return TOKENS.get(h[7:]) if h.startswith('Bearer ') else None

    def do_OPTIONS(self):
        self.reply(204)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/__state':
            return self.reply(200, {'rows': ROWS, 'users': list(USERS)})
        if u.path == '/auth/v1/user':
            a = self.auth()
            return self.reply(200, user_json(by_id(a['user_id']))) if a else self.reply(401, {'msg': 'no'})
        if u.path == '/rest/v1/user_state':
            a = self.auth()
            if not a:
                return self.reply(401, {'message': 'JWT required'})
            if not self.mfa_ok(a):
                return self.reply(200, [])  # RLS hides the row
            q = parse_qs(u.query)
            uid = q.get('user_id', ['eq.'])[0][3:]
            rows = [dict(ROWS[uid], user_id=uid)] if uid == a['user_id'] and uid in ROWS else []
            if 'vnd.pgrst.object' in self.headers.get('Accept', ''):
                return self.reply(200, rows[0]) if rows else self.reply(406, {'code': 'PGRST116', 'message': 'no rows'})
            return self.reply(200, rows)
        self.reply(404, {'msg': 'not found ' + u.path})

    def mfa_ok(self, a):
        u = by_id(a['user_id'])
        return a['aal'] == 'aal2' or not any(f['status'] == 'verified' for f in u['factors'])

    def do_POST(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        b = self.body()
        if u.path == '/__reset':
            USERS.clear(); TOKENS.clear(); ROWS.clear()
            return self.reply(200, {})
        if u.path == '/auth/v1/signup':
            if b['email'] in USERS:
                return self.reply(422, {'code': 422, 'error_code': 'user_already_exists', 'msg': 'User already registered'})
            usr = {'id': str(uuid.uuid4()), 'email': b['email'], 'password': b['password'], 'factors': []}
            USERS[b['email']] = usr
            return self.reply(200, session_for(usr))
        if u.path == '/auth/v1/token' and q.get('grant_type') == ['password']:
            usr = USERS.get(b.get('email'))
            if not usr or usr['password'] != b.get('password'):
                return self.reply(400, {'code': 400, 'error_code': 'invalid_credentials', 'msg': 'Invalid login credentials'})
            return self.reply(200, session_for(usr))
        if u.path == '/auth/v1/logout':
            return self.reply(204)
        if u.path == '/auth/v1/recover':
            return self.reply(200, {})
        a = self.auth()
        if not a:
            return self.reply(401, {'msg': 'JWT required'})
        usr = by_id(a['user_id'])
        if u.path == '/auth/v1/factors':
            f = {'id': str(uuid.uuid4()), 'status': 'unverified', 'name': b.get('friendly_name', 'totp')}
            usr['factors'].append(f)
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
            return self.reply(200, {'id': f['id'], 'type': 'totp', 'friendly_name': f['name'],
                                    'totp': {'qr_code': svg, 'secret': 'JBSWY3DPEHPK3PXP', 'uri': 'otpauth://totp/ALL'}})
        if u.path.startswith('/auth/v1/factors/') and u.path.endswith('/challenge'):
            cid = str(uuid.uuid4())
            CHALLENGES[cid] = u.path.split('/')[4]
            return self.reply(200, {'id': cid, 'type': 'totp', 'expires_at': int(time.time()) + 300})
        if u.path.startswith('/auth/v1/factors/') and u.path.endswith('/verify'):
            fid = u.path.split('/')[4]
            if CHALLENGES.get(b.get('challenge_id')) != fid or b.get('code') != '123456':
                return self.reply(422, {'code': 422, 'error_code': 'mfa_verification_failed', 'msg': 'Invalid TOTP code entered'})
            for f in usr['factors']:
                if f['id'] == fid:
                    f['status'] = 'verified'
            return self.reply(200, session_for(usr, 'aal2'))
        if u.path == '/rest/v1/user_state':
            if not self.mfa_ok(a):
                return self.reply(403, {'code': '42501', 'message': 'new row violates row-level security policy'})
            uid = b.get('user_id') or a['user_id']
            if uid != a['user_id']:
                return self.reply(403, {'code': '42501', 'message': 'new row violates row-level security policy'})
            ROWS[uid] = {'state': b['state'], 'updated_at': now_iso()}
            row = dict(ROWS[uid], user_id=uid)
            sel = q.get('select', [''])[0]
            if sel:
                row = {k: row[k] for k in sel.split(',') if k in row}
            obj = 'vnd.pgrst.object' in self.headers.get('Accept', '')
            return self.reply(201, row if obj else [row])
        self.reply(404, {'msg': 'not found ' + u.path})

    def do_DELETE(self):
        u = urlparse(self.path)
        a = self.auth()
        if a and u.path.startswith('/auth/v1/factors/'):
            usr = by_id(a['user_id'])
            fid = u.path.split('/')[4]
            usr['factors'] = [f for f in usr['factors'] if f['id'] != fid]
            return self.reply(200, {'id': fid})
        self.reply(404, {})


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 54321
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
