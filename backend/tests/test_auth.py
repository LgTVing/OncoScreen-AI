from tests.conftest import API


def test_register_login_me(client):
    r = client.post(
        f"{API}/auth/register", json={"email": "a@b.vn", "password": "123456", "full_name": "A", "role": "patient"}
    )
    assert r.status_code == 201
    r = client.post(f"{API}/auth/login", json={"email": "a@b.vn", "password": "123456"})
    assert r.status_code == 200
    tok = r.json()["access_token"]
    me = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.json()["email"] == "a@b.vn"


def test_wrong_password(client):
    client.post(
        f"{API}/auth/register", json={"email": "a@b.vn", "password": "123456", "full_name": "A", "role": "patient"}
    )
    assert client.post(f"{API}/auth/login", json={"email": "a@b.vn", "password": "xxxxxx"}).status_code == 401


def test_public_cannot_register_doctor(client):
    r = client.post(
        f"{API}/auth/register",
        json={"email": "fake-doctor@b.vn", "password": "123456", "full_name": "Fake", "role": "doctor"},
    )
    assert r.status_code == 403


def test_health_and_public_catalog(client):
    assert client.get(f"{API}/health").json()["agent"] == "mock"
    services = client.get(f"{API}/services").json()
    assert {"breast_screening", "oncology_priority"} <= {s["code"] for s in services}
    assert client.get(f"{API}/education/breast").json()["sources"]
