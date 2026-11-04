"""Ed25519 signing for proof records.

Each proof is a JSON credential shaped like a W3C Verifiable Credential (v2 context), signed by
GUTHI over canonical JSON (sorted keys, no whitespace, UTF-8). The public key is served at
/.well-known/sajha-kaam-keys.json so anyone can check a proof themselves.

SIGNING_SEED_B64: a base64 32-byte seed, or any secret string (hashed to 32 bytes).
Unset (local dev): derived from JWT_SECRET, so signatures survive restarts.
"""

import base64
import binascii
import hashlib
import json
from functools import lru_cache

from nacl.exceptions import BadSignatureError
from nacl.signing import SigningKey, VerifyKey

from app.config import settings

ISSUER = {"id": "urn:sajha-kaam:issuer", "name": "Sajha Kaam (demo)"}


def canonical(obj: dict) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _seed() -> bytes:
    raw = settings().signing_seed_b64
    if raw:
        try:
            decoded = base64.b64decode(raw, validate=True)
            if len(decoded) == 32:
                return decoded
        except (binascii.Error, ValueError):
            pass
        return hashlib.sha256(raw.encode()).digest()
    return hashlib.sha256(f"guthi-dev-signing|{settings().jwt_secret}".encode()).digest()


@lru_cache
def signing_key() -> SigningKey:
    return SigningKey(_seed())


def public_key_b64() -> str:
    return base64.b64encode(bytes(signing_key().verify_key)).decode()


def key_id() -> str:
    return "gk-" + hashlib.sha256(bytes(signing_key().verify_key)).hexdigest()[:16]


def keyset() -> dict:
    return {"issuer": ISSUER, "keys": [{"key_id": key_id(), "alg": "Ed25519", "public_key_b64": public_key_b64()}]}


def sign(credential: dict) -> tuple[str, str]:
    """Return (signature_b64, key_id) over canonical JSON of the credential."""
    sig = signing_key().sign(canonical(credential).encode()).signature
    return base64.b64encode(sig).decode(), key_id()


def verify(credential: dict, signature_b64: str, public_b64: str | None = None) -> bool:
    try:
        vk = VerifyKey(base64.b64decode(public_b64 or public_key_b64()))
        vk.verify(canonical(credential).encode(), base64.b64decode(signature_b64))
        return True
    except (BadSignatureError, ValueError, binascii.Error):
        return False
