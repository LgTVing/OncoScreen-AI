from ai_core.rag.corpus import load_chunks
from ai_core.rag.lexical import tokenize
from ai_core.rag.retriever import retrieve, rrf
from ai_core.schemas import CancerType, Gender


def test_chunks_carry_contextual_header_and_metadata():
    chunk = next(c for c in load_chunks() if c.doc_id == "breast_uspstf_2024")
    assert chunk.text.startswith("USPSTF 2024") and chunk.meta["cancer_type"] == "breast"


def test_tokenize_folds_diacritics_and_adds_bigrams():
    tokens = tokenize("Chụp nhũ ảnh")
    assert "nhu" in tokens and "nhu_anh" in tokens


def test_rrf_rewards_agreement():
    fused = rrf([["a", "b"], ["b", "c"]])
    assert max(fused, key=fused.get) == "b"


def test_lexical_retrieval_without_vector_store():
    result = retrieve("chụp nhũ ảnh bao lâu một lần", dense=False)
    assert result.mode == "lexical" and result.sources[0].doc_id == "breast_uspstf_2024"


def test_metadata_filters():
    result = retrieve("tầm soát", gender=Gender.male, cancer_types={CancerType.prostate}, dense=False)
    assert result.sources and {s.doc_id for s in result.sources} <= {
        "prostate_uspstf_2018",
        "other_who_screening_guide_2022",
    }


def test_dense_failure_degrades_to_lexical(monkeypatch, tmp_path):
    from ai_core.config import settings

    monkeypatch.setattr(settings, "vector_store_dir", tmp_path)
    result = retrieve("nội soi đại tràng", dense=True)
    assert result.dense_status == "unavailable" and result.mode == "lexical" and result.sources
