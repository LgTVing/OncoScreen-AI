# Protocol: Database Schema (PostgreSQL / SQLite)

**Chủ sở hữu:** Backend. **Nguồn sự thật:** `backend/app/models/*.py` + Alembic migrations (`7b3c9d2e1f40` là bản hiện hành).
Kiểu JSON: `sqlalchemy.JSON`. ID: UUID string(36). Mọi bảng (trừ `record_events`) có `created_at`, `updated_at`.

## users
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | lower-case |
| password_hash | VARCHAR(255) | bcrypt |
| full_name | VARCHAR(255) | |
| role | VARCHAR(16) | `patient` \| `doctor` |

## patient_profiles
| Cột | Kiểu | Ghi chú |
|---|---|---|
| user_id | UUID PK FK→users | 1-1 |
| age, gender | INT, VARCHAR(16) | |
| genetics_history | JSON | `["breast_cancer_mother", "colorectal_cancer_family"]` |
| lifestyle | JSON | `smoking, pack_years, hepatitis_b_or_c, cirrhosis, …` |
| lifestyle_score | FLOAT NULL | |

## consultations
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK→users NULL, index | NULL = ẩn danh |
| token_hash | VARCHAR(64) | SHA-256 của token phiên |
| intake | JSON | `IntakeProfile` |
| messages | JSON | `[{role, content, at}]` |
| last_reply | JSON NULL | `NavigatorReply` (trace_events rỗng) |
| red_flag | BOOL | đã từng phát hiện red-flag (không gỡ) |
| next_action | VARCHAR(32) | |

## appointments
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK→users, index | |
| consultation_id | UUID FK→consultations NULL | |
| doctor_id | UUID FK→users NULL | |
| service_code | VARCHAR(64) | mã trong `ai_core/data/services.json` |
| preferred_date / scheduled_date | DATE / DATE NULL | |
| reason | TEXT NULL | |
| priority | VARCHAR(16) | `routine` \| `urgent` |
| status | VARCHAR(16), index | `requested` \| `confirmed` \| `completed` \| `cancelled` |

## encounters
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| appointment_id | UUID FK UNIQUE | |
| patient_id, doctor_id | UUID FK→users | |
| status | VARCHAR(16), index | `in_progress` \| `finalized` |
| brief | JSON NULL | `ClinicalBrief` |
| draft_plan / final_plan | JSON NULL | `ScreeningPlan` |
| clinical_notes | TEXT NULL | chỉ bác sĩ |
| conclusion | TEXT NULL | gửi bệnh nhân |
| trace_id | VARCHAR(64) NULL | |
| finalized_at | TIMESTAMP NULL | |

## reminders
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| encounter_id | UUID FK→encounters | |
| patient_id | UUID FK→users, index | |
| cancer_type, method | VARCHAR | |
| due_date | DATE, index | |
| status | VARCHAR(16) | `scheduled` \| `due` \| `done` \| `skipped` |
| message, completed_at | TEXT NULL, DATE NULL | |

## record_events
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | được Copilot trích dẫn (`BriefFact.event_ids`) |
| patient_id | UUID FK→users, index | |
| kind | VARCHAR(64) | xem `03_DATA_MODEL.md` |
| summary | TEXT | câu mô tả tiếng Việt |
| data | JSON | dữ liệu có cấu trúc (codes, cancer_types, service_code…) |
| ref_type / ref_id | VARCHAR NULL | consultation / appointment / encounter / reminder |
| actor_id | UUID FK NULL | |
| visibility | VARCHAR(16) | `all` \| `doctor` |
| occurred_at | TIMESTAMP, index | |

## agent_runs
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| agent | VARCHAR(32), index | `navigator` \| `copilot` \| `copilot_qa` \| `patient_qa` |
| trace_id | VARCHAR(64), index | |
| patient_id | UUID FK NULL | |
| consultation_id / encounter_id | VARCHAR(36) NULL | |
| latency_ms | FLOAT | |
| generator | VARCHAR(32) NULL | `llm` \| `template` \| `template_fallback` \| `extractive` |
| red_flag, insufficient_evidence, guard_blocked | BOOL | |
| next_action | VARCHAR(32) NULL | |
| events | JSON | node-level trace, không chứa nội dung hội thoại |

## audit_logs
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| actor_id | UUID FK NULL | NULL = khách ẩn danh |
| action | VARCHAR(64) | `consult.create`, `consult.link`, `account.register`, `appointment.*`, `encounter.start`, `encounter.finalize`, `plan.edit`, `reminder.*` |
| entity / entity_id | VARCHAR NULL | |
| before / after | JSON NULL | |

## Migration
- `alembic upgrade head` (Postgres). Dev SQLite: `init_db()` tự `create_all`.
- `7b3c9d2e1f40` là migration một chiều (xoá schema `screening_sessions` cũ). `alembic check` không phát hiện lệch với models.
- **Không** sửa migration đã merge; tạo migration mới.
