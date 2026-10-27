"""rescope: Navigator → booking → Clinical Copilot journey.

Thay screening_sessions bằng consultations / appointments / encounters, thêm hồ sơ xuyên suốt (record_events)
và quan sát AI (agent_runs). reminders gắn với encounter; audit_logs chuyển sang entity/entity_id.

Revision ID: 7b3c9d2e1f40
Revises: e4ae8d137edf
Create Date: 2026-10-27 10:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '7b3c9d2e1f40'
down_revision: str | Sequence[str] | None = 'e4ae8d137edf'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    # Dữ liệu demo của luồng cũ không chuyển đổi được sang hành trình mới → xoá bảng cũ.
    op.drop_table('reminders')
    op.drop_table('audit_logs')
    op.drop_table('screening_sessions')

    op.create_table(
        'consultations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=True),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('intake', sa.JSON(), nullable=False),
        sa.Column('messages', sa.JSON(), nullable=False),
        sa.Column('last_reply', sa.JSON(), nullable=True),
        sa.Column('red_flag', sa.Boolean(), nullable=False),
        sa.Column('next_action', sa.String(length=32), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_consultations_patient_id'), 'consultations', ['patient_id'])

    op.create_table(
        'appointments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=False),
        sa.Column('consultation_id', sa.String(length=36), nullable=True),
        sa.Column('doctor_id', sa.String(length=36), nullable=True),
        sa.Column('service_code', sa.String(length=64), nullable=False),
        sa.Column('preferred_date', sa.Date(), nullable=False),
        sa.Column('scheduled_date', sa.Date(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id']),
        sa.ForeignKeyConstraint(['consultation_id'], ['consultations.id']),
        sa.ForeignKeyConstraint(['doctor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_appointments_patient_id'), 'appointments', ['patient_id'])
    op.create_index(op.f('ix_appointments_status'), 'appointments', ['status'])

    op.create_table(
        'encounters',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('appointment_id', sa.String(length=36), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=False),
        sa.Column('doctor_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('brief', sa.JSON(), nullable=True),
        sa.Column('draft_plan', sa.JSON(), nullable=True),
        sa.Column('final_plan', sa.JSON(), nullable=True),
        sa.Column('clinical_notes', sa.Text(), nullable=True),
        sa.Column('conclusion', sa.Text(), nullable=True),
        sa.Column('trace_id', sa.String(length=64), nullable=True),
        sa.Column('finalized_at', sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id']),
        sa.ForeignKeyConstraint(['doctor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('appointment_id'),
    )
    op.create_index(op.f('ix_encounters_patient_id'), 'encounters', ['patient_id'])
    op.create_index(op.f('ix_encounters_status'), 'encounters', ['status'])

    op.create_table(
        'reminders',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('encounter_id', sa.String(length=36), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=False),
        sa.Column('cancer_type', sa.String(length=32), nullable=False),
        sa.Column('method', sa.String(length=255), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('completed_at', sa.Date(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(['encounter_id'], ['encounters.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_reminders_patient_id'), 'reminders', ['patient_id'])
    op.create_index(op.f('ix_reminders_due_date'), 'reminders', ['due_date'])

    op.create_table(
        'record_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=False),
        sa.Column('kind', sa.String(length=64), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=False),
        sa.Column('ref_type', sa.String(length=32), nullable=True),
        sa.Column('ref_id', sa.String(length=36), nullable=True),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('visibility', sa.String(length=16), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id']),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_record_events_patient_id'), 'record_events', ['patient_id'])
    op.create_index(op.f('ix_record_events_occurred_at'), 'record_events', ['occurred_at'])

    op.create_table(
        'agent_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('agent', sa.String(length=32), nullable=False),
        sa.Column('trace_id', sa.String(length=64), nullable=False),
        sa.Column('patient_id', sa.String(length=36), nullable=True),
        sa.Column('consultation_id', sa.String(length=36), nullable=True),
        sa.Column('encounter_id', sa.String(length=36), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=False),
        sa.Column('generator', sa.String(length=32), nullable=True),
        sa.Column('red_flag', sa.Boolean(), nullable=False),
        sa.Column('next_action', sa.String(length=32), nullable=True),
        sa.Column('insufficient_evidence', sa.Boolean(), nullable=False),
        sa.Column('guard_blocked', sa.Boolean(), nullable=False),
        sa.Column('events', sa.JSON(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(['patient_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_agent_runs_agent'), 'agent_runs', ['agent'])
    op.create_index(op.f('ix_agent_runs_trace_id'), 'agent_runs', ['trace_id'])

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('entity', sa.String(length=32), nullable=True),
        sa.Column('entity_id', sa.String(length=36), nullable=True),
        sa.Column('before', sa.JSON(), nullable=True),
        sa.Column('after', sa.JSON(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    # Migration một chiều: schema screening_sessions cũ không còn được code hỗ trợ.
    raise NotImplementedError("Migration một chiều; dựng lại DB trống rồi `alembic upgrade head`.")
