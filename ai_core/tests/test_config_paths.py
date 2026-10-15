from ai_core.config import REPO_ROOT, Settings


def test_vector_store_path_is_independent_of_process_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("VECTOR_STORE_DIR", "./ai_core/data/vector_store")
    assert Settings().vector_store_dir == REPO_ROOT / "ai_core/data/vector_store"


def test_absolute_vector_store_path_is_preserved(tmp_path, monkeypatch):
    monkeypatch.setenv("VECTOR_STORE_DIR", str(tmp_path))
    assert Settings().vector_store_dir == tmp_path
