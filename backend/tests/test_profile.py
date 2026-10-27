from tests.conftest import API, register_and_login


def test_patient_profile_lifecycle(client):
    auth = register_and_login(client, "new_patient@test.vn")
    assert client.get(f"{API}/patients/me/profile", headers=auth).status_code == 404
    profile_data = {
        "age": 40,
        "gender": "male",
        "genetics_history": ["lung_cancer_father"],
        "lifestyle": {"smoking": True, "pack_years": 15},
    }
    r = client.put(f"{API}/patients/me/profile", json=profile_data, headers=auth)
    assert r.status_code == 200 and r.json()["lifestyle"]["pack_years"] == 15
    assert client.get(f"{API}/patients/me/profile", headers=auth).json()["age"] == 40
    kinds = [e["kind"] for e in client.get(f"{API}/patients/me/record", headers=auth).json()["timeline"]]
    assert kinds.count("profile.updated") == 1
